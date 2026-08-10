# CODkan --- DESIGN.md

**Design Direction:** Local, direct, trustworthy, utilitarian-modern\
**Platform:** Mobile-first PWA\
**Primary Interaction:** Browse → Offer → Deal → COD

## 1. Design Objective

UI CODkan harus membuat pengguna memahami tiga hal dalam beberapa detik:

1.  Barang berada di sekitar mereka.
2.  Barang dapat ditawar maksimal tiga kali.
3.  Transaksi selesai dengan COD, bukan transfer.

Desain tidak boleh terasa seperti template marketplace generik atau
dashboard AI.

## 2. Anti AI-Slop Rules

Hindari: - Gradient dekoratif tanpa fungsi. - Glassmorphism
berlebihan. - Neon glow. - Hero marketing besar di dalam aplikasi. -
Card di dalam card tanpa alasan. - Border radius ekstrem di semua
elemen. - Ikon dekoratif acak. - Emoji sebagai ikon produk. - Statistik
palsu. - Copywriting hiperbolik. - Layout dashboard SaaS untuk
pengalaman marketplace. - Floating blobs, mesh gradients, dan ilustrasi
generik. - Animasi pada setiap elemen. - Terlalu banyak badge.

Gunakan: - Tipografi kuat. - Spacing konsisten. - Hierarki harga \>
barang \> lokasi \> metadata. - Foto barang sebagai elemen visual
utama. - Warna status hanya ketika mempunyai arti. - Motion pendek yang
memberi feedback.

## 3. Visual Personality

CODkan harus terasa: - Dekat. - Cepat. - Aman. - Tidak formal
berlebihan. - Sedikit urban/local-market. - Mudah dipahami pengguna
non-teknis.

Visual tidak boleh terlihat mewah sampai mengurangi kesan marketplace
lokal.

## 4. Color System

Gunakan sistem warna berbasis fungsi, bukan dekorasi.

### Primary

Warna utama dapat berupa hijau gelap/medium yang berasosiasi dengan aksi
positif, lokal, dan COD.

Contoh direction: - Primary 700: `#176B45` - Primary 600: `#1E7C51` -
Primary 100: `#DDF3E7`

### Neutral

-   Ink: `#161A17`
-   Secondary text: `#606862`
-   Border: `#DDE2DE`
-   Surface: `#FFFFFF`
-   Subtle surface: `#F5F7F5`
-   App background: `#F0F3F0`

### Semantic

-   Success: hijau.
-   Warning: amber.
-   Danger: merah.
-   Info: biru netral.

Jangan menggunakan warna danger untuk sekadar dekorasi.

## 5. Typography

Gunakan sans-serif modern yang memiliki angka harga jelas dan performa
web baik.

Hierarchy: - Display/Price: 28--36px, semibold/bold. - Page title:
24--28px. - Section heading: 18--20px. - Card title: 15--17px. - Body:
14--16px. - Metadata: 12--14px.

Harga harus lebih dominan daripada judul listing.

## 6. Layout

### Mobile

-   Base width: 100%.
-   Content padding: 16px.
-   Grid gap: 12px.
-   Listing feed: 2 columns untuk layar yang cukup, 1 column untuk
    konteks tertentu.
-   Bottom navigation.
-   Sticky action pada halaman listing.

### Tablet/Desktop

-   Max content width sekitar 1200--1320px.
-   Feed menggunakan responsive grid.
-   Filter dapat berpindah ke sidebar.
-   Detail listing menggunakan image area + information column.
-   Jangan memperbesar komponen mobile secara mentah.

## 7. Navigation

Mobile bottom navigation: - Beranda - Cari - Jual - Aktivitas - Profil

`Jual` harus mudah ditemukan tetapi tidak perlu dibuat floating button
yang berlebihan.

Desktop: - Logo. - Search. - Area. - Jual Barang. - Aktivitas. - Profil.

## 8. Home

Urutan: 1. Compact top bar. 2. Lokasi aktif. 3. Search. 4. Category
shortcuts. 5. Filter chips. 6. Local listing grid.

Tidak membutuhkan hero banner.

Contoh header:

`CODkan` `Somba Opu, Gowa ▾`

Search: `Cari barang di sekitar...`

Filter: `Terdekat` `Bisa Ditawar` `Bekas` `Harga`

## 9. Listing Card

Prioritas: 1. Foto. 2. Harga. 3. Judul. 4. Lokasi + jarak. 5.
Kondisi/tawar.

Contoh:

`[PHOTO]` `Rp1.500.000` `iPhone 13 128GB` `Somba Opu · 2,4 km`
`Bisa Ditawar`

Jangan menampilkan terlalu banyak metadata pada card.

## 10. Listing Detail

Mobile structure: - Image gallery. - Harga. - Badge `Bisa Ditawar`. -
Judul. - Area + approximate distance. - Kondisi. - Deskripsi. - Seller
compact profile. - Safety note. - Sticky bottom CTA.

Sticky CTA:

`Tawar Harga` \| `Chat`

Jika harga pas:

`Ajukan COD` \| `Chat`

## 11. Offer UX

