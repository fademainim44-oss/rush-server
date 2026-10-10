# Rush Client VDS Sunucusu Kurulum Rehberi

Bu klasör, Rush Client kullanıcılarının birbirlerinin **kozmetiklerini**, **TAB listesinde Rush logolarını**, **emote** ve **spreylerini** canlı görebilmeleri için geliştirilmiş Dedicated Backend sunucusudur.

---

## 🐧 Linux VDS (Ubuntu / Debian / CentOS) Kurulumu

1. `server` klasörünü VDS'inize yükleyin (örn: WinSCP veya FileZilla ile `/root/rush-server` klasörüne).
2. SSH terminalinden klasöre girin:
   ```bash
   cd /root/rush-server
   ```
3. Çalıştırma izni verin ve başlatın:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

### 🔄 Arka Planda 7/24 Açık Bırakmak İçin (PM2 ile - ÖNERİLEN):
```bash
sudo npm install -g pm2
pm2 start server.js --name "rush-server"
pm2 save
pm2 startup
```

---

## 🪟 Windows VDS Kurulumu

1. `server` klasörünü masaüstüne atın.
2. `start.bat` dosyasına çift tıklayın (Node.js yüklü olmalıdır).

---

## ⚙️ Port Bilgisi
* **Varsayılan Port:** `25577` (İsterseniz `.env` veya ortam değişkeninden `PORT=8080` şeklinde değiştirebilirsiniz).
* VDS Güvenlik Duvarından (Firewall / UFW) `25577` portunun açık olduğundan emin olun:
  ```bash
  sudo ufw allow 25577/tcp
  ```
