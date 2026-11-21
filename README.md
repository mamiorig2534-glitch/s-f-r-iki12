# Sıfır İki — Çevrimiçi + Mobil paket

## 1) Sunucuyu çalıştır (bilgisayarında)
    node server.js          # Node 18+ yeterli, kurulum yok
Tarayıcıdan `http://localhost:3000` aç. Aynı Wi-Fi'deki telefondan `http://BİLGİSAYAR-IP:3000` aç.
Çevrimiçi sekmesinde **Oda Kur** → çıkan 5 harfli kodu arkadaşına ver → o **Katıl** der → kurucu **Maçı Başlat**.
Boş kalan yerleri botlar doldurur (en fazla 10 oyuncu / oda).

## 2) İnternete aç (herkes bağlansın)
Klasörü GitHub'a yükle, sonra Render.com / Railway / Fly.io'da "Web Service" oluştur:
- Build komutu: boş bırak · Start komutu: `node server.js`
- Sana `https://xxx.onrender.com` verir; oyun orada açılır, WebSocket otomatik `wss://` olur.
(Docker istersen `Dockerfile` hazır.)

## 3) Telefona kur
- **Uygulama gibi (PWA):** sunucu adresini Chrome'da aç → ⋮ → "Ana ekrana ekle". Tam ekran, yatay açılır. (https gerekir; Render'da hazır.)
- **APK:** klasörü GitHub'a yükle → **Actions → "APK derle" → Run workflow** → bitince `sifir-iki-apk` dosyasını indir, telefonda aç.
  APK'da sunucu adresi için `public/config.js` içine `window.SIFIR_SERVER='wss://xxx.onrender.com/ws';` yaz
  (yazmazsan oyun ilk çevrimiçi girişte adresi sorar ve hatırlar). Adres `wss://` (https) olmalı.

## Notlar
- Bot yönetimi ve raund akışını oda kurucusunun cihazı yürütür; kurucu çıkarsa maç senkronu bozulur.
- Hile koruması yok (istemci tabanlı isabet hesabı). Arkadaş maçları için uygundur.
- `/stats` açık oda/oyuncu sayısını, `/health` sunucu durumunu gösterir.

## Takım (parti) kuralları
- **Oda Kur** diyen kişi ev sahibidir; **MAÇI BAŞLAT** (veya ana HIZLI OYUN tuşu) yalnızca ondadır.
- Odadaki arkadaşların hepsi **aynı takımda** (ilk 5 kişi) başlar; kalan yerleri botlar doldurur. 5'ten fazla kişi karşı takıma geçer.
- Ev sahibi başlatınca 'go' mesajı 3 kez gönderilir, mesaj kaybolsa bile arkadaşların maça girer.
