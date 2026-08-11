# CODkan — SECURITY.md

**Version:** 1.0  
**Scope:** MVP  
**Security Goal:** Menjaga akun, kontak, lokasi, listing, tawaran, dan deal tetap privat serta hanya dapat diakses pihak yang berhak.

## 1. Prinsip Keamanan

CODkan menggunakan prinsip:

- Semua koneksi wajib HTTPS.
- Semua aksi sensitif divalidasi di backend.
- Frontend tidak boleh menjadi sumber kebenaran untuk otorisasi.
- Kontak dan lokasi presisi tidak boleh dikirim sebelum diperlukan.
- Data sensitif tidak boleh masuk ke log, analytics, URL, atau cache.
- Hak akses mengikuti prinsip minimum access.
- Semua operasi penting harus aman terhadap request ganda dan manipulasi ID.

## 2. Authentication

MVP menggunakan nomor HP, OTP, dan session/token setelah verifikasi berhasil.

Wajib:
- OTP memiliki masa berlaku singkat.
- OTP hanya dapat digunakan sekali.
- Rate limit per nomor HP.
- Rate limit per IP/device.
- Batasi percobaan OTP salah.
- Session memiliki expiry.
- Logout harus mencabut session aktif bila sistem mendukungnya.

Jangan menyimpan OTP plaintext dalam waktu lama, mengirim OTP lewat query parameter, atau menulis OTP ke application log.

## 3. Authorization

Semua endpoint harus memeriksa identitas dari session yang sudah diverifikasi.

Jangan percaya `buyer_id`, `seller_id`, atau `user_id` yang dikirim frontend sebagai bukti identitas.

Contoh: pada `POST /listings/:id/offers`, backend harus mengambil `buyer_id` dari session, bukan dari body request.

Setiap resource harus diperiksa kepemilikannya:
- Hanya seller listing yang dapat mengedit listing.
- Hanya seller listing yang dapat menerima tawaran.
- Hanya buyer terkait yang dapat membaca tawarannya.
- Hanya dua pihak dalam deal yang dapat membuka Deal Room.
- Hanya dua pihak deal yang dapat membuka kontak.

## 4. Contact Unlock

Nomor HP dan kontak tidak boleh berada di payload listing publik.

Sebelum deal:
`Kontak Penjual: terkunci`
`Kontak Pembeli: terkunci`

Setelah deal gunakan endpoint seperti:
`GET /deals/:dealId/contact`

Backend wajib memeriksa:
1. User login.
2. Deal valid.
3. User adalah buyer atau seller pada deal tersebut.
4. Deal berada pada state yang mengizinkan contact unlock.

Jika gagal, respons `403 Forbidden`.

### Penyimpanan Kontak

Nomor HP sebaiknya:
- Dienkripsi saat tersimpan.
- Didekripsi hanya ketika benar-benar dibutuhkan.
- Tidak dimasukkan ke analytics.
- Tidak dimasukkan ke error monitoring.
- Tidak ditulis ke application log.

Kunci enkripsi jangan disimpan di database yang sama dengan data terenkripsi.

Endpoint kontak harus menggunakan:
`Cache-Control: no-store`

Jangan menggunakan URL seperti `/contact?phone=081234567890`. Gunakan ID deal saja.

## 5. Risiko Setelah Kontak Dibuka

Setelah kontak ditampilkan secara sah kepada pengguna, aplikasi tidak dapat mencegah screenshot, copy nomor, penyimpanan nomor, atau pembagian manual. Karena itu contact unlock hanya boleh terjadi setelah deal resmi terbentuk.

## 6. Location Privacy

Lokasi presisi merupakan data sensitif.

Sebelum deal, tampilkan hanya area umum dan jarak perkiraan, misalnya:
`Somba Opu, Gowa`
`Sekitar 2 km`

Jangan tampilkan latitude, longitude, alamat rumah, koordinat internal, atau metadata GPS foto.

Endpoint publik listing tidak boleh mengembalikan koordinat presisi seller. Perhitungan radius dilakukan di backend/database.

## 7. Photo Security

Saat upload foto:
- Batasi ukuran file.
- Validasi MIME type.
- Jangan hanya percaya ekstensi file.
- Generate ulang versi gambar yang digunakan aplikasi.
- Strip EXIF dan GPS metadata.
- Gunakan nama file acak/UUID.
- Jangan gunakan nama file asli sebagai storage key.
- Tolak file executable atau format tidak didukung.

Format MVP:
- `image/jpeg`
- `image/png`
- `image/webp`

## 8. Listing Security

User hanya boleh membuat, mengedit, dan menghapus listing miliknya.

Backend harus mengabaikan seller ID dari client. Seller ID selalu berasal dari session.

## 9. Offer Security

Aturan tiga tawaran harus ditegakkan oleh backend/database. Frontend hanya menampilkan status.

Backend menghitung `offers_used + 1` secara atomik. Jangan percaya `attempt_number` dari client.

Gunakan unique constraint dan transaction agar user tidak dapat mengirim beberapa request bersamaan untuk melewati limit.

Contoh:
`UNIQUE(listing_id, buyer_id, attempt_number)`

