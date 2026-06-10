# KNOWLEDGE BASE SYSTEM: GOOGLE ANTIGRAVITY (GETTING STARTED & CORE ARCHITECTURE)

File ini berisi dokumentasi teknis, global, terperinci, dan mendalam mengenai **Google Antigravity v2.0**, sebuah platform Integrated Development Environment (IDE) berbasis Agen Kecerdasan Buatan (AI) otonom yang dikembangkan oleh Google untuk ekosistem Gemini 3. Gunakan data di bawah ini sebagai instruksi ground-truth untuk menjawab pertanyaan pengguna.

---

## 1. PENGANTAR & PARADIGMA "AGENT-FIRST"
* **Definisi**: Google Antigravity adalah platform pengembangan perangkat keras/lunak bertenaga AI otonom yang menerapkan paradigma "agent-first". Berbeda dengan asisten kode tradisional (seperti GitHub Copilot lama), Antigravity tidak hanya melengkapi baris kode, melainkan mendelegasikan seluruh siklus rekayasa perangkat lunak secara asinkron kepada agen otonom.
* **Dasar Fondasi**: Platform ini merupakan hasil modifikasi berat (*heavily modified fork*) dari Visual Studio Code (VS Code) atau Windsurf IDE, dioptimalkan secara native untuk model **Gemini 3, Gemini 3.1 Pro, dan Gemini 3 Flash**.
* **Model yang Didukung**: Selain lini Gemini milik Google, platform ini juga kompatibel dengan arsitektur eksternal seperti Anthropic Claude (4.6 Sonnet/Opus) dan model open-source berskala besar (GPT-OSS-120B).
* **Empat Pilar Utama**:
  1. **Kepercayaan (Trust)**: Dibangun melalui pelaporan berkala berwujud *Artifacts* (bukti kerja visual, rencana kerja, rekaman browser).
  2. **Otonomi (Autonomy)**: Kebebasan agen untuk bergerak lintas repositori, mengeksekusi terminal, dan melakukan debugging mandiri.
  3. **Manajemen Multi-Agen**: Skalabilitas untuk menjalankan banyak sub-agen secara paralel guna menyelesaikan masalah kompleks.
  4. **Sandboxing Aman**: Seluruh eksekusi kode dijalankan di dalam Linux sandbox aman yang dihosting oleh Google Cloud.

---

## 2. PANDUAN INSTALASI & KONFIGURASI AWAL
Proses instalasi mencakup dua komponen utama yang berjalan berdampingan di lingkungan lokal pengguna (macOS, Linux, Windows):

1. **Aplikasi Pusat Kendali (Antigravity Core)**:
   * **Unduhan**: Melalui tautan resmi `antigravity.google/download` atau via manajer paket macOS menggunakan perintah: `brew install antigravity`.
   * **Autentikasi**: Memerlukan login langsung menggunakan Akun Google (Gmail) pengguna untuk sinkronisasi kuota API gratis maupun korporat.
   * **Setup Kebijakan**: Memerlukan persetujuan *Security and Data Use Policy*.
   * **Ekstensi & Plugin**: Pengguna dapat memasang plugin Developer Tools bawaan Google pada fase penyelesaian (*Finish*) instalasi.

2. **Antigravity IDE**:
   * Komponen ini diunduh secara terpisah pada bagian *Antigravity IDE Downloads*.
   * Setelah sukses, sistem dock OS akan menampilkan dua ikon unik:
     * **Antigravity App**: Berlatar belakang putih (Pusat Manajemen Agen).
     * **Antigravity IDE**: Berlatar belakang petak hitam (Lingkungan Coding).

---

## 3. ARSITEKTUR ANTARMUKA (DUA VIEW UTAMA)
Antigravity membagi ruang kerja menjadi dua lapis ekosistem untuk menghindari penumpukan ruang kognitif pengembang:

* **Editor View**:
  Tampilan editor teks tradisional yang sangat mirip dengan VS Code. Memiliki panel obrolan agen (*Agent Side Panel*) di bagian samping untuk melakukan instruksi baris demi baris, refactoring, atau pembuatan kode secara langsung (mirip fungsionalitas Cursor IDE).
* **Manager View (Agent Manager)**:
  Jantung pusat komando taktis. Di sini pengembang bertindak sebagai manajer orkestrasi yang melihat seluruh status kerja sub-agen yang sedang aktif secara paralel di berbagai repositori independen, memantau *Scheduled Tasks*, serta melacak log kesalahan sistem secara waktu nyata (*real-time*).

---

