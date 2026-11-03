# Arsitektur & Referensi REST/WebSocket API

Universal Task Manager dirancang dengan arsitektur modular terdesentralisasi, memungkinkan integrasi multi-perangkat secara simultan dengan latensi rendah.

---

## 1. Diagram Arsitektur Sistem

```
       +-------------------------------------------------------------+
       |               Web Dashboard (HTML5 / Canvas / WS)           |
       |             http://localhost:3000 / Modern UI Dark          |
       +--------------+-------------------+--------------------+------+
                      |                   |                    |
                      v                   v                    v
               [ Mode 1: ADB ]     [ Mode 2: WebUSB ]   [ Mode 3: Agents ]
                      |                   |                    |
                      |                   | (Direct Browser)   | (HTTP / WebSocket)
                      v                   v                    v
    +-------------------------------------------+     +-------------------+
    |         Node.js Central Server            |     | Remote Machines:  |
    |  - Express REST API                       |     | - Android Phone   |
    |  - WebSocket Hub (/ws, /ws/agent)         |<--->| - STB Armbian     |
    |  - Systeminformation (Host Metrics)       |     | - Raspberry Pi    |
    |  - ADB Bridge Controller                  |     | - Windows Laptop  |
    +---------------------+---------------------+     | - macOS Workstn   |
                          |                           +-------------------+
                          v
                 [ Host OS Metrics ]
              (Windows / Linux / macOS)
```

---

## 2. Model Data Telemetri Standar (Unified Telemetry Payload)

Setiap perangkat, terlepas dari OS atau metode koneksinya, mengirimkan struktur JSON yang seragam:

```json
{
  "id": "device-identifier",
  "name": "Host/Device Name",
  "type": "host | adb | agent",
  "platform": "windows | linux | darwin | android",
  "timestamp": 1730000000000,
  "cpu": {
    "usagePercent": 24.5,
    "cores": 8,
    "model": "AMD Ryzen 7 5800H"
  },
  "memory": {
    "totalBytes": 16987123712,
    "usedBytes": 8589934592,
    "freeBytes": 8397189120,
    "usagePercent": 50.5,
    "swapTotalBytes": 4294967296,
    "swapUsedBytes": 1048576
  },
  "storage": [
    {
      "mount": "/",
      "totalBytes": 512110190592,
      "usedBytes": 256055095296,
      "usagePercent": 50.0
    }
  ],
  "processes": [
    {
      "pid": 1024,
      "name": "chrome.exe",
      "cpuPercent": 3.2,
      "memPercent": 1.5,
      "memRssBytes": 254803968
    }
  ],
  "battery": {
    "hasBattery": true,
    "percent": 88,
    "isCharging": false
  }
}
```

---

## 3. Spesifikasi REST API

### GET `/api/devices`
Mengembalikan daftar semua perangkat yang terdeteksi atau terhubung saat ini.
- **Response `200 OK`**:
```json
{
  "devices": [
    { "id": "host-local", "name": "Local PC (Windows)", "type": "host", "online": true },
    { "id": "adb-R58M123456", "name": "Samsung Galaxy S21", "type": "adb", "online": true },
    { "id": "stb-living-room", "name": "Armbian B860H", "type": "agent", "online": true }
  ]
}
```

### GET `/api/devices/:id/metrics`
Mengambil metrik performa saat ini untuk ID perangkat tertentu.
- **Parameters**: `id` (contoh: `host-local`, `adb-R58M123456`)
- **Response `200 OK`**: Objek telemetri lengkap sesuai model data di atas.

### POST `/api/devices/:id/kill`
Mengirim instruksi penghentian proses (Task Kill) ke perangkat target.
- **Body**:
```json
{
  "pid": 1234,
  "name": "com.target.application"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Process 1234 killed successfully"
}
```

### POST `/api/adb/connect`
Melakukan inisialisasi koneksi Wireless ADB via TCP/IP.
- **Body**:
```json
{
  "ip": "192.168.1.55",
  "port": 5555
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "connected to 192.168.1.55:5555"
}
```

### POST `/api/agent/report`
Endpoint penerima telemetri dari remote agent via HTTP POST (digunakan oleh `universal_agent.sh` atau `universal_agent.py` mode polling).
- **Body**: Unified Telemetry Payload.
- **Response `200 OK`**: `{"status": "ok"}`.

---

## 4. Spesifikasi WebSocket API

### Telemetri Dashboard Client (`ws://<IP_SERVER>:3000/ws`)
Browser menghubungkan WebSocket ke endpoint ini untuk menerima streaming berkala setiap detik:
- **Pesan Masuk**:
```json
{
  "type": "telemetry",
  "devices": [ ...list of unified metrics for all active devices... ]
}
```

### Remote Agent Stream Channel (`ws://<IP_SERVER>:3000/ws/agent`)
Agen jarak jauh terhubung ke endpoint ini untuk komunikasi dua arah dua arah real-time berlatensi ultra-rendah (<50ms):
- **Agent -> Server**: Mengirim JSON Telemetri setiap `INTERVAL` detik.
- **Server -> Agent**: Mengirim perintah kontrol:
```json
{
  "command": "kill_process",
  "pid": 5678,
  "name": "node"
}
```
