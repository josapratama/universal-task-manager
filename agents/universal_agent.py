#!/usr/bin/env python3
"""
Universal Cross-Platform Hardware & Task Monitor Agent (Python 3).
Zero external dependencies - runs on Linux (STB, Raspberry Pi, Ubuntu), macOS, Windows, and Android (Termux).
"""

import os
import sys
import time
import json
import socket
import platform
import subprocess
import urllib.request
import urllib.error

SERVER_URL = os.environ.get("SERVER_URL", "http://127.0.0.1:3000")
AGENT_ID = os.environ.get("AGENT_ID", socket.gethostname().lower().replace(" ", "-"))
POLL_INTERVAL = int(os.environ.get("INTERVAL", "2"))

def get_os_type():
    p = sys.platform
    if p.startswith('linux'):
        if os.path.exists('/system/build.prop'):
            return 'android'
        return 'linux'
    elif p == 'darwin':
        return 'darwin'
    elif p in ('win32', 'cygwin'):
        return 'win32'
    return 'unknown'

def read_file(path):
    try:
        with open(path, 'r') as f:
            return f.read()
    except Exception:
        return ''

def get_memory_info():
    os_type = get_os_type()
    mem = {
        'totalMB': 0,
        'usedMB': 0,
        'freeMB': 0,
        'cachedMB': 0,
        'usedPercent': 0.0,
        'swapTotalMB': 0,
        'swapUsedMB': 0,
        'swapUsedPercent': 0.0
    }

    if os_type in ('linux', 'android'):
        content = read_file('/proc/meminfo')
        data = {}
        for line in content.splitlines():
            parts = line.split(':')
            if len(parts) == 2:
                try:
                    data[parts[0].strip()] = int(parts[1].strip().split()[0])
                except Exception:
                    pass

        total_kb = data.get('MemTotal', 0)
        free_kb = data.get('MemFree', 0)
        avail_kb = data.get('MemAvailable', free_kb + data.get('Buffers', 0) + data.get('Cached', 0))
        cached_kb = data.get('Cached', 0)
        swap_total_kb = data.get('SwapTotal', 0)
        swap_free_kb = data.get('SwapFree', 0)

        mem['totalMB'] = round(total_kb / 1024)
        mem['freeMB'] = round(avail_kb / 1024)
        mem['usedMB'] = max(0, mem['totalMB'] - mem['freeMB'])
        mem['cachedMB'] = round(cached_kb / 1024)
        mem['usedPercent'] = round((mem['usedMB'] / mem['totalMB']) * 100, 1) if mem['totalMB'] > 0 else 0
        mem['swapTotalMB'] = round(swap_total_kb / 1024)
        mem['swapUsedMB'] = max(0, round((swap_total_kb - swap_free_kb) / 1024))
        mem['swapUsedPercent'] = round((mem['swapUsedMB'] / mem['swapTotalMB']) * 100, 1) if mem['swapTotalMB'] > 0 else 0

    elif os_type == 'darwin':
        try:
            total_bytes = int(subprocess.check_output(['sysctl', '-n', 'hw.memsize']).strip())
            mem['totalMB'] = round(total_bytes / (1024 * 1024))
            vm = subprocess.check_output(['vm_stat']).decode('utf-8')
            free_pages = 0
            for line in vm.splitlines():
                if 'Pages free:' in line:
                    free_pages = int(line.split(':')[1].strip().replace('.', ''))
            mem['freeMB'] = round((free_pages * 4096) / (1024 * 1024))
            mem['usedMB'] = max(0, mem['totalMB'] - mem['freeMB'])
            mem['usedPercent'] = round((mem['usedMB'] / mem['totalMB']) * 100, 1) if mem['totalMB'] > 0 else 0
        except Exception:
            pass

    return mem

def get_cpu_info():
    os_type = get_os_type()
    cpu = {
        'overallPercent': 0.0,
        'coresPercent': [],
        'avgSpeedGHz': 2.0,
        'tempC': None
    }

    try:
        # Load average (1 min)
        load_avg = os.getloadavg()[0] if hasattr(os, 'getloadavg') else 1.0
        num_cores = os.cpu_count() or 4
        cpu['overallPercent'] = min(100.0, round((load_avg / num_cores) * 100, 1))
    except Exception:
        cpu['overallPercent'] = 15.0

    # Temperature from thermal zones (Linux / STB / Raspberry Pi)
    if os_type in ('linux', 'android'):
        for zone in range(5):
            t_path = f"/sys/class/thermal/thermal_zone{zone}/temp"
            if os.path.exists(t_path):
                val = read_file(t_path).strip()
                if val.isdigit():
                    t_c = int(val) / 1000.0 if int(val) > 1000 else int(val)
                    if 20.0 <= t_c <= 110.0:
                        cpu['tempC'] = round(t_c, 1)
                        break

    return cpu

def get_processes():
    processes = []
    os_type = get_os_type()

    if os_type in ('linux', 'android', 'darwin'):
        try:
            cmd = ['ps', '-A', '-o', 'pid,user,%cpu,%mem,rss,comm']
            out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8', errors='ignore')
            lines = out.splitlines()
            for line in lines[1:]:
                parts = line.strip().split(None, 5)
                if len(parts) >= 6:
                    pid = int(parts[0])
                    user = parts[1]
                    cpu_pct = float(parts[2]) if parts[2].replace('.', '', 1).isdigit() else 0.0
                    mem_pct = float(parts[3]) if parts[3].replace('.', '', 1).isdigit() else 0.0
                    rss_kb = int(parts[4]) if parts[4].isdigit() else 0
                    name = parts[5]

                    processes.append({
                        'pid': pid,
                        'name': os.path.basename(name),
                        'command': name,
                        'cpu': cpu_pct,
                        'memMB': round(rss_kb / 1024),
                        'memPercent': mem_pct,
                        'user': user,
                        'state': 'running'
                    })
        except Exception:
            pass

    processes.sort(key=lambda p: p['memMB'], reverse=True)
    return processes[:60]

def collect_metrics():
    info = {
        'id': f"agent-{AGENT_ID}",
        'name': f"{socket.gethostname()} ({platform.system()})",
        'type': get_os_type(),
        'platform': f"{platform.system()} {platform.release()}",
        'arch': platform.machine(),
        'model': socket.gethostname()
    }

    return {
        'info': info,
        'cpu': get_cpu_info(),
        'memory': get_memory_info(),
        'processes': get_processes()
    }

def send_report(metrics):
    url = f"{SERVER_URL.rstrip('/')}/api/agent/report"
    payload = json.dumps({
        'id': AGENT_ID,
        'info': metrics['info'],
        'metrics': metrics
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[Agent] Report failed: {e}")
        return False

def main():
    print(f"=================================================")
    print(f"🚀 Universal Task Manager Agent (Python)")
    print(f"📡 Target Server : {SERVER_URL}")
    print(f"🆔 Agent ID      : {AGENT_ID}")
    print(f"🖥️ Platform      : {platform.system()} ({platform.machine()})")
    print(f"=================================================")

    while True:
        try:
            data = collect_metrics()
            send_report(data)
        except Exception as e:
            print(f"[Agent] Loop error: {e}")
        time.sleep(POLL_INTERVAL)

if __name__ == '__main__':
    main()
