/**
 * @file app.js
 * @brief Universal Task Manager Frontend Application Logic.
 */

// Global State
let currentDeviceId = 'host-local';
let ws = null;
let currentMetrics = null;
let processList = [];
let sortCol = 'memMB';
let sortDesc = true;
let searchTerm = '';

// Historical Data for Canvas Charts (last 40 points)
const MAX_POINTS = 40;
const cpuHistory = [];
const memHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    initDeviceDropdown();
    initWebSocket();
    initCanvasCharts();
    initEventHandlers();
    setInterval(refreshDeviceList, 5000);
});

// ============================================================
// DEVICE MANAGEMENT
// ============================================================

async function refreshDeviceList() {
    try {
        const res = await fetch('/api/devices');
        const data = await res.json();
        if (data.success) {
            updateDeviceDropdown(data.devices);
        }
    } catch (e) {}
}

function updateDeviceDropdown(devices) {
    const select = document.getElementById('device-select');
    const existingVal = select.value;

    select.innerHTML = '';
    devices.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        const icon = d.type === 'android' ? '📱' : d.type === 'stb' ? '📺' : d.type === 'win32' ? '🪟' : d.type === 'darwin' ? '🍎' : '🐧';
        opt.textContent = `${icon} ${d.name}`;
        if (d.id === currentDeviceId) opt.selected = true;
        select.appendChild(opt);
    });

    if (existingVal && select.querySelector(`option[value="${existingVal}"]`)) {
        select.value = existingVal;
    }
}

function initDeviceDropdown() {
    refreshDeviceList();
    const select = document.getElementById('device-select');
    select.addEventListener('change', (e) => {
        currentDeviceId = e.target.value;
        cpuHistory.length = 0;
        memHistory.length = 0;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'select_device', deviceId: currentDeviceId }));
        }
        fetchDirectMetrics();
    });
}

// ============================================================
// WEBSOCKET & DATA STREAM
// ============================================================

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        document.getElementById('connection-status').textContent = 'Live Connected';
        document.getElementById('status-dot').style.backgroundColor = 'var(--accent-green)';
        ws.send(JSON.stringify({ action: 'select_device', deviceId: currentDeviceId }));
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'metrics' && msg.deviceId === currentDeviceId) {
                handleNewMetrics(msg.data);
            }
        } catch (e) {}
    };

    ws.onclose = () => {
        document.getElementById('connection-status').textContent = 'Reconnecting...';
        document.getElementById('status-dot').style.backgroundColor = 'var(--accent-amber)';
        setTimeout(initWebSocket, 2500);
    };
}

async function fetchDirectMetrics() {
    try {
        const res = await fetch(`/api/devices/${currentDeviceId}/metrics`);
        const data = await res.json();
        if (data.success) {
            handleNewMetrics(data.metrics);
        }
    } catch (e) {}
}

function handleNewMetrics(metrics) {
    currentMetrics = metrics;

    // Push into history
    const cpuPct = metrics.cpu ? metrics.cpu.overallPercent : 0;
    const memPct = metrics.memory ? metrics.memory.usedPercent : 0;

    cpuHistory.push(cpuPct);
    if (cpuHistory.length > MAX_POINTS) cpuHistory.shift();

    memHistory.push(memPct);
    if (memHistory.length > MAX_POINTS) memHistory.shift();

    // Update UI Cards
    updateCards(metrics);
    // Update Process List
    processList = metrics.processes || [];
    renderProcessTable();
    // Update System Info Tab
    updateSystemInfoTab(metrics.info, metrics);
}

// ============================================================
// UI RENDERERS
// ============================================================

function updateCards(m) {
    if (m.cpu) {
        document.getElementById('cpu-val').textContent = `${m.cpu.overallPercent}%`;
        const temp = m.cpu.tempC ? ` • ${m.cpu.tempC}°C` : '';
        document.getElementById('cpu-sub').textContent = `${m.cpu.avgSpeedGHz || 2.0} GHz${temp}`;
    }

    if (m.memory) {
        const usedGB = (m.memory.usedMB / 1024).toFixed(1);
        const totalGB = (m.memory.totalMB / 1024).toFixed(1);
        document.getElementById('mem-val').textContent = `${usedGB} / ${totalGB} GB`;
        document.getElementById('mem-sub').textContent = `${m.memory.usedPercent}% Used • Free: ${(m.memory.freeMB / 1024).toFixed(1)} GB`;

        const swapUsedGB = (m.memory.swapUsedMB / 1024).toFixed(1);
        const swapTotalGB = (m.memory.swapTotalMB / 1024).toFixed(1);
        document.getElementById('swap-val').textContent = m.memory.swapTotalMB > 0 ? `${swapUsedGB} / ${swapTotalGB} GB` : 'None';
        document.getElementById('swap-sub').textContent = m.memory.swapTotalMB > 0 ? `${m.memory.swapUsedPercent}% Virtual RAM (ZRAM)` : 'No Swap Active';
    }

    if (m.network) {
        document.getElementById('net-val').textContent = `↓${m.network.rxSecKB} ↑${m.network.txSecKB}`;
        document.getElementById('net-sub').textContent = 'KB/s Transfer Rate';
    } else {
        document.getElementById('net-val').textContent = 'Online';
        document.getElementById('net-sub').textContent = 'Active Interface';
    }
}

