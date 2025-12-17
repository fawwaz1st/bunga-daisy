# 🌼 Bunga Daisy — Interaktif

> **Pengalaman web yang tenang dan sinematik menampilkan bunga daisy tunggal**
> dengan musik generatif, latar paralaks dinamis, dan interaksi responsif

<p align="center">
  <a href="https://fawwaz1st.github.io/bunga-daisy/">
    <img src="https://img.shields.io/badge/🌼_Tap_untuk_Main-Play_Now!-ff69b4?style=for-the-badge&logoColor=white" alt="Play Now">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/vanilla-JavaScript-yellow?style=flat-square" alt="Vanilla JS">
  <img src="https://img.shields.io/badge/Web%20Audio-API-blue?style=flat-square" alt="Web Audio API">
  <img src="https://img.shields.io/badge/Canvas-2D-green?style=flat-square" alt="Canvas 2D">
  <img src="https://img.shields.io/badge/Responsif-Mobile%20%26%20Desktop-purple?style=flat-square" alt="Responsive">
  <img src="https://img.shields.io/badge/Tanpa%20Dependensi-100%25-orange?style=flat-square" alt="No Dependencies">
</p>

---

## ⚠️ Disclaimer

> **Hampir seluruh kode dalam proyek ini dibuat oleh AI** (Google Gemini dan Claude).
> 
> Proyek ini masih dalam tahap **"perang prompt"** — banyak fitur yang mungkin kurang sempurna atau memerlukan perbaikan lebih lanjut.
>
> **Catatan:**
> - 🕐 Siklus dan posisi siang/malam masih kurang tepat (masih malas diperbaiki)
> - ⚡ Kode baru sedikit teroptimasi
> - 🔧 Masih banyak ruang untuk improvement

---

## ✨ Fitur

### 🎬 Animasi Pembuka Sinematik
- **Sekuen 9 detik** dengan 4 tahap berbeda
- Batang tumbuh organik dari tanah
- Kelopak mekar satu per satu dalam pola melingkar
- Hembusan angin lembut memperkenalkan pemandangan

### 🌸 Bunga Interaktif
- **36 kelopak unik** dengan fisika individual
- Efek hover: miring, bersinar, pergeseran warna, partikel serbuk sari
- Efek klik: putaran, riak menyebar ke tetangga
- Napas tengah tersinkronisasi dengan musik ambient

### 🏞️ Latar Paralaks Dinamis
- Awan bergerak melintasi langit
- Bukit bergelombang dengan layer kedalaman
- Berbagai jenis siluet pohon
- Bunga liar tersebar di tengah dan latar depan
- Rumput dinamis berayun mengikuti angin
- Bintang, bulan, dan kunang-kunang di malam hari

### 🎵 Audio Generatif Orkestra
- **Musik dihasilkan secara prosedural** menggunakan Web Audio API
- 3 skala: Lydian (dreamy), Dorian (melankolis), Mixolydian (hangat)
- 12 progresi akor berubah setiap 12 detik
- Pad lembut, lonceng saat hover, akor saat klik
- Reverb 4 detik yang lush

### 🌙 Siklus Siang-Malam
- Rotasi matahari/bulan penuh (siklus 90 detik)
- Matahari terbit dari kiri, tenggelam di kanan (di belakang bukit)
- Bintang muncul saat malam
- Kunang-kunang bersinar di malam hari

### 🐝 Sistem Lebah
- Lebah datang setiap 10 detik
- Hover 4-7 detik di atas bunga
- Mengikuti posisi bunga, lalu pergi

---

## 🎮 Cara Berinteraksi

| Aksi | Efek |
|------|------|
| **Hover di atas kelopak** | Kelopak miring, bersinar, dan mengeluarkan serbuk sari emas |
| **Klik kelopak** | Berputar dengan riak menyebar ke tetangga |
| **Hover di tengah** | Napas lebih dalam, cahaya radial muncul |
| **Klik di tengah** | Ledakan mekar penuh, ayunan slow-mo, partikel cahaya |
| **Diam 10 detik** | Mode idle charm aktif |

---

## 📱 Main di Mobile

Pengalaman ini **sepenuhnya responsif** dan bekerja di browser mobile!

### Cara: Jaringan Lokal
1. Jalankan server di komputer kamu:
   ```bash
   cd path/to/Bunga
   npx serve . -l 3000
   ```
2. Catat **alamat Network** yang tampil (mis. `http://192.168.x.x:3000`)
3. Buka alamat itu di browser HP (jaringan WiFi yang sama)

### Tips Mobile
- 📌 **Sentuh = Hover + Klik** digabung
- 📌 Ketuk kelopak dan tengah untuk efek penuh
- 📌 Gunakan headphone untuk pengalaman audio terbaik
- 📌 Bekerja di mode portrait dan landscape

---

## 🚀 Mulai Cepat

```bash
# Clone repositori
git clone https://github.com/fawwaz1st/bunga-daisy.git
cd bunga-daisy

# Jalankan server lokal
npx serve . -l 3000

# Buka di browser
# http://localhost:3000
```

> **Catatan:** Audio memerlukan interaksi pengguna untuk memulai (kebijakan browser). Ketuk "Ketuk di mana saja untuk mulai" untuk memulai.

---

## 🏗️ Struktur Proyek

```
Bunga/
├── 📄 index.html              # Entry point
├── 🎨 styles.css              # Styling responsif
└── 📁 js/
    ├── main.js                # Orkestrator aplikasi
    ├── config.js              # Warna, fisika, param audio
    └── 📁 modules/
        ├── BackgroundParallax.js   # Langit, awan, bukit, pohon
        ├── WindField.js            # Sistem angin Perlin noise
        ├── ParticleSystem.js       # Debu, serbuk sari, kunang-kunang
        ├── DaisyFlower.js          # Controller bunga utama
        ├── Stem.js                 # Batang kurva Bezier + daun
        ├── PetalModule.js          # 36 kelopak dengan fisika
        ├── CorePulse.js            # Tengah bunga dengan shimmer
        ├── PollenTrail.js          # Partikel mengikuti kursor
        ├── AudioLayer.js           # Audio Web generatif
        ├── EntranceAnimation.js    # Sekuen intro 4 tahap
        ├── StateManager.js         # Mode idle, curiosity, malam
        ├── InputHandler.js         # Dukungan mouse + sentuh
        └── BeeSystem.js            # Sistem lebah otomatis
```

---

## 🌟 Highlights Teknis

- **Tanpa dependensi** — Pure vanilla JavaScript
- **Canvas 2D** rendering untuk kompatibilitas luas
- **Web Audio API** untuk sintesis audio real-time
- **Perlin noise** untuk pola angin alami
- **Spring physics** untuk gerakan kelopak organik
- **Deteksi kemampuan perangkat** untuk scaling performa
- **Koordinat normalized** untuk responsive design

---

## 📝 Lisensi

Lisensi MIT — Bebas digunakan, dimodifikasi, dan dibagikan!

---

<p align="center">
  Dibuat dengan 🌼 oleh Fawwaz + AI
</p>
