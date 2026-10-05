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
- Input NPWP, telepon, dan WhatsApp menyaring huruf serta mempertahankan angka nol di depan; NPWP lama tetap menerima titik/tanda hubung. Email menggunakan input email. Form internal memeriksa input sebelum simpan, dan backend memakai validasi kontak yang sama dengan form publik; kolom kontak internal tetap boleh kosong.
- Kategori dan merek: masing-masing 1–50 nilai, maksimal 100 karakter per nilai. Nilai duplikat dibuang.
- Endpoint publik hanya menampilkan nama perusahaan dan status. Data profil, catatan, dokumen, dan ketentuan hutang internal tidak ditampilkan. Kiriman publik ditampung sebagai `onboarding.pendingData`.
- Endpoint generate, tandai terkirim, dan persetujuan memakai JWT serta role admin/staff mengikuti pengelolaan supplier yang ada. Persetujuan dan submit memakai kondisi status atomik untuk mencegah pengiriman ganda atau persetujuan jawaban lama setelah penggantian link.

## Dokumen PDF dan tag

- Dokumen juga dapat diberikan sebagai link tanpa upload, atau bersamaan dengan PDF. Form publik dan internal memiliki kolom nama dokumen dan URL serta tombol tambah/hapus. Maksimal 10 link per pengiriman, nama maksimal 100 karakter dan URL maksimal 1.000 karakter; hanya HTTP/HTTPS tanpa username/password. Pastikan tim memiliki akses ke link.
- Link publik masuk ke jawaban pending dan tampil saat review. Persetujuan menambahkan link ke profil serta mempertahankan link lama; link yang sama dengan nama yang sama tidak diduplikasi. Penggantian undangan membuang jawaban link pending, tanpa menghapus link yang sudah disetujui. Sistem menyimpan URL dan tidak mengunduh isi link otomatis. Batas upload tetap 5 MB per PDF.

- Kategori barang dan merek tampil sebagai tag. Koma atau Enter membentuk tag; tombol × menghapus satu tag. Teks terakhir tetap ikut tersimpan meskipun belum diberi koma. Tempel daftar dengan koma atau baris baru untuk memasukkan beberapa tag; duplikat diabaikan tanpa membedakan huruf besar/kecil.
- Formulir publik dan form internal mendukung hingga 5 PDF per pengiriman, maksimal 5 MiB per file. Pilih beberapa file sekaligus atau tarik ke area upload, lalu hapus pilihan yang keliru sebelum mengirim. Dokumen bersifat opsional.
- File baru dikirim saat simpan/submit. API tetap menerima JSON lama tanpa lampiran; request dengan file memakai multipart berisi `payload` (JSON) dan beberapa field `documents` (file).
- Backend memeriksa ekstensi, MIME, header dan penanda akhir PDF, jumlah file, serta ukuran. Token undangan diperiksa sebelum membaca upload publik. Pengiriman publik tidak dapat menentukan metadata dokumen sendiri.
- PDF publik tersimpan dalam jawaban pending dan tersedia untuk diunduh saat review. Persetujuan menambahkan dokumen ke profil tanpa mengganti dokumen lama. Link pengganti membersihkan dokumen pending; dokumen yang sudah disetujui tetap ada.
- File disimpan di koleksi MongoDB `SupplierDocument` terpisah, satu file per dokumen database. Profil supplier hanya menyimpan metadata; binary tidak ikut response daftar/detail. Penyimpanan ini memakai kapasitas dan backup MongoDB yang sudah ada, tanpa secret atau layanan tambahan.
- Unduh melalui `GET /api/suppliers/:id/documents/:documentId` dengan Bearer JWT. Backend memeriksa kepemilikan dan referensi pending/approved sebelum mengirim PDF sebagai attachment dengan `Cache-Control: private, no-store`. Formulir publik tidak menyediakan endpoint baca dokumen.
- Pengiriman yang kalah dalam submit bersamaan atau gagal menyimpan supplier membersihkan file yang baru dibuat. Menghapus supplier membersihkan seluruh file miliknya.

Pengujian dokumen: `node --test routes/supplier/documents.test.js routes/supplier/onboarding/onboarding.test.js` dari folder backend; `node --test tests/supplier-onboarding.test.cjs` dari folder frontend. Pengujian memakai penyimpanan tiruan dan tidak mengubah database produksi.

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
