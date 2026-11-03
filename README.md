# Universal Task Manager & Hardware Monitor ⚡📊

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platforms-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20STB%20%7C%20Raspberry%20Pi-blue)](https://github.com/josapratama/universal-task-manager)
[![Open Source](https://img.shields.io/badge/Open%20Source-100%25%20Free-success)](https://github.com/josapratama/universal-task-manager)

**Universal Task Manager** adalah aplikasi web monitoring performa perangkat keras dan manajemen proses task manager lintas platform (Cross-Platform). Dirancang untuk memantau penggunaan RAM, CPU, Storage, Baterai, dan Proses berjalan secara real-time dari berbagai jenis mesin: **HP/Tablet Android (berbagai merek & versi OS), Laptop/PC Windows, Apple macOS, Linux Server, STB TV Box (Armbian/OpenWrt), dan Raspberry Pi**.

100% open-source, bebas biaya langganan, dan beroperasi sepenuhnya di jaringan lokal (Local-first / Offline-capable).

---

## 🌟 Fitur Utama

- 📈 **Real-Time Live Canvas Graph (60 FPS):** Grafik riwayat pemakaian CPU dan RAM dinamis bergaya Windows 11 Task Manager & macOS Activity Monitor.
- 📱 **Multi-Vendor Android Deep Telemetry:** Membaca profil memori mendalam Android (PSS, RSS, VSS, Native Heap, Dalvik/Java Heap, Cached Apps) di Xiaomi MIUI/HyperOS, Samsung OneUI, Realme/OPPO, Vivo, Pixel, serta Android TV Box.
- 🔄 **3 Pilihan Mode Koneksi Fleksibel:**
  1. **Mode 1: Local / Wireless ADB** (Tanpa install aplikasi apa pun di Android).
  2. **Mode 2: WebUSB Direct** (Koneksi langsung browser Chrome ke perangkat USB tanpa perantara).
  3. **Mode 3: Lightweight Remote Agent** (Agent ringan Python/Shell untuk STB, Raspberry Pi, Linux, Mac, & Windows).
- 🛑 **Process Management & Task Kill:** Cari proses yang memakan resource berlebih dan hentikan langsung dari browser dengan satu klik (*End Task*).
- 🔋 **Hardware Sensor Suite:** Membaca statistik baterai (level, status charging), suhu prosesor (Thermal zones), dan utilitas partisi disk.
- 🎨 **Modern Dark Glassmorphism UI:** Tampilan responsif, cepat, dan ramah pengguna dengan tema gelap premium.

---

## 🖥️ Matriks Dukungan Platform & OS

| Mesin / Perangkat | OS / Varian | Metode Koneksi Rekomendasi |
| :--- | :--- | :--- |
| **Android Phone / Tablet** | Android 5.0 Lollipop s/d Android 14+ | Wireless ADB / WebUSB / Android Agent |
| **Android TV / STB** | Android TV 7 - 12 (ZTE B860H, HG680P) | Wireless ADB / APK Companion |
| **STB Linux Armbian** | Armbian Debian / Ubuntu (HG680P, X96) | Shell Agent (`universal_agent.sh`) |
| **STB OpenWrt** | OpenWrt 19.x, 21.x, 23.x | Shell Agent (Busybox) |
| **Raspberry Pi** | Raspberry Pi OS, DietPi, Ubuntu Core | Host Langsung / Python Agent / Shell |
| **Windows PC / Laptop** | Windows 10, Windows 11, Windows Server | Host Server / Python Agent |
| **Apple Mac** | macOS Monterey, Ventura, Sonoma (M1/M2/Intel) | Host Server / Python Agent |
| **Linux Desktop / Server**| Ubuntu, Debian, Arch, Fedora, Alpine | Host Server / Shell / Python Agent |

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### 1. Prasyarat
- Komputer dengan [Node.js](https://nodejs.org/) v18 atau lebih baru.
- (Opsional untuk Android ADB): Pasang Android Platform Tools (`adb`).

### 2. Instalasi & Menjalankan Server
```bash
# Clone repository
git clone https://github.com/josapratama/universal-task-manager.git
cd universal-task-manager/server

# Install dependensi
npm install

# Jalankan server
npm start
```

Akses web task manager melalui browser:
👉 **`http://localhost:3000`** (atau `http://<IP-KOMPUTER>:3000` dari gadget lain di jaringan WiFi yang sama).

---

## 📡 3 Cara Menghubungkan Perangkat

### 🔹 Mode 1: Android via ADB (USB atau Wireless)
1. Aktifkan **Developer Options** & **USB Debugging** di ponsel/TV Box Anda.
2. Hubungkan via USB atau Wireless ADB:
   - Hubungkan ke IP Android langsung dari UI dashboard: Klik tombol **"Connect Wireless ADB"**, masukkan `IP:Port` (contoh: `192.168.1.50:5555`).
   - Atau colok kabel USB, perangkat akan langsung terdeteksi otomatis.

### 🔹 Mode 2: WebUSB Direct (Browser-to-Device)
1. Buka dashboard di Google Chrome / Chromium browser.
2. Klik tombol **"WebUSB Direct"** di pojok kanan atas.
3. Pilih HP Android Anda dari popup perizinan WebUSB Chrome.

### 🔹 Mode 3: Remote Agent Ringan (STB / Linux / Mac / PC Lain)
Cukup jalankan satu baris perintah di perangkat target:
```bash
# Untuk STB Linux / Raspberry Pi / OpenWrt (Shell Tanpa Dependensi):
curl -s http://<IP_SERVER>:3000/agents/universal_agent.sh | SERVER_URL=http://<IP_SERVER>:3000 DEVICE_ID=stb-kamar sh

# Untuk Laptop / Mac / Komputer Lain (Python 3):
python3 universal_agent.py --server ws://<IP_SERVER>:3000/ws/agent --id my-laptop
```

---

## 📚 Dokumentasi Lengkap

Untuk panduan konfigurasi yang lebih mendalam, silakan baca dokumentasi di folder `docs/`:

1. [**01. Panduan Mulai & Setup**](docs/01_PANDUAN_MULAI_DAN_SETUP.md) - Instalasi server, konfigurasi port, dan struktur direktori.
2. [**02. Panduan Koneksi Android ADB & WebUSB**](docs/02_PANDUAN_KONEKSI_ANDROID_ADB_DAN_WEBUSB.md) - Pengaturan USB debugging, Wireless ADB, dan WebUSB Chrome.
3. [**03. Panduan Monitoring Linux STB, TV Box & Raspberry Pi**](docs/03_PANDUAN_MONITORING_LINUX_STB_DAN_RASPBERRY_PI.md) - Setup Armbian, HG680P, B860H, OpenWrt, dan Raspberry Pi autostart systemd.
4. [**04. Panduan Monitoring Windows & macOS**](docs/04_PANDUAN_MONITORING_WINDOWS_DAN_MACOS.md) - Memantau laptop Windows dan Apple Silicon Mac di background.
5. [**05. Arsitektur & Referensi REST/WebSocket API**](docs/05_ARSITEKTUR_DAN_API_REFERENCE.md) - Format JSON telemetri, REST endpoints, dan channel WebSocket.

---

## 🏗️ Struktur Direktori Proyek

```
universal-task-manager/
├── server/                   # Backend Node.js
│   ├── package.json          # Express, WebSocket, SystemInformation
│   └── src/
│       ├── collectors/
│       │   ├── hostCollector.js    # Metrik mesin host (Windows/Linux/Mac)
│       │   ├── adbCollector.js     # Metrik Android via ADB Bridge
│       │   └── agentRegistry.js    # Manajemen streaming remote agents
│       └── server.js               # Entry point REST & WebSocket server
├── web/                      # Frontend Web Task Manager
│   ├── index.html            # Antarmuka Dashboard utama
│   ├── style.css             # Desain Glassmorphism Dark Theme
│   └── app.js                # Canvas rendering, WebSocket client & UI controller
├── agents/                   # Remote Telemetry Agents
│   ├── universal_agent.py    # Zero-dependency Python 3 agent
│   └── universal_agent.sh    # Lightweight POSIX Shell agent untuk STB
├── android-agent/            # Companion Native Android App (Kotlin Service)
├── docs/                     # Dokumentasi teknis modular
├── .gitignore
├── LICENSE                   # Lisensi Open-Source MIT
└── README.md                 # Dokumentasi master proyek
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [Lisensi MIT](LICENSE). Anda bebas menggunakan, memodifikasi, dan mendistribusikannya untuk kebutuhan pribadi maupun komersial secara gratis.
