/**
 * @file agentRegistry.js
 * @brief Manages remote connected agents (Linux STB, Armbian, Raspberry Pi, macOS, Windows, Android APK).
 */

class AgentRegistry {
    constructor() {
        this.agents = new Map(); // id -> { ws, info, lastMetrics, lastSeen }
    }

    registerAgent(id, info, ws = null) {
        const existing = this.agents.get(id);
        const agent = {
            id: `agent-${id}`,
            rawId: id,
            name: info.name || `Remote Device (${id})`,
            type: info.type || 'linux', // linux, android, darwin, win32, stb
            platform: info.platform || info.os || 'Linux',
            model: info.model || 'Generic Device',
            mode: 'agent',
            ws: ws || (existing ? existing.ws : null),
            info: info,
            lastMetrics: null,
            lastSeen: Date.now()
        };
        this.agents.set(id, agent);
        console.log(`[AgentRegistry] Registered agent: ${agent.name} [${id}]`);
        return agent;
    }

    updateMetrics(id, metrics) {
        let agent = this.agents.get(id);
        if (!agent) {
            agent = this.registerAgent(id, metrics.info || {});
        }
        agent.lastMetrics = {
            ...metrics,
            id: `agent-${id}`,
            timestamp: Date.now()
        };
        agent.lastSeen = Date.now();
    }

    unregisterAgent(id) {
        if (this.agents.has(id)) {
            console.log(`[AgentRegistry] Agent disconnected: ${id}`);
            this.agents.delete(id);
        }
    }

    getConnectedDevices() {
        const list = [];
        const now = Date.now();
        for (const [id, agent] of this.agents.entries()) {
            // Keep alive if seen in the last 30 seconds
            if (now - agent.lastSeen < 30000) {
                list.push({
                    id: agent.id,
                    rawId: id,
                    name: agent.name,
                    type: agent.type,
                    mode: 'agent',
                    platform: agent.platform,
                    model: agent.model,
                    state: 'online'
                });
            }
        }
        return list;
    }

    getDeviceMetrics(rawId) {
        const agent = this.agents.get(rawId);
        if (agent && agent.lastMetrics) {
            return agent.lastMetrics;
        }
        return null;
    }

    async killProcess(rawId, pid) {
        const agent = this.agents.get(rawId);
        if (!agent || !agent.ws) {
            return { success: false, error: 'Agent not connected via active WebSocket.' };
        }

        return new Promise((resolve) => {
            const reqId = `kill-${Date.now()}`;
            const message = JSON.stringify({
                action: 'kill_process',
                reqId,
                pid
            });

            // One-time listener for agent ack
            const onMessage = (data) => {
                try {
                    const parsed = JSON.parse(data.toString());
                    if (parsed.reqId === reqId) {
                        agent.ws.off('message', onMessage);
                        resolve({ success: parsed.success, pid, message: parsed.message });
                    }
                } catch (e) {}
            };

            agent.ws.on('message', onMessage);
            agent.ws.send(message);

            // 5 second timeout
            setTimeout(() => {
                agent.ws.off('message', onMessage);
                resolve({ success: false, error: 'Agent response timeout.' });
            }, 5000);
        });
    }
}

module.exports = new AgentRegistry();
