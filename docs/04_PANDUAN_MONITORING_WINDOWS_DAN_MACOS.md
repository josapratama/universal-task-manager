# Panduan Monitoring Komputer Windows dan macOS

Panduan ini membahas cara memantau performa laptop, desktop PC, atau workstation yang menggunakan sistem operasi **Windows** (Windows 10, 11, Server) dan **macOS** (Intel x86 & Apple Silicon M1/M2/M3).

---

## 1. Pemantauan Mesin Windows

### Opsi A: Menjalankan Server Utama Langsung di Windows
Jika laptop/PC Windows Anda dijadikan pusat monitoring:
1. Jalankan server:
   ```cmd
   cd server
   npm start
   ```
2. Buka browser: `http://localhost:3000`. Perangkat `host-local` secara otomatis membaca informasi Windows melalui WMI dan Windows Performance Counters:
   - Penggunaan RAM, Komit Memori, Paged Pool, Non-Paged Pool.
   - Core clock & utilisasi thread CPU.
   - Status drive C:, D:, SSD NVMe, dan HDD eksternal.
   - Daftar proses Windows lengkap dengan kemampuan *Kill Task*.

### Opsi B: Memonitor PC Windows Lain Menggunakan Python Agent
Jika Anda ingin memantau PC Windows lain dari jarak jauh:
1. Pastikan Python 3 sudah terpasang.
2. Unduh agent dari server:
   ```powershell
   Invoke-WebRequest -Uri "http://<IP_SERVER>:3000/agents/universal_agent.py" -OutFile "universal_agent.py"
   ```
3. Jalankan agent di PowerShell / Command Prompt:
   ```powershell
   python universal_agent.py --server http://<IP_SERVER>:3000 --id "laptop-kerja-windows" --interval 2
   ```

### Menjalankan di Background Windows (Sebagai Task Scheduler / Service):
Anda dapat membuat Task Scheduler agar agent berjalan diam-diam saat PC menyala tanpa jendela CMD terbuka:
```powershell
# Jalankan di background dengan pythonw.exe
Start-Process pythonw -ArgumentList "universal_agent.py --server http://192.168.1.100:3000 --id laptop-lenovo" -WindowStyle Hidden
```

---

## 2. Pemantauan Komputer Apple macOS (Intel & Apple Silicon)

Universal Task Manager sepenuhnya kompatibel dengan macOS Catalina, Big Sur, Monterey, Ventura, Sonoma, dan versi lebih baru.

### Opsi A: Menjalankan Server di macOS
1. Pastikan Node.js 18+ terpasang (via Homebrew: `brew install node`).
2. Masuk ke direktori server:
   ```bash
   cd server && npm start
   ```
3. Buka `http://localhost:3000`. Modul `systeminformation` akan mengakses metrik native macOS melalui `sysctl`, `vm_stat`, dan `ioreg` untuk membaca:
   - Arsitektur (Apple Silicon M1/M2/M3 atau Intel Core).
   - Penggunaan Memory Pressure, Wired Memory, App Memory, dan Swap macOS.
   - Status disk APFS / Fusion Drive.

### Opsi B: Memonitor Mac Jarak Jauh dengan Python Agent
1. Buka Terminal macOS di Mac target.
2. Unduh agent:
   ```bash
   curl -O http://<IP_SERVER>:3000/agents/universal_agent.py
   ```
3. Jalankan agent:
   ```bash
   python3 universal_agent.py --server ws://<IP_SERVER>:3000/ws/agent --id "macbook-air-m2"
   ```

### Menjalankan Sebagai Background LaunchAgent di macOS:
Buat file plist di `~/Library/LaunchAgents/com.opentm.agent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.opentm.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/username/universal_agent.py</string>
        <string>--server</string>
        <string>http://192.168.1.100:3000</string>
        <string>--id</string>
        <string>macbook-pro</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Aktifkan dengan:
```bash
launchctl load ~/Library/LaunchAgents/com.opentm.agent.plist
```

---

## 3. Fitur Keamanan dan Akses Antar Platform

- **Perizinan Kill Process:** Pada Windows dan macOS, proses milik sistem (`System`, `smss.exe`, `launchd`, `kernel_task`) dilindungi oleh OS dan tidak dapat dihentikan oleh user biasa, menjaga stabilitas sistem.
- **Port Komunikasi:** Agen hanya membutuhkan koneksi keluar (outbound) ke port 3000 server Universal Task Manager, sehingga tidak memerlukan pengaturan port-forwarding atau pembukaan firewall rumit di sisi client.
