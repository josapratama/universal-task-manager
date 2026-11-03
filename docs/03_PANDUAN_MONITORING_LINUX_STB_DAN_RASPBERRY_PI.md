# Panduan Monitoring Linux STB, TV Box, dan Raspberry Pi

Dokumen ini menjelaskan cara menghubungkan perangkat Linux STB (Set-Top Box berbasis Amlogic/Allwinner/Rockchip seperti ZTE B860H, Fiberhome HG680P, X96 Mini), Raspberry Pi (semua generasi), dan SBC Linux lainnya ke **Universal Task Manager**.

---

## 1. Karakteristik & Dukungan Perangkat

| Kategori | Contoh Perangkat | OS Didukung | Metode Terbaik |
| :--- | :--- | :--- | :--- |
| **STB Android (Stock/Root)** | ZTE B860H, HG680P, TX3 Mini | Android TV 6.0 - 11.0 | ADB (USB/WiFi) atau Android Agent |
| **STB Linux Armbian** | HG680P / B860H Armbian | Debian / Ubuntu Minimal | Shell Agent (`universal_agent.sh`) |
| **STB OpenWrt** | STB Router / Gateway | OpenWrt 19/21/23 | Shell Agent (Busybox) |
| **Raspberry Pi** | Pi 3B+, 4B, 5, Pi Zero 2W | Raspberry Pi OS, DietPi, Ubuntu | Python Agent / Shell Agent / Host |
| **SBC Lainnya** | Orange Pi, Banana Pi, Rock Pi | Armbian, DietPi | Python Agent / Shell Agent |

---

## 2. Cara 1: Menggunakan Shell Agent Ringan (`universal_agent.sh`)

Metode ini adalah pilihan terbaik untuk STB atau router dengan resource terbatas (RAM 1GB / flash kecil) karena **tanpa dependensi Python atau Node.js**, hanya membutuhkan Busybox/POSIX shell dan utilitas bawaan Linux (`awk`, `grep`, `cat /proc`).

### Langkah Cepat (1-Line Runner via cURL):
Jalankan perintah ini di terminal SSH STB / Raspberry Pi Anda (ganti `IP_SERVER` dengan IP komputer yang menjalankan Universal Task Manager):

```bash
curl -s http://<IP_SERVER>:3000/agents/universal_agent.sh | SERVER_URL=http://<IP_SERVER>:3000 DEVICE_ID=stb-ruang-tamu sh
```

### Langkah Manual:
1. Unduh script ke perangkat STB / Raspberry Pi:
   ```bash
   wget http://<IP_SERVER>:3000/agents/universal_agent.sh -O universal_agent.sh
   chmod +x universal_agent.sh
   ```
2. Jalankan agent dengan menentukan target server:
   ```bash
   export SERVER_URL="http://192.168.1.100:3000"
   export DEVICE_ID="stb-hg680p-kamar"
   export INTERVAL=2
   ./universal_agent.sh
   ```

### Menjalankan Otomatis Saat Booting (Systemd Service):
Buat service systemd agar STB selalu termonitor otomatis:

```bash
sudo cat << 'EOF' > /etc/systemd/system/task-manager-agent.service
[Unit]
Description=Universal Task Manager Telemetry Agent
After=network.target

[Service]
Type=simple
Environment="SERVER_URL=http://192.168.1.100:3000"
Environment="DEVICE_ID=stb-armbian-01"
Environment="INTERVAL=2"
ExecStart=/bin/sh /opt/universal_agent.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo mv universal_agent.sh /opt/universal_agent.sh
sudo systemctl daemon-reload
sudo systemctl enable --now task-manager-agent
```

---

## 3. Cara 2: Menggunakan Python Agent (`universal_agent.py`)

Jika Raspberry Pi atau Armbian STB Anda memiliki Python 3 terpasang, gunakan Python Agent untuk fitur koneksi WebSocket real-time dua arah (bisa menerima perintah `kill process` secara instan dari dashboard).

```bash
# Unduh agent
curl -O http://<IP_SERVER>:3000/agents/universal_agent.py

# Jalankan via WebSocket streaming
python3 universal_agent.py --server ws://192.168.1.100:3000/ws/agent --id rpi4-cluster-node1

# Atau jalankan via HTTP Polling berkala
python3 universal_agent.py --server http://192.168.1.100:3000 --id rpi4-cluster-node1 --interval 2
```

---

## 4. Cara 3: Menjalankan Universal Task Manager Langsung di Raspberry Pi (Mode Host)

Anda juga dapat menjadikan Raspberry Pi 4 atau 5 sebagai **Server Utama**:
1. Pasang Node.js di Raspberry Pi:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```
2. Clone dan jalankan server:
   ```bash
   git clone https://github.com/josapratama/universal-task-manager.git
   cd universal-task-manager/server
   npm install
   npm start
   ```
3. Buka browser di perangkat apa pun di jaringan lokal: `http://<IP_RASPBERRY_PI>:3000`. Dashboard akan langsung menampilkan metrics lokal Raspberry Pi serta menerima telemetry dari perangkat lain di rumah Anda.

---

## 5. Metrik Khusus Perangkat Embedded & STB

Pada perangkat STB dan Raspberry Pi, agen mengumpulkan metrik penting:
- **CPU & Core Frequencies:** Deteksi throttling akibat panas.
- **Suhu SOC (`/sys/class/thermal/thermal_zone0/temp`):** Memastikan STB tidak overheat saat memutar video atau komputasi tinggi.
- **Memori Swap & ZRAM:** Memonitor efisiensi RAM pada STB berkapasitas 1GB/2GB.
- **Storage eMMC / MicroSD:** Memantau I/O dan sisa kapasitas penyimpanan flash.