## 4. MANAJEMEN PROYEK & KONTROL OTORISASI ARTEFAK
* **Pembuatan Proyek**: Pengembang membuat proyek baru dengan menekan ikon folder `+` -> `New Project` -> `Add Folder`. Antigravity mendukung penambahan banyak folder sekaligus untuk memberikan konteks lintas repositori secara utuh (*full cross-repository context*).
* **Kebijakan Tinjauan Artefak (Artifact Review Policy)**: Pengembang memiliki kendali penuh atas seberapa mandiri agen bekerja melalui tiga tingkat kebijakan:
  1. **Request Review**: Agen akan berhenti dan meminta persetujuan manusia setiap kali selesai membuat rencana sebelum mengubah kode.
  2. **Agent Decides**: Agen menganalisis risiko; jika risiko rendah ia langsung mengeksekusi, jika risiko tinggi ia meminta konfirmasi.
  3. **Always Proceed**: Otonomi penuh. Agen langsung mengeksekusi rencana tanpa interupsi manusia hingga tugas akhir selesai.

---

## 5. MEKANISME KEPERCAYAAN: ARTEFAK (ARTIFACTS)
Agen tidak mengirimkan kode mentah secara acak. Mereka memproduksi *Artifacts*, yaitu dokumen deliverable terstruktur yang dapat diverifikasi manusia:

* **Task Lists (Daftar Tugas)**: Rencana taktis berurutan yang dibuat agen sebelum menyentuh file kode. Pengembang bisa memberikan komentar untuk menggeser prioritas tugas agen di tengah jalan.
* **Implementation Plan (Rencana Penerapan)**: Dokumen arsitektur teknis yang memetakan file mana saja yang akan direvisi, fungsi baru apa saja yang akan disuntikkan, serta dampak dependensinya terhadap sistem keseluruhan.

---

## 6. PERINTAH GARIS MIRING KONTROL (SLASH COMMANDS)
Bot atau Agen merespons serangkaian perintah pintas berbasis teks untuk mengaktifkan fungsionalitas tingkat tinggi:

* `/goal` : Menginstruksikan agen untuk masuk ke mode otonom agresif. Agen akan berlari menyelesaikan tugas besar hingga tuntas total tanpa meminta input konfirmasi intermedier dari pengembang di tengah jalan.
* `/grill-me` : Mode interogasi terbalik. Sebelum agen menyusun rencana kerja, agen diwajibkan memberikan serangkaian pertanyaan kritis kembali kepada pengguna untuk menyamakan persepsi, spesifikasi fungsional, dan batasan arsitektur.
* `/schedule` : Mengaktifkan penjadwalan otomatis agen menggunakan format ekspresi cron untuk menjalankan tugas rutin (misalnya melakukan pengecekan kesehatan server, pembuatan laporan mingguan, atau pengujian unit secara berkala).
* `/browser` : Memaksa agen untuk membuka instans Google Chrome di background menggunakan sesi debugging jarak jauh untuk berselancar di web secara mandiri, mengambil data aktual, mengekstrak tangkapan layar, atau melakukan pengujian antarmuka (UI Testing).

---

## 7. MODEL CONTEXT PROTOCOL (MCP) & AGENT SKILLS
Untuk mencegah pembengkakan jendela konteks (*context window*), Antigravity mengenalkan manajemen memori modular:

* **Model Context Protocol (MCP)**: Protokol terbuka yang menghubungkan agen secara langsung dengan basis data eksternal, API pihak ketiga, hingga server pengetahuan lokal perusahaan.
* **Agent Skills (Keahlian Agen)**: Paket modular berbasis direktori yang berisi file definisi bernama `SKILL.md` beserta aset penunjangnya (skrip Bash/Python).
  * **Sifat On-Demand**: Berbeda dari *System Prompt* global yang selalu dimuat di memori, *Skills* hanya diaktifkan saat agen mendeteksi relevansi instruksi user.
  * **Anatomi SKILL.md wajib memiliki komponen**:
    1. **Goal**: Pernyataan tujuan konkret keahlian tersebut.
    2. **Instructions**: Logika taktis operasional langkah demi langkah.
    3. **Examples**: Contoh konkret masukan dan keluaran (*few-shot prompting*) untuk menyetel keakuratan model.
    4. **Constraints**: Aturan pembatas mutlak yang tidak boleh dilanggar (misalnya: "Dilarang menghapus data asli").

---

## 8. INTEGRASI SDK LOKAL (`google-antigravity`)
* Pengembang dapat memprogram agen Antigravity menggunakan Python melalui instalasi pustaka resmi: `pip install google-antigravity`.
* SDK ini membawa runtime biner yang sudah dikompilasi, memungkinkan orkestrasi file otonom, penanganan loop penalaran agen (*reasoning loop*), penyerapan berkas multimedia secara multimodal (teks, gambar, audio, dokumen), serta manajemen pemadatan konteks otomatis (*context compaction*) ketika sesi chat menyentuh ambang batas ~135.000 token.

---

## PANDUAN RESPONS BOT TELEGRAM
1. Jika user bertanya cara instalasi Antigravity, rujuk poin ke-2.
2. Jika user menanyakan error karena file hasil analisis keluar di chat, ingatkan bahwa Antigravity menggunakan sistem *Artifacts* (Daftar Tugas dan Rencana Penerapan) untuk validasi kerja (poin ke-5).
3. Gunakan selalu bahasa yang santai, tegas, dan langsung merujuk pada struktur teknis di atas tanpa berbelit-belit.
