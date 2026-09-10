# Formulir supplier tanpa login

1. Buka **Supplier**, buat atau pilih supplier (contoh: Senjaya Elektronik). Untuk supplier baru, cukup isi nama lalu simpan.
2. Klik **Generate link**, salin link yang ditampilkan, lalu kirim manual lewat WA/email. Klik **Tandai sudah dikirim** setelah mengirimnya.
3. Supplier membuka link tanpa akun. Nama perusahaan terkunci. Alamat, NPWP, PIC, telepon, WhatsApp, email, kategori barang, dan merek wajib diisi. Kategori dan merek memakai kolom terpisah dengan pemisah koma.
4. Filter **Perlu review** pada daftar supplier. Buka supplier, periksa jawaban pada panel review, tentukan status/lama hutang, lalu klik **Setujui · Completed**. Jawaban baru diterapkan ke profil saat disetujui.
5. Jika ada koreksi, gunakan **Buat link pengganti**. Konfirmasi ini menonaktifkan link lama dan menghapus jawaban yang belum disetujui. Profil yang sebelumnya disetujui tetap ada.

Status: `notGenerated` → `generated` → `sent` → `submitted` → `completed`. Supplier dapat mengisi langsung dari `generated` bila petugas belum menandai pengiriman. Status, filter lain, sort, halaman, dan page size ikut URL serta dipulihkan saat menutup/menyelesaikan review.

Link berlaku 30 hari dan menerima satu pengiriman jawaban. Hanya hash SHA-256 token acak 256 bit yang disimpan di database. Salin link saat dibuat; token asli tidak bisa diambil kembali dari database. Jika link hilang atau kedaluwarsa, buat pengganti. Token di URL frontend memakai fragment (`#`) sehingga tidak ikut request halaman frontend. API publik menggunakan token tersebut sebagai akses terbatas dan tidak membaca/mengirim JWT pengguna internal.

## Validasi dan batasan

- NPWP: 16 digit; NPWP badan lama 15 digit, termasuk format titik/strip standar, dinormalisasi dengan awalan `0`. Tolak seluruh digit nol. Ini validasi format, bukan verifikasi pendaftaran/kepemilikan DJP.
- Rujukan konversi NPWP badan: [Direktorat Jenderal Pajak](https://pajak.go.id/id/berita/konsultasi-npwp-16-digit-wp-badan-sambangi-kp2kp-masamba).
- Telepon dan WhatsApp: terpisah, 7–15 digit angka. Email: pemeriksaan format, tanpa verifikasi inbox/OTP.
- Kategori dan merek: masing-masing 1–50 nilai, maksimal 100 karakter per nilai. Nilai duplikat dibuang.
- Endpoint publik hanya menampilkan nama perusahaan dan status. Data profil, catatan, dokumen, dan ketentuan hutang internal tidak ditampilkan. Kiriman publik ditampung sebagai `onboarding.pendingData`.
- Endpoint generate, tandai terkirim, dan persetujuan memakai JWT serta role admin/staff mengikuti pengelolaan supplier yang ada. Persetujuan dan submit memakai kondisi status atomik untuk mencegah pengiriman ganda atau persetujuan jawaban lama setelah penggantian link.

## Deployment

Frontend dan backend harus dapat dijangkau supplier melalui internet. Link yang dibuat dari localhost hanya untuk pengujian lokal. Gunakan domain frontend HTTPS, set `NEXT_PUBLIC_API_BASE_URL` saat build frontend ke alamat backend HTTPS, dan masukkan origin frontend tersebut pada `APP_ORIGINS` backend. Tidak ada layanan WA/email otomatis atau secret tambahan.

Endpoint baru:

- `POST /api/suppliers/:id/onboarding/generate`
- `POST /api/suppliers/:id/onboarding/sent` dengan `generatedAt` dari detail supplier
- `POST /api/suppliers/:id/onboarding/approve` dengan `submittedAt`, `hutang`, dan `lamaHutang`
- `GET /api/supplier-forms/:token`
- `POST /api/supplier-forms/:token`
- Halaman publik: `/supplier-registration#<token>`

Pengujian backend: `node --test routes/supplier/onboarding/onboarding.test.js` dari folder backend. Pengujian HTTP memakai model database tiruan; tidak menulis data produksi.