Setelah tawaran ketiga ditolak:
`buyer_listing_state.status = exhausted`

Backend kemudian menolak semua tawaran berikutnya.

## 10. Kick Security

Seller dapat kick buyer dari listing miliknya.

Backend harus memeriksa:
- Seller memang pemilik listing.
- Buyer valid.
- Tidak ada deal aktif yang sedang memerlukan penyelesaian.
- Request tidak berulang secara tidak perlu.

Kick harus dicatat: actor, buyer, listing, timestamp, dan reason.

Buyer yang sudah `kicked` tidak boleh kembali mengakses listing sebagai buyer hanya dengan mengganti URL.

## 11. Deal Security

Deal hanya dapat dibuat melalui acceptance yang valid.

Jangan menyediakan endpoint bebas seperti `POST /deals` yang menerima seller/buyer/listing arbitrer dari client.

Deal harus dibuat server-side dari tawaran yang diterima.

Critical operation harus menggunakan database transaction. Satu listing hanya boleh mempunyai satu deal aktif.

## 12. Prevent Double Deal

Risiko: seller menerima dua tawaran hampir bersamaan.

Mitigasi:
- Lock listing pada transaction.
- Cek deal aktif.
- Gunakan unique constraint/partial unique index.
- Setelah satu deal berhasil, tawaran lain tidak dapat diterima.

## 13. Deal Price Integrity

Harga final deal harus berasal dari offer yang diterima.

Setelah deal dibuat, `final_price` tidak boleh diedit langsung oleh client.

Jika terjadi negosiasi ulang, buat flow baru yang eksplisit. Jangan overwrite harga lama secara diam-diam.

## 14. COD Only

CODkan tidak menyimpan rekening bank, kartu, saldo, wallet, payment token, atau transfer instruction.

Platform tidak menandai transaksi sebagai `paid`.

Status yang benar:
- `deal`
- `scheduled`
- `completed`
- `cancelled`

`completed` berarti kedua pihak mengonfirmasi pertukaran barang secara langsung.

## 15. API Security

Semua endpoint mutation wajib:
- Authentication.
- Authorization.
- Input validation.
- Rate limiting untuk endpoint rawan abuse.
- Consistent error handling.

Jangan mengungkap stack trace, SQL query, secret, internal path, database ID yang tidak diperlukan, atau detail konfigurasi server.

## 16. IDOR Protection

Jangan menganggap UUID saja cukup aman.

Contoh serangan:
`/deals/UUID-MILIK-ORANG-LAIN`

Backend tetap harus memastikan user merupakan participant deal.

Wajib diuji:
- Listing private action.
- Offer.
- Deal.
- Contact.
- COD schedule.
- Report.
- Conversation.

## 17. Database Security

Jika menggunakan Supabase/PostgreSQL, aktifkan Row Level Security pada tabel user-related.

Minimal:
- users
- user_locations
- listings
- offers
- buyer_listing_state
- deals
- cod_schedules
- conversations
- messages
- favorites
- reports

Service role key hanya boleh digunakan di server dan tidak pernah diekspos ke frontend.

## 18. Secrets

Simpan secret hanya di environment variables/server secret store.

Contoh:
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `OTP_PROVIDER_SECRET`

Jangan commit `.env`, menaruh secret di client bundle, repository publik, atau console browser.

Sediakan `.env.example` tanpa nilai asli.

## 19. Rate Limiting

Minimal rate limit pada:
- Request OTP.
- Verify OTP.
- Create listing.
- Upload.
- Send offer.
- Chat/message.
- Report.
- Contact unlock.

Gunakan kombinasi `user_id`, IP, device/session, dan endpoint.

## 20. Spam & Abuse

Proteksi sederhana MVP:
- Limit listing akun baru.
- Limit offer per waktu.
- Limit message frequency.
- Duplicate listing detection sederhana.
- Report user.
- Report listing.
- Block user.
- Temporary restriction.

Tidak perlu membuat sistem anti-fraud kompleks pada MVP.

## 21. Chat Security

Jika chat tersedia:
- Escape/sanitize content.
- Jangan render HTML mentah.
- Batasi panjang pesan.
- Rate limit.
- Hindari automatic link execution.
- Jangan membuat preview URL dari endpoint internal/private.

Sebelum deal, sistem dapat memperingatkan jika user mencoba mengirim rekening atau meminta transfer.

## 22. Web Security

Wajib:
- HTTPS.
- Secure cookies.
- HttpOnly cookies jika session berbasis cookie.
- SameSite policy sesuai kebutuhan.
- CSRF protection jika arsitektur membutuhkan.
- CSP.
- X-Content-Type-Options.
- Referrer-Policy.
- Frame protection.

Contoh baseline:
`Content-Security-Policy: default-src 'self'`
`X-Content-Type-Options: nosniff`
`Referrer-Policy: strict-origin-when-cross-origin`

CSP lengkap harus disesuaikan dengan CDN, maps, storage, dan service eksternal yang benar-benar dipakai.

## 23. Cache Security

Jangan cache response yang mengandung nomor HP, lokasi presisi, Deal Room private, conversation, atau session-specific data.

