# 🚀 AktifClass - Platform Interaksi & Pengukur Keaktifan Siswa Real-Time
> **Karya Inovasi Pembelajaran: Meningkatkan Partisipasi, Kolaborasi Antar-Kelompok, dan Membangun Kepercayaan Diri Siswa (Zero-Login Architecture)**

---

## 📌 1. Latar Belakang & Masalah di Kelas
Dalam pembelajaran aktif (*Active Learning*) dan implementasi Kurikulum Merdeka, penilaian keaktifan siswa seringkali menghadapi tiga tantangan krusial:
1. **Bias & Subjektivitas Penilaian**: Guru kesulitan mencatat partisipasi siswa secara presisi di tengah dinamika kelas, sehingga seringkali hanya siswa yang paling vokal/ekstrovert yang mendapat pengakuan.
2. **Fenomena *Free-Rider* (Numpang Nama)**: Pada kerja kelompok, siswa aktif sering mendominasi pengerjaan, sementara siswa pemalu atau pasif tidak terlibat dan hanya menitip nama.
3. **Friksi Teknis Aplikasi Pembelajaran**: Aplikasi pembelajaran yang mewajibkan siswa mengunduh aplikasi atau membuat akun dengan email/password sering menghabiskan waktu 15–20 menit jam belajar berharga hanya untuk urusan login atau lupa sandi.

---

## 💡 2. Kebaruan & Nilai Inovasi (*Innovation Highlights*)

### A. Arsitektur Tanpa Login (*Zero-Login Frictionless Interaction*)
* Siswa cukup memindai **QR Code** di layar proyektor atau memasukkan **6 Digit PIN** melalui peramban web HP mereka (tanpa perlu mendaftar/login).
* Data sesi siswa tersimpan otomatis secara lokal di perangkat. Jika sinyal terputus atau halaman tersegarkan (*refresh*), siswa langsung kembali ke posisinya tanpa keluar dari kelas.

### B. Mekanisme "Estafet Tantangan" *(Challenge Relay)*
* **Menularkan Keaktifan**: Kelompok yang aktif tidak memonopoli diskusi, melainkan mendapatkan hak istimewa untuk "melempar tongkat estafet" kepada kelompok lain.
* Layar HP kelompok penerima akan bergetar dan menampilkan hitung mundur waktu diskusi. Ini membuat seluruh kelompok tetap siaga dan tertantang secara suportif.

### C. Bar Energi Keaktifan Kelas *(Class Energy Battery)*
* Mengubah iklim kompetisi yang saling mengintimidasi menjadi **kolaborasi satu kelas**.
* Setiap ide, pertanyaan, dan keberhasilan estafet mengisi baterai energi kelas (0% → 100%).
* Saat mencapai 100%, seluruh kelas merayakan tercapainya target belajar harian secara bersama-sama.

### D. Roda Acak Perwakilan Siswa *(Mystery Picker - Anti Free-Rider)*
* Dalam diskusi kelompok, bukan ketua kelompok yang otomatis maju memaparkan hasil.
* Guru dapat memutar roda acak yang memilih anggota kelompok secara misterius. Hal ini mendorong anggota kelompok yang pintar untuk aktif mengajari temannya (*Peer Tutoring / Tutor Sebaya*).

### E. Tangga Keberanian *(Confidence Scaffolding / Safe-Haven)*
* Siswa pemalu dapat mengirimkan pertanyaan/gagasan secara anonim ke papan ide kelas.
* Teman-teman sekelas dapat memberikan apresiasi berupa **Upvote (💡 Ide Keren)**.
* Validasi dari teman sebaya ini memberi modal rasa aman dan percaya diri bagi siswa sebelum berbicara di depan kelas.

### F. Ekspor Asesmen Formatif Otomatis (Kurikulum Merdeka)
* 1-klik unduh rekapitulasi keaktifan dalam format **Excel (.xlsx)** yang mencakup:
  * Skor keaktifan individu & predikat capaian.
  * Skor kolaborasi kelompok & rata-rata kontribusi anggota.
  * Log kronologis partisipasi kelas untuk bukti autentik asesmen.

---

## 🛠️ 3. Teknologi yang Digunakan (*Tech Stack*)

* **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons.
* **Real-Time Engine**: Socket.io (Protokol WebSocket dua arah dengan latensi < 50ms).
* **Backend**: Node.js + Express (Modular ES Module).
* **Efek & Interaktivitas**: Web Audio API Synthesizer (suara buzzer & fanfare mandiri tanpa aset eksternal) + Canvas Confetti.
* **Laporan**: SheetJS (XLSX) untuk generate file Excel otomatis.
* **Penyimpanan**: File-based ACID JSON Store (Portabel & ringan, tanpa perlu install database terpisah).

---

## 🚀 4. Cara Menjalankan Aplikasi

### Prasyarat
* Komputer telah terpasang **Node.js** (versi 18 atau lebih baru).

### Langkah Menjalankan:
1. Buka terminal di folder project `d:\aktifapp`.
2. Jalankan perintah:
   ```bash
   npm run dev
   ```
   * Perintah ini akan menjalankan server backend di port `4000` dan frontend Vite di port `5173`.
3. Buka browser:
   * **Layar Guru / Proyektor**: Buka `http://localhost:5173` lalu pilih **Mode Guru**.
   * **Layar Siswa**: Buka `http://localhost:5173` lalu pilih **Mode Siswa** (atau scan QR code di layar proyektor).
   * Siswa di jaringan WiFi sekolah yang sama dapat membuka alamat IP guru (misal: `http://192.168.1.X:5173`).

---

## 📖 5. Panduan Skenario Pembelajaran di Kelas

```
[LANGKAH 1: PERSIAPAN]
Guru membuka Dashboard Guru -> Mengetik Topik Pelajaran -> Menentukan Jumlah Kelompok -> Tampilkan QR Code di Proyektor.

[LANGKAH 2: SISWA BERGABUNG]
Siswa scan QR di proyektor -> Ketik Nama -> Pilih Kelompok -> Langsung masuk ke ruang kelas digital dalam 10 detik.

[LANGKAH 3: PEMICU KEAKTIFAN]
Guru memberi pertanyaan pemantik -> Siswa yang ingin menjawab menekan tombol "BUZZER" di HP.
Guru memberi poin keaktifan dengan 1 ketukan.

[LANGKAH 4: ESTAFET TANTANGAN]
Kelompok 1 yang berhasil menjawab melempar tantangan lanjutan ke Kelompok 3.
Kelompok 3 berembuk cepat untuk menjawab sebelum waktu habis.

[LANGKAH 5: ASESMEN & REKAPITULASI]
Di akhir kelas, energi kelas mencapai 100% dan animasi selebrasi muncul di proyektor.
Guru menekan tombol "Ekspor Excel" untuk menyimpan seluruh data partisipasi sebagai nilai formatif.
```

