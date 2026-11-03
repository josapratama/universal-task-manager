/**
 * @file server.js
 * @brief Main Entry Point for Universal Cross-Platform Task Manager & Hardware Monitor.
 */

const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const hostCollector = require('./collectors/hostCollector');
const adbCollector = require('./collectors/adbCollector');
const agentRegistry = require('./collectors/agentRegistry');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const WEB_DIR = path.join(__dirname, '../../web');
const AGENTS_DIR = path.join(__dirname, '../../agents');

app.use(express.json());
app.use(express.static(WEB_DIR));
app.use('/agents', express.static(AGENTS_DIR));

// ============================================================
// REST API ROUTES
// ============================================================

/**
 * GET /api/devices - Lists all available devices (Host, ADB, Remote Agents)
 */
app.get('/api/devices', async (req, res) => {
    try {
        const hostStatic = await hostCollector.getStaticInfo();
        const hostDevice = {
            id: 'host-local',
            name: `${hostStatic.name} [Host System]`,
            type: hostStatic.type,
            mode: 'host',
            platform: hostStatic.platform,
            model: hostStatic.model,
            state: 'online'
        };

        const adbDevices = await adbCollector.getConnectedDevices();
        const agentDevices = agentRegistry.getConnectedDevices();

        const all = [hostDevice, ...adbDevices, ...agentDevices];
        res.json({ success: true, count: all.length, devices: all });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/devices/:id/metrics - Gets live metrics for specific device
 */
app.get('/api/devices/:id/metrics', async (req, res) => {
    const { id } = req.params;

    try {
        let metrics = null;

        if (id === 'host-local') {
            metrics = await hostCollector.getDynamicMetrics();
        } else if (id.startsWith('adb-')) {
            const serial = id.replace('adb-', '');
            metrics = await adbCollector.getDeviceMetrics(serial);
        } else if (id.startsWith('agent-')) {
            const rawId = id.replace('agent-', '');
            metrics = agentRegistry.getDeviceMetrics(rawId);
        }

        if (!metrics) {
            return res.status(404).json({ success: false, error: 'Device not found or offline.' });
        }

        res.json({ success: true, metrics });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/devices/:id/kill - Terminates a process on the target machine
 */
app.post('/api/devices/:id/kill', async (req, res) => {
    const { id } = req.params;
    const { pid, target } = req.body;

    if (!pid && !target) {
        return res.status(400).json({ success: false, error: 'Missing process PID or target name.' });
    }

    try {
        let result = null;

        if (id === 'host-local') {
            result = await hostCollector.killProcess(pid);
        } else if (id.startsWith('adb-')) {
            const serial = id.replace('adb-', '');
            result = await adbCollector.killProcess(serial, target || pid);
        } else if (id.startsWith('agent-')) {
            const rawId = id.replace('agent-', '');
            result = await agentRegistry.killProcess(rawId, pid);
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/adb/connect - Connects to Wireless ADB (ip:port)
 */
app.post('/api/adb/connect', async (req, res) => {
    const { ip, port = 5555 } = req.body;
    if (!ip) return res.status(400).json({ success: false, error: 'Missing IP address' });

    const result = await adbCollector.connectWireless(ip, port);
    res.json(result);
});

/**
 * POST /api/agent/report - HTTP POST fallback for remote agents
 */
app.post('/api/agent/report', (req, res) => {
    const { id, info, metrics } = req.body;
    if (!id || !metrics) {
        return res.status(400).json({ success: false, error: 'Missing id or metrics' });
    }

    agentRegistry.updateMetrics(id, { info, ...metrics });
    res.json({ success: true, timestamp: Date.now() });
});

// ============================================================
// WEBSOCKET HUB (Real-time Broadcast & Agent Stream)
// ============================================================

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // 1. Remote Agent Connection (ws://server:3000/ws/agent?id=xxx&name=xxx)
    if (pathname === '/ws/agent') {
        const agentId = url.searchParams.get('id') || `agent-${Date.now()}`;
        const name = url.searchParams.get('name') || 'Remote Agent';
        const type = url.searchParams.get('type') || 'linux';
        const platform = url.searchParams.get('platform') || 'Linux';

        agentRegistry.registerAgent(agentId, { name, type, platform }, ws);

        ws.on('message', (data) => {
            try {
                const payload = JSON.parse(data.toString());
                if (payload.action === 'telemetry') {
                    agentRegistry.updateMetrics(agentId, payload.metrics);
                }
            } catch (e) {}
        });

        ws.on('close', () => {
            agentRegistry.unregisterAgent(agentId);
        });
        return;
    }

    // 2. Web Dashboard Client Connection (ws://server:3000/ws)
    let selectedDeviceId = 'host-local';

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.action === 'select_device') {
                selectedDeviceId = data.deviceId;
            }
        } catch (e) {}
    });

    // Stream metrics every 1000ms (1Hz) to browser client
    const interval = setInterval(async () => {
        if (ws.readyState !== WebSocket.OPEN) {
            clearInterval(interval);
            return;
        }

        try {
            let metrics = null;
            if (selectedDeviceId === 'host-local') {
                metrics = await hostCollector.getDynamicMetrics();
            } else if (selectedDeviceId.startsWith('adb-')) {
                const serial = selectedDeviceId.replace('adb-', '');
                metrics = await adbCollector.getDeviceMetrics(serial);
            } else if (selectedDeviceId.startsWith('agent-')) {
                const rawId = selectedDeviceId.replace('agent-', '');
                metrics = agentRegistry.getDeviceMetrics(rawId);
            }

            if (metrics) {
                ws.send(JSON.stringify({
                    type: 'metrics',
                    deviceId: selectedDeviceId,
                    data: metrics
                }));
            }
        } catch (err) {}
    }, 1000);

    ws.on('close', () => {
        clearInterval(interval);
    });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Universal Task Manager Server Running!`);
    console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
    console.log(`📱 Supported: Windows, Linux, macOS, STB, Raspberry Pi, Android`);
    console.log(`=======================================================`);
});