Gunakan:
`Cache-Control: private, no-store`

## 24. Logging

Boleh log:
- user_id
- action
- resource_id
- timestamp
- result

Jangan log:
- OTP
- password
- phone plaintext
- precise location
- session token
- authorization header
- encryption key

## 25. Audit Log

Minimal audit untuk:
- Offer accepted.
- Offer rejected.
- Buyer kicked.
- Deal created.
- Deal cancelled.
- Contact unlocked.
- Listing removed by admin.
- User suspended.
- Report resolved.

Audit log tidak boleh dapat diedit user biasa.

## 26. Session Security

Session harus expire, dapat dicabut, tidak ditempatkan di URL, tidak disimpan ke analytics, dan menggunakan cookie aman jika cookie-based.

Untuk aksi sensitif tertentu, server dapat memastikan session masih valid/recent.

## 27. PWA Security

Service worker tidak boleh cache endpoint kontak, Deal Room private secara publik, token, atau response sensitif tanpa kontrol.

Offline mode hanya untuk shell/static content.

Aksi seperti offer, accept, deal, contact unlock, dan completion harus membutuhkan respons server sukses sebelum UI menganggap operasi selesai.

## 28. Backup

Database production membutuhkan backup rutin.

Backup harus melindungi user, listing, offer, deal, dan moderation data dengan kontrol akses yang sama atau lebih ketat dari database utama.

## 29. Admin Security

Admin account wajib memiliki:
- Role terpisah.
- Endpoint/authorization khusus admin.
- Audit log untuk semua tindakan admin.
- Rate limit.
- Session expiry.

MFA disarankan untuk admin production.

## 30. Security Tests Sebelum Production

### Authentication
- OTP brute force.
- OTP reuse.
- Expired OTP.
- Session invalid.

### Authorization
- Edit listing user lain.
- Accept offer milik seller lain.
- Open deal user lain.
- Open contact user lain.
- Change COD schedule user lain.

### Negotiation
- Offer ke-4.
- Request tawaran paralel.
- Duplicate offer.
- Accept dua offer bersamaan.
- Tawar listing setelah kicked.

### Privacy
- Nomor muncul pada listing API.
- Koordinat seller muncul pada API.
- EXIF GPS pada upload.
- Nomor muncul pada log.
- Kontak tersimpan di browser cache.

### Upload
- Fake MIME.
- Oversized file.
- Script disguised as image.

### Web
- XSS.
- CSRF bila relevan.
- IDOR.
- Broken access control.
- Rate-limit bypass.

## 31. MVP Security Checklist

- [ ] HTTPS aktif.
- [ ] OTP rate limit.
- [ ] Session aman.
- [ ] RLS/authorization aktif.
- [ ] Service key tidak berada di frontend.
- [ ] Contact unlock hanya setelah deal.
- [ ] Endpoint kontak `no-store`.
- [ ] Lokasi presisi tidak publik.
- [ ] EXIF foto dihapus.
- [ ] Offer maksimum 3 ditegakkan server.
- [ ] Double-deal dicegah database.
- [ ] Kick enforced di backend.
- [ ] Semua mutation melakukan authorization.
- [ ] Upload divalidasi.
- [ ] Secret tidak berada di repository.
- [ ] Sensitive data tidak masuk log.
- [ ] Report/block tersedia.
- [ ] Admin action memiliki audit log.
- [ ] Security test utama lulus.

## 32. Security Invariants

Aturan ini tidak boleh dilanggar:

1. User tidak boleh mengakses kontak sebelum deal.
2. User hanya boleh mengakses deal yang melibatkan dirinya.
3. Lokasi presisi seller tidak boleh tersedia melalui listing publik.
4. Buyer tidak dapat membuat lebih dari 3 tawaran pada listing yang sama.
5. Buyer kicked/exhausted tidak dapat melewati pembatasan melalui URL/API.
6. Satu listing tidak dapat memiliki dua deal aktif.
7. Harga final tidak dapat dimanipulasi client.
8. Secret tidak pernah dikirim ke browser.
9. OTP/token tidak pernah masuk log.
10. Semua aturan kritis ditegakkan server/database.

## 33. Threat Model Ringkas

| Risiko | Proteksi |
|---|---|
| Penyadapan jaringan | HTTPS/TLS |
| Kebocoran kontak | Contact unlock + authorization + encryption |
| Tebak ID resource | Server-side authorization / IDOR protection |
| Manipulasi limit tawar | Transaction + database constraints |
| Dua buyer deal bersamaan | Row lock + unique active deal |
| Akun diambil alih | OTP limits + secure session |
| Lokasi rumah bocor | Generalized location + private coordinates |
| Foto membocorkan GPS | Strip EXIF |
| Spam | Rate limiting |
| API key bocor | Server-side secrets |
| XSS | Output escaping + sanitization |
| Abuse seller/buyer | Report + block + audit |
| Data sensitif tersimpan cache | `Cache-Control: no-store` |

Security target CODkan bukan membuat sistem rumit, tetapi memastikan setiap data sensitif hanya tersedia kepada orang yang tepat, pada waktu yang tepat, melalui backend yang memverifikasi setiap akses.