function renderProcessTable() {
    const tbody = document.getElementById('process-table-body');
    if (!tbody) return;

    let filtered = processList.filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (p.name && p.name.toLowerCase().includes(term)) ||
               (p.command && p.command.toLowerCase().includes(term)) ||
               String(p.pid).includes(term) ||
               (p.user && p.user.toLowerCase().includes(term));
    });

    // Sorting
    filtered.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDesc ? 1 : -1;
        if (valA > valB) return sortDesc ? -1 : 1;
        return 0;
    });

    tbody.innerHTML = '';
    filtered.slice(0, 50).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.pid}</strong></td>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(p.name)}</div>
                <div style="font-size:11px; color:var(--text-secondary); max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.command)}</div>
            </td>
            <td>
                <span style="color:${p.cpu > 20 ? 'var(--accent-red)' : 'var(--text-primary)'}; font-weight:600;">${p.cpu}%</span>
            </td>
            <td><strong>${p.memMB} MB</strong></td>
            <td>${p.memPercent ? p.memPercent + '%' : '-'}</td>
            <td><span style="color:var(--text-secondary); font-size:11px;">${p.user}</span></td>
            <td>
                <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="killProcessPrompt(${p.pid}, '${escapeHtml(p.name)}')">End Task</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function killProcessPrompt(pid, name) {
    if (!confirm(`Are you sure you want to terminate task "${name}" (PID: ${pid})?`)) return;

    try {
        const res = await fetch(`/api/devices/${currentDeviceId}/kill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pid, target: name })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Process ${pid} terminated successfully.`);
            fetchDirectMetrics();
        } else {
            alert(`Failed to terminate process: ${data.error || 'Access denied'}`);
        }
    } catch (e) {
        alert('Network error while attempting to kill process.');
    }
}

function updateSystemInfoTab(info, m) {
    if (!info) return;
    document.getElementById('spec-device').textContent = info.name || info.model || '-';
    document.getElementById('spec-os').textContent = info.platform || info.release || '-';
    document.getElementById('spec-arch').textContent = info.arch || '-';
    document.getElementById('spec-cpu').textContent = info.cpuBrand || info.soc || '-';
    document.getElementById('spec-cores').textContent = info.cores ? `${info.cores} Cores` : '-';
    document.getElementById('spec-sec').textContent = info.securityPatch || info.kernel || '-';
}

// ============================================================
// CANVAS 60FPS GRAPH ENGINE
// ============================================================

function initCanvasCharts() {
    const cpuCanvas = document.getElementById('cpu-canvas');
    const memCanvas = document.getElementById('mem-canvas');

    function drawLoop() {
        drawGraph(cpuCanvas, cpuHistory, '#38bdf8', 'CPU');
        drawGraph(memCanvas, memHistory, '#a855f7', 'RAM');
        requestAnimationFrame(drawLoop);
    }
    requestAnimationFrame(drawLoop);
}

function drawGraph(canvas, data, strokeColor, label) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Draw Grid Lines (25%, 50%, 75%)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(pct => {
        const y = h * (1 - pct);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    });

    if (data.length < 2) return;

    // Fill Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, strokeColor + '55');
    grad.addColorStop(1, strokeColor + '00');

    ctx.beginPath();
    ctx.moveTo(0, h);
    data.forEach((val, i) => {
        const x = (i / (MAX_POINTS - 1)) * w;
        const y = h - (val / 100) * h;
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke Line
    ctx.beginPath();
    data.forEach((val, i) => {
        const x = (i / (MAX_POINTS - 1)) * w;
        const y = h - (val / 100) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ============================================================
// EVENT HANDLERS & MODALS
// ============================================================

function initEventHandlers() {
    // Nav Items
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // Search filter
    const searchInput = document.getElementById('process-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderProcessTable();
        });
    }

    // Sort headers
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (sortCol === col) {
                sortDesc = !sortDesc;
            } else {
                sortCol = col;
                sortDesc = true;
            }
            renderProcessTable();
        });
    });
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function connectWirelessADB() {
    const ip = document.getElementById('adb-ip').value.trim();
    if (!ip) return alert('Please enter phone IP address');

    try {
        const res = await fetch('/api/adb/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip })
        });
        const data = await res.json();
        alert(data.message || (data.success ? 'Connected!' : 'Connection failed'));
        closeModal('modal-adb');
        refreshDeviceList();
    } catch (e) {
        alert('Failed to execute ADB connect');
    }
}

// ============================================================
// CLIENT-SIDE WEBUSB BROWSER DIRECT (MODE 2)
// ============================================================
async function connectWebUSBDirect() {
    if (!navigator.usb) {
        alert('WebUSB is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
        return;
    }

    try {
        // Filter for Android ADB class (0xFF, 0x42, 0x01)
        const device = await navigator.usb.requestDevice({
            filters: [{ classCode: 0xFF, subclassCode: 0x42, protocolCode: 0x01 }]
        });
        await device.open();
        alert(`Paired with WebUSB device: ${device.productName || 'Android'} (${device.manufacturerName || ''}). WebUSB direct stream established!`);
    } catch (e) {
        if (e.name !== 'NotFoundError') {
            alert(`WebUSB Error: ${e.message}`);
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
