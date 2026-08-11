# CODkan --- Product Requirements Document (PRD)

**Version:** 1.0\
**Product Type:** Local-first C2C marketplace / PWA\
**Core Model:** Local discovery → 3x negotiation → deal → contact unlock
→ COD\
**Payment Policy:** COD only. No transfer, wallet, escrow, or in-app
payment.

## 1. Product Overview

CODkan adalah marketplace lokal untuk mempertemukan penjual dan pembeli
yang berada di daerah yang sama. Produk berfokus pada transaksi tatap
muka: pengguna menemukan barang di sekitar, menawar maksimal tiga kali,
mencapai kesepakatan, lalu melakukan COD.

CODkan bukan marketplace dengan checkout, pengiriman, rekening bersama,
saldo, atau payment gateway. Platform berfungsi sebagai discovery,
negotiation, trust, dan coordination layer untuk transaksi lokal.

Core loop:

`Temukan barang sekitar → Lihat detail → Tawar → Deal → Kontak terbuka → Atur COD → Bertemu → Konfirmasi → Reputasi`

## 2. Product Principles

1.  **Local first** --- barang yang relevan secara geografis
    diprioritaskan.
2.  **COD only** --- tidak ada mekanisme pembayaran transfer di
    platform.
3.  **Three offers, not endless bargaining** --- pembeli maksimal
    memiliki tiga kesempatan menawar per listing.
4.  **Privacy before deal** --- kontak dan lokasi presisi tidak dibuka
    sebelum kesepakatan.
5.  **Trust through behavior** --- reputasi didasarkan pada transaksi
    COD dan perilaku nyata.
6.  **Low friction** --- memasang barang dan menawar harus cepat.
7.  **No marketplace bloat** --- tidak ada keranjang, ongkir, voucher,
    saldo, atau fitur e-commerce yang tidak mendukung transaksi COD.

## 3. Target Users

### Penjual

Pengguna yang ingin menjual barang secara lokal tanpa proses pengiriman.

### Pembeli

Pengguna yang ingin menemukan barang dekat lokasinya, memeriksa barang
secara langsung, menawar, dan membayar saat COD.

### Initial Categories

-   Smartphone dan elektronik
-   Komputer/gadget
-   Fashion
-   Furnitur
-   Peralatan rumah
-   Hobi/koleksi
-   Otomotif dan parts yang diperbolehkan
-   Peralatan usaha
-   Hasil kebun/produk lokal yang sesuai kebijakan platform
-   Kategori umum lainnya yang aman dan legal

## 4. Geographic Rules

-   Listing hanya didistribusikan kepada pengguna dalam wilayah/radius
    yang diizinkan.
-   Sistem menyimpan koordinat untuk perhitungan jarak, tetapi tidak
    menampilkan titik presisi penjual kepada publik.
-   Tampilan publik hanya menunjukkan area umum, misalnya
    `Somba Opu, Gowa`.
-   Penjual dapat menentukan radius distribusi listing.
-   Pembeli harus memenuhi aturan area listing sebelum dapat menawar.
-   Lokasi COD dapat berbeda dari alamat penjual dan sebaiknya merupakan
    tempat umum.

## 5. Authentication & Account

MVP: - Login/daftar dengan nomor telepon. - OTP. - Nama tampilan. - Foto
profil opsional. - Area domisili. - Riwayat listing. - Riwayat
transaksi. - Reputasi. - Daftar akun yang diblokir.

Nomor telepon tidak ditampilkan secara publik.

## 6. Listing

Penjual dapat membuat listing dengan: - Judul. - Deskripsi. - Harga
awal. - Kategori. - Kondisi barang. - Foto utama dan galeri. - Video
opsional pada fase lanjutan. - Area. - Radius distribusi. - Opsi harga:
bisa ditawar / harga pas. - Status listing.

Status: - `draft` - `active` - `reserved` - `sold` - `hidden` -
`expired` - `removed`

Listing aktif harus memiliki satu penjual dan satu harga publik.

## 7. Local Discovery

Beranda menampilkan listing berdasarkan relevansi lokasi.