Offer sheet/modal harus menjadi salah satu komponen paling khas.

Header: `Tawar harga`

Context: `Harga penjual Rp1.500.000`

Input: `Rp [____________]`

Indicator: `Kesempatan tawar` `● ● ●`

CTA: `Kirim Tawaran 1/3`

Setelah ditolak:

`Tawaran Rp1.200.000 ditolak` `Sisa 2 kesempatan` `× ● ●`

Pada kesempatan terakhir, gunakan warning yang jelas tetapi tidak
dramatis:

`Ini kesempatan tawar terakhir untuk barang ini.`

## 12. Seller Offer Inbox

Setiap offer menampilkan: - Buyer. - Reputation summary. - Nilai
tawaran. - Harga listing. - Nomor attempt. - Timestamp.

Actions: `Terima` `Tolak` `Harga Balik`

Kick berada dalam overflow/context menu agar bukan tindakan utama.

## 13. Deal Moment

Saat offer diterima, tampilkan transition singkat dan halaman:

`DEAL` `Rp1.400.000`

`Sekarang atur waktu dan tempat COD.`

Jangan gunakan confetti berlebihan. Micro-animation 300--500ms sudah
cukup.

## 14. Deal Room

Header: `COD dengan Fajar`

Deal card: - Thumbnail. - Barang. - Harga final. - Status.

Timeline: `Deal dibuat` `Atur lokasi` `Jadwal disepakati` `COD`
`Selesai`

Sections: - Kontak. - Jadwal. - Titik temu. - Catatan. - Safety
guidance.

Primary CTA berubah berdasarkan state.

## 15. COD Location

Map bukan satu-satunya UI. Selalu berikan versi tekstual agar mudah
dibaca.

`Titik COD` `Alfamart Jl. ...` `1,8 km dari kamu`

Actions: `Setujui Titik` `Usulkan Tempat Lain` `Buka Maps`

Alamat rumah tidak disarankan sebagai default.

## 16. COD-only Communication

Pada titik kritis gunakan pesan:

`Bayar saat bertemu setelah barang diperiksa.`

Jika chat mendeteksi pola rekening/transfer sebelum deal, UI dapat
memberikan warning.

Jangan memenuhi aplikasi dengan warning permanen; tampilkan secara
kontekstual.

## 17. Reputation UI

Hindari fokus tunggal pada bintang.

Contoh:

`24 COD selesai` `0 no-show` `Bergabung 8 bulan`

Tags: `Barang sesuai` `Tepat waktu` `Respons cepat`

## 18. Empty States

Harus actionable.

Tidak ada barang: `Belum ada barang di radius 5 km.` `Perluas ke 10 km`

Offer habis: `3 kesempatan tawarmu sudah digunakan.`
`Listing ini tidak lagi tersedia untuk akunmu.`

Tidak ada listing: `Belum ada barang yang kamu jual.`
`Pasang barang pertama`

## 19. Motion

Gunakan motion untuk: - Page transition ringan. - Bottom sheet. - Offer
state. - Deal state. - Favorite. - Filter changes. - Skeleton → content.

Durasi umum: - Micro: 120--180ms. - Component: 180--260ms. - Page/Deal
transition: 250--500ms.

Respect `prefers-reduced-motion`.

Scroll animation hanya untuk elemen yang memang memperoleh manfaat. Feed
tidak boleh terasa lambat karena stagger animation.

## 20. Components

Core component set: - Button. - Icon button. - Text field. - Currency
input. - Search input. - Chips. - Tabs. - Bottom sheet. -
Modal/dialog. - Listing card. - Seller card. - Offer card. - Offer
indicator. - Deal card. - Timeline. - Location row. - Notification
row. - Empty state. - Skeleton. - Toast. - Confirmation dialog.

Gunakan icon library konsisten; jangan campur banyak gaya ikon.

## 21. Accessibility

-   Minimum touch target 44×44px.
-   Contrast WCAG AA.
-   Visible focus state.
-   Label input eksplisit.
-   Jangan mengandalkan warna saja untuk status.
-   Screen reader label untuk icon-only controls.
-   Keyboard navigation desktop.
-   Reduced motion.
-   Error ditampilkan dekat field terkait.

## 22. Responsive Hierarchy

Prioritas mobile: `Foto → Harga → Judul → Lokasi → Tawar`

Prioritas seller: `Tawaran → Buyer trust → Actions`

Prioritas Deal Room: `Harga deal → Jadwal → Lokasi → Kontak → Status`

## 23. UX Copy Principles

Pendek dan konkret.

Gunakan: - `Tawar harga` - `Sisa 2 tawaran` - `Deal` - `Atur COD` -
`Barang sudah diterima` - `Tandai terjual`

Hindari: - jargon sistem. - paragraf panjang di dialog. - bahasa
korporat. - copy generik seperti "Unlock the power of...".

## 24. Brand

Wordmark: **CODkan**

Primary tagline: **Ketemu. Tawar. Deal.**

Brand harus dapat hidup sebagai wordmark sederhana tanpa membutuhkan
maskot atau ilustrasi AI.
