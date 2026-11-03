/**
 * @file hostCollector.js
 * @brief Collects hardware & process metrics from the local host machine (Windows, Linux, macOS, Raspberry Pi, STB).
 */

const si = require('systeminformation');
const { exec } = require('child_process');

class HostCollector {
    constructor() {
        this.cachedStatic = null;
    }

    async getStaticInfo() {
        if (this.cachedStatic) return this.cachedStatic;

        try {
            const [osInfo, system, cpu, baseboard] = await Promise.all([
                si.osInfo(),
                si.system(),
                si.cpu(),
                si.baseboard()
            ]);

            this.cachedStatic = {
                id: 'host-local',
                name: `${osInfo.hostname || 'Host'} (${osInfo.platform})`,
                type: osInfo.platform, // 'win32', 'linux', 'darwin', etc.
                isHost: true,
                platform: osInfo.distro || osInfo.platform,
                release: osInfo.release,
                arch: osInfo.arch,
                kernel: osInfo.kernel,
                manufacturer: system.manufacturer || baseboard.manufacturer || 'Generic',
                model: system.model || baseboard.model || osInfo.hostname,
                cpuBrand: `${cpu.manufacturer} ${cpu.brand}`.trim(),
                cpuSpeed: `${cpu.speed} GHz`,
                cores: cpu.cores,
                physicalCores: cpu.physicalCores
            };
            return this.cachedStatic;
        } catch (err) {
            console.error('[HostCollector] Error getting static info:', err.message);
            return {
                id: 'host-local',
                name: 'Local Host',
                type: process.platform,
                isHost: true
            };
        }
    }

    async getDynamicMetrics() {
        try {
            const [
                cpuLoad,
                cpuSpeed,
                cpuTemp,
                mem,
                fsSize,
                netStats,
                battery,
                processes
            ] = await Promise.all([
                si.currentLoad(),
                si.cpuCurrentSpeed(),
                si.cpuTemperature(),
                si.mem(),
                si.fsSize(),
                si.networkStats(),
                si.battery(),
                si.processes()
            ]);

            const staticInfo = await this.getStaticInfo();

            // Format RAM in MB / GB
            const ramTotalMB = Math.round(mem.total / 1024 / 1024);
            const ramUsedMB = Math.round(mem.active / 1024 / 1024);
            const ramFreeMB = Math.round(mem.available / 1024 / 1024);
            const ramCachedMB = Math.round((mem.buffcache || 0) / 1024 / 1024);
            const swapTotalMB = Math.round(mem.swaptotal / 1024 / 1024);
            const swapUsedMB = Math.round(mem.swapused / 1024 / 1024);

            // Top processes sorted by CPU and Memory
            const sortedProcs = (processes.list || [])
                .map(p => ({
                    pid: p.pid,
                    name: p.name,
                    command: p.command || p.name,
                    cpu: parseFloat(p.cpu.toFixed(1)),
                    memMB: Math.round(p.memRss / 1024),
                    memPercent: parseFloat(p.mem.toFixed(1)),
                    user: p.user || 'system',
                    state: p.state || 'running'
                }))
                .sort((a, b) => b.memMB - a.memMB)
                .slice(0, 100); // Top 100 processes

            // Format storage filesystems
            const disks = (fsSize || []).map(d => ({
                fs: d.fs,
                mount: d.mount,
                type: d.type,
                sizeGB: parseFloat((d.size / 1024 / 1024 / 1024).toFixed(1)),
                usedGB: parseFloat((d.used / 1024 / 1024 / 1024).toFixed(1)),
                usePercent: parseFloat(d.use.toFixed(1))
            }));

            // Format network speeds
            let netRxSec = 0;
            let netTxSec = 0;
            (netStats || []).forEach(n => {
                netRxSec += n.rx_sec || 0;
                netTxSec += n.tx_sec || 0;
            });

            return {
                id: 'host-local',
                timestamp: Date.now(),
                info: staticInfo,
                cpu: {
                    overallPercent: parseFloat(cpuLoad.currentLoad.toFixed(1)),
                    coresPercent: (cpuLoad.cpus || []).map(c => parseFloat(c.load.toFixed(1))),
                    avgSpeedGHz: parseFloat((cpuSpeed.avg || 0).toFixed(2)),
                    tempC: cpuTemp.main || null
                },
                memory: {
                    totalMB: ramTotalMB,
                    usedMB: ramUsedMB,
                    freeMB: ramFreeMB,
                    cachedMB: ramCachedMB,
                    usedPercent: parseFloat(((mem.active / mem.total) * 100).toFixed(1)),
                    swapTotalMB: swapTotalMB,
                    swapUsedMB: swapUsedMB,
                    swapUsedPercent: swapTotalMB > 0 ? parseFloat(((mem.swapused / mem.swaptotal) * 100).toFixed(1)) : 0
                },
                storage: disks,
                network: {
                    rxSecKB: parseFloat((netRxSec / 1024).toFixed(1)),
                    txSecKB: parseFloat((netTxSec / 1024).toFixed(1))
                },
                battery: battery.hasBattery ? {
                    percent: battery.percent,
                    isCharging: battery.isCharging,
                    acConnected: battery.acConnected
                } : null,
                processes: sortedProcs
            };
        } catch (err) {
            console.error('[HostCollector] Error getting dynamic metrics:', err.message);
            return null;
        }
    }

    async killProcess(pid) {
        return new Promise((resolve) => {
            const isWin = process.platform === 'win32';
            const cmd = isWin ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
            exec(cmd, (err) => {
                if (err) {
                    resolve({ success: false, error: err.message });
                } else {
                    resolve({ success: true, pid });
                }
            });
        });
    }
}

module.exports = new HostCollector();
