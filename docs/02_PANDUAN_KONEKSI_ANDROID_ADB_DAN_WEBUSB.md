# 📱 Panduan Koneksi Perangkat Android (USB, Wireless ADB, dan WebUSB)

Panduan lengkap menghubungkan smartphone, tablet, dan Android TV / STB ke Universal Task Manager menggunakan 3 mode koneksi berbeda.

---

## 📑 Daftar Isi
1. [Mode 1: ADB via Kabel USB](#1-mode-1-adb-via-kabel-usb)
2. [Mode 2: Wireless ADB (Tanpa Kabel / Via WiFi)](#2-mode-2-wireless-adb)
3. [Mode 3: WebUSB Direct (Browser-Only Tanpa Server)](#3-mode-3-webusb-direct)
4. [Mode 4: Companion Agent APK](#4-mode-4-companion-agent-apk)
5. [Daftar Perintah Diagnostik yang Dieksekusi](#5-daftar-perintah-diagnostik-yang-dieksekusi)

---

## 1. Mode 1: ADB via Kabel USB

Mode ini tidak memerlukan instalasi aplikasi apapun di HP!

### Langkah Aktivasi di Android:
1. Masuk ke **Settings (Pengaturan)** $\rightarrow$ **About Phone (Tentang Ponsel)**.
2. Ketuk **Build Number** sebanyak 7 kali berturut-turut hingga muncul pesan *"You are now a developer!"*.
3. Buka **Developer Options (Opsi Pengembang)** $\rightarrow$ aktifkan tombol **USB Debugging**.
4. Colokkan HP ke PC menggunakan kabel data USB.
5. Pada layar HP, centang *"Always allow from this computer"* lalu pilih **Allow (Izinkan)**.
6. Pada Web Dashboard, HP Anda (Samsung, Xiaomi, Oppo, Vivo, dll) akan otomatis terdeteksi di dropdown pemilih perangkat!

---

## 2. Mode 2: Wireless ADB (Tanpa Kabel)

Cocok untuk Android TV Box, STB Android, atau HP yang berada di ruangan lain:

1. Pastikan HP dan komputer berada di jaringan WiFi yang sama.
2. Di HP (Android 11+), aktifkan **Wireless Debugging** di Opsi Pengembang, catat IP dan Port (misal: `192.168.1.45:5555`).
3. Pada Web Dashboard, klik tombol **"🔌 Connect Wireless ADB"**.
4. Masukkan IP dan Port, lalu klik **Connect Device**.

---

## 3. Mode 3: WebUSB Direct (Browser-Only)

Fitur browser modern yang memungkinkan Google Chrome atau Microsoft Edge berkomunikasi langsung ke HP via kabel USB tanpa bantuan backend server:

1. Buka dashboard di Chrome / Edge.
2. Klik tombol **"⚡ WebUSB Direct"**.
3. Jendela browser akan memunculkan daftar perangkat USB Android.
4. Pilih HP Anda dan klik **Connect**.

---

## 4. Mode 4: Companion Agent APK

Untuk pemantauan jangka panjang di luar jangkauan USB/ADB:
1. Pasang APK agent dari folder `android-agent/`.
2. Masukkan URL server dashboard (contoh: `http://192.168.1.100:3000`).
3. Tekan **Start Service**.
4. Perangkat akan muncul otomatis di Web Dashboard pada tab *Remote Agents*.

---

## 5. Daftar Perintah Diagnostik yang Dieksekusi

Server mengeksekusi perintah ADB native non-intrusif:
- `cat /proc/meminfo`: Membaca Total RAM, Free RAM, Buffers, Cached, dan ZRAM.
- `dumpsys battery`: Membaca level baterai, voltase, dan suhu sensor baterai.
- `ps -A -o PID,USER,%CPU,%MEM,RSS,NAME`: Membaca daftar task/aplikasi yang berjalan beserta penggunaan RAM (RSS).
- `am force-stop <package>` / `kill -9 <pid>`: Mematikan task yang dipilih pengguna dari web.
