# 🚀 Panduan Instalasi dan Menjalankan Universal Task Manager

Panduan setup cepat untuk menjalankan server Universal Task Manager pada komputer lokal (Windows, Linux, macOS, atau Raspberry Pi) serta mengakses Web Dashboard.

---

## 📑 Daftar Isi
1. [Prasyarat Sistem](#1-prasyarat-sistem)
2. [Menjalankan Server Lokal (Quick Start)](#2-menjalankan-server-lokal)
3. [Mengakses Web Dashboard](#3-mengakses-web-dashboard)
4. [Menjalankan sebagai Background Service (PM2 / Systemd)](#4-menjalankan-sebagai-background-service)

---

## 1. Prasyarat Sistem
- **Node.js:** Versi 18.x, 20.x, atau 22.x+ (Sudah terpasang di sistem Anda).
- **Web Browser:** Google Chrome, Microsoft Edge, Brave, atau Mozilla Firefox.
- **Opsional (Untuk Mode Android ADB):** Android SDK Platform-Tools (`adb`) terpasang di PATH sistem.

---

## 2. Menjalankan Server Lokal

Buka terminal (PowerShell di Windows, atau Bash di Linux/Mac):

```bash
cd "D:\coding\raspberry pi\project\universal-task-manager\server"
npm start
```

Output pada terminal:
```text
=======================================================
🚀 Universal Task Manager Server Running!
🌐 Web Dashboard: http://localhost:3000
📱 Supported: Windows, Linux, macOS, STB, Raspberry Pi, Android
=======================================================
```

---

## 3. Mengakses Web Dashboard

1. Buka browser web di laptop atau smartphone.
2. Akses alamat:
   ```text
   http://localhost:3000
   ```
   *(Atau ganti `localhost` dengan IP LAN komputer Anda jika ingin diakses dari HP/perangkat lain di WiFi yang sama, contoh: `http://192.168.1.100:3000`).*
3. Dashboard akan langsung menampilkan **performa CPU, grafik RAM 60fps, Swap/ZRAM, dan daftar proses** dari komputer yang sedang menjalankan server (*Host System*).

---

## 4. Menjalankan sebagai Background Service (PM2)

Agar server otomatis menyala saat komputer / mini PC / Raspberry Pi di-booting:

```bash
# Install PM2 Process Manager
npm install -g pm2

# Jalankan server via PM2
pm2 start src/server.js --name "universal-task-manager"

# Simpan agar autorun saat startup
pm2 save
pm2 startup
```