Filter: - Kategori. - Jarak. - Rentang harga. - Kondisi. - Terbaru. -
Terdekat. - Bisa ditawar. - Harga pas.

Search: - Judul. - Kategori. - Kata kunci deskripsi.

Informasi kartu listing: - Foto. - Harga. - Judul. - Area umum. - Jarak
perkiraan. - Kondisi. - Badge `Bisa Ditawar` jika berlaku.

## 8. Three-Offer Negotiation

### Aturan

Setiap pembeli memperoleh maksimal **3 penawaran** pada satu listing.

Contoh:

`Harga: Rp1.500.000`\
`Tawaran #1: Rp1.200.000 → Ditolak`\
`Tawaran #2: Rp1.300.000 → Ditolak`\
`Tawaran #3: Rp1.400.000 → Diterima`

Setiap offer immutable setelah dikirim.

### Seller Actions

Penjual dapat: - Terima. - Tolak. - Counter-offer. - Kick penawar jika
diperlukan.

### Counter-offer

Counter-offer penjual tidak mengurangi jatah tiga penawaran pembeli.
Pembeli dapat menerima counter-offer atau mengirim penawaran berikutnya
selama masih memiliki kesempatan.

### Offer State

-   `pending`
-   `accepted`
-   `rejected`
-   `countered`
-   `expired`
-   `cancelled`

### Exhausted Offers

Setelah penawaran ketiga ditolak: - Hubungan buyer-listing menjadi
`kicked/exhausted`. - Listing tidak lagi muncul kepada pembeli
tersebut. - Pembeli tidak dapat membuka detail melalui URL langsung. -
Membuat sesi baru tidak mengembalikan jatah karena rule terikat ke
account ID + listing ID.

### Manual Kick

Penjual dapat mengeluarkan pembeli lebih awal untuk spam/abuse. Tindakan
dicatat untuk audit dan dapat dilaporkan jika disalahgunakan.

## 9. Deal

Deal terbentuk ketika: - Penjual menerima offer pembeli; atau - Pembeli
menerima counter-offer penjual.

Saat deal: - Harga final dibekukan. - Offer lain dapat dibekukan
sementara. - Listing menjadi `reserved`. - Deal Room dibuat. - Kontak
kedua pihak dapat dibuka. - Kedua pihak dapat mengatur COD.

Satu listing hanya boleh memiliki satu deal aktif pada satu waktu.

## 10. Deal Room

Deal Room berisi: - Barang. - Harga kesepakatan. - Penjual. - Pembeli. -
Status. - Kontak setelah unlock. - Area. - Tanggal COD. - Jam COD. -
Titik COD. - Catatan pertemuan. - Tombol buka navigasi/maps. -
Konfirmasi selesai. - Pembatalan. - Report/no-show.

State:
`deal_created → scheduling → scheduled → meeting → completed/cancelled/disputed`

## 11. Contact Unlock

Sebelum deal: - Nomor telepon disembunyikan. - WhatsApp disembunyikan. -
Lokasi presisi disembunyikan.

Setelah deal: - Kontak penjual dibuka kepada pembeli. - Kontak pembeli
dibuka kepada penjual. - Informasi hanya tersedia untuk pihak deal.

## 12. COD Scheduling

Kedua pihak dapat menyepakati: - Tanggal. - Jam. - Titik temu. -
Catatan.

Platform mendorong titik publik yang aman.

Tidak ada tombol transfer atau instruksi rekening. UI harus selalu
mengkomunikasikan bahwa pembayaran dilakukan saat bertemu setelah
pembeli memeriksa barang.

## 13. Transaction Completion

Penjual: `Barang sudah diserahkan`

Pembeli: `Barang sudah diterima`

Jika kedua pihak mengonfirmasi: - Deal → `completed`. - Listing →
`sold`. - Reputasi diperbarui. - Kedua pihak dapat memberikan feedback.

Jika salah satu tidak mengonfirmasi, sistem mempertahankan status
pending dan menyediakan mekanisme follow-up/report.

## 14. Reputation

Reputasi lebih menekankan data perilaku daripada angka bintang.

Profil dapat menampilkan: - Jumlah COD selesai. - Jumlah penjualan. -
Jumlah pembelian. - Deal dibatalkan. - No-show terverifikasi. - Lama
bergabung. - Verification status.

Feedback tags: - Barang sesuai. - Tepat waktu. - Respons cepat. -
Komunikasi baik. - Lokasi mudah ditemukan.

## 15. No-show & Cancellation

Alasan pembatalan: - Penjual membatalkan. - Pembeli membatalkan. -
Barang tidak sesuai. - Tidak hadir. - Tidak dapat menghubungi pihak
lain. - Lainnya.

No-show tidak boleh otomatis menghukum akun hanya berdasarkan satu
laporan. Sistem menyimpan laporan, bukti/context yang tersedia, pola
kejadian, dan hasil moderasi.

Repeated abuse dapat menghasilkan: - Warning. - Pembatasan tawaran. -
Pembatasan listing. - Temporary suspension. - Permanent ban.

## 16. Chat

MVP dapat menggunakan chat internal sederhana.

Tujuan: - Bertanya kondisi barang. - Meminta detail tambahan. -
Negosiasi terstruktur tetap dilakukan melalui Offer UI.

Sebelum deal, sistem dapat mendeteksi/membatasi upaya berbagi nomor
telepon, rekening, dan link eksternal untuk mengurangi bypass.

Setelah deal, pembatasan kontak dapat dilonggarkan.

## 17. Favorites

Pembeli dapat menyimpan listing.

Notifikasi relevan: - Harga berubah. - Listing terjual. - Listing tidak
tersedia.

## 18. Notifications

Event utama: - Offer masuk. - Offer diterima. - Offer ditolak. -
Counter-offer. - Kesempatan tawar tersisa. - Deal terbentuk. -
Permintaan jadwal COD. - Jadwal disetujui. - Perubahan jadwal. -
Pengingat COD. - Pembatalan. - Listing terjual.

## 19. Safety & Moderation

-   Report listing.
-   Report user.
-   Block user.
-   Moderasi kategori terlarang.
-   Rate limiting.
-   Anti-spam.
-   Duplicate listing detection.
-   Audit log untuk tindakan sensitif.
-   Suspicious behavior scoring.
-   Kontak privat sebelum deal.
-   Lokasi presisi privat sebelum diperlukan.

## 20. Admin

Admin dashboard: - User management. - Listing moderation. - Report
queue. - Deal/report inspection. - Category management. - Area
management. - Ban/suspension. - Audit log. - Basic analytics.

Admin tidak dapat mengubah harga deal secara sembarangan.

## 21. MVP Scope

MVP wajib: - Authentication. - Profile. - Location/area. - Local feed. -
Search/filter. - Create/edit listing. - Listing detail. - 3x offer
engine. - Accept/reject/counter. - Kick/exhaust. - Deal creation. -
Contact unlock. - Deal Room. - COD scheduling. - Completion
confirmation. - Basic reputation. - Report/block. - Notifications. -
Admin moderation.

Tidak termasuk MVP: - Payment gateway. - Wallet. - Transfer. -
Shipping. - Checkout cart. - Voucher. - Affiliate. - Livestream
commerce.

## 22. Success Metrics

-   Listing activation rate.
-   Offer/listing ratio.
-   Offer acceptance rate.
-   Deal creation rate.
-   COD completion rate.
-   Median time listing → deal.
-   Cancellation rate.
-   No-show rate.
-   Repeat buyer/seller rate.
-   Report rate per 1,000 deals.
-   Percentage of users finding listings within desired radius.

North Star candidate:

**Completed COD transactions per weekly active local market.**

## 23. Monetization Options

Monetisasi tidak perlu masuk MVP.

Potensi: - Boost listing. - Featured listing per area. - Seller Pro. -
Higher active listing limit. - Business storefront. - Verified seller
subscription.

Jangan mengambil komisi pembayaran jika CODkan tidak memproses
pembayaran.

## 24. Product Positioning

**CODkan --- Ketemu. Tawar. Deal.**

Produk harus terasa seperti pasar lokal digital yang terstruktur, bukan
clone marketplace nasional.
