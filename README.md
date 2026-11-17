# Prima Putra Perkasa

[Bahasa Indonesia](README.md) | [English](README.en.md)

Prima Putra Perkasa adalah aplikasi ERP internal untuk mengelola penjualan, pengiriman, penagihan, pembelian, arus kas, master data, dan laporan keuangan dalam satu alur data yang saling terhubung.

## Ringkasan Aplikasi

Aplikasi memakai **Sales Order** sebagai pusat alur penjualan. Barang dapat dikirim sebagian atau penuh melalui **Surat Jalan**, lalu ditagihkan melalui **Invoice** dari Surat Jalan maupun langsung dari Sales Order. Perubahan dokumen, pembayaran customer, dan pembayaran supplier akan memperbarui status serta laporan terkait.

Alur utama saat ini:

```text
Customer + Price List
        |
        v
   Sales Order ------------------------------+
        |                                     |
        v                                     |
 Surat Jalan (sebagian/penuh)                 |
        |                                     |
        +-------------------+-----------------+
                            v
                    Invoice (sebagian/penuh)
                            |
                            v
               Pembayaran dan Piutang Customer

Invoice atau pembelian stok -> Pembelian -> Hutang/Pembayaran Supplier
Kas & Bank + Invoice + Pembelian + Biaya -> Dashboard dan Laporan Keuangan
```

## Alur Penggunaan

1. **Login dan master data**
   - User masuk menggunakan akun internal dengan role `admin` atau `staff`.
   - Customer menyimpan identitas dan ketentuan pembayaran default.
   - Supplier menyimpan profil, ketentuan hutang, kategori/merek barang, serta dokumen pendukung.

2. **Price List**
   - Harga barang disimpan per customer untuk membantu penyusunan transaksi.
   - Tersedia input banyak barang berbentuk spreadsheet, pengecekan harga, dan penyimpanan draft.

3. **Sales Order**
   - Sales Order mencatat customer, nomor dan tanggal SO, barang, kuantitas, harga, PPN, serta ketentuan pembayaran.
   - Input barang memakai spreadsheet dengan operasi baris, copy/paste, fill, undo, dan redo.
   - Daftar menyimpan filter, sort, grouping, pagination, dan kolom aktif pada URL.

4. **Surat Jalan**
   - Surat Jalan dibuat dari Sales Order dan dapat mengirim sebagian atau seluruh kuantitas.
   - Sistem memeriksa agar total pengiriman tidak melebihi kuantitas Sales Order.
   - Dokumen dapat dicetak per Surat Jalan atau digabung berdasarkan nomor SO.

5. **Invoice**
   - Invoice dapat dibuat dari Surat Jalan yang belum selesai ditagihkan atau langsung dari Sales Order.
   - Beberapa SO dan Surat Jalan dapat dialokasikan ke satu Invoice dengan sumber barang tetap tercatat.
   - Sistem menghitung subtotal, PPN, grand total, jatuh tempo, status lunas, dan tanggal bayar.

6. **Pembayaran customer**
   - Invoice yang belum lunas tampil pada **Piutang Customer** dan reminder jatuh tempo.
   - **Pembayaran All Customer** menyediakan rekap pembayaran lintas customer.
   - Export piutang dapat dipilih berdasarkan tahun dan customer; pilihan semua customer dikelompokkan menjadi customer lalu bulan.

7. **Pembelian dan supplier**
   - Pembelian dapat dikaitkan ke Invoice penjualan atau dicatat sebagai pembelian stok.
   - Transaksi tunai langsung dianggap lunas. Transaksi hutang menjadi lunas ketika tanggal bayar diisi.
   - **Hutang Supplier** dan rekap tagihan pabrik mengikuti status pembayaran Pembelian yang sama.

8. **Kas & Bank**
   - Mencatat uang masuk/keluar per kas atau rekening, termasuk saldo awal dan batch kas kecil.
   - Transaksi dapat dikaitkan ke Sales Order, Invoice, Pembelian, customer, supplier, dan PPN.
   - Biaya keluar yang terhubung ke SO dipakai untuk melihat profit aktual per Sales Order.

9. **Dashboard dan laporan**
   - Dashboard Penjualan merangkum omzet, tren, pembayaran, customer teratas, dan produk terlaris.
   - Dashboard SO menampilkan tahapan proses dokumen dalam bentuk Kanban.
   - Dashboard Finance merangkum arus kas aktual, PPN, piutang, hutang, dan jatuh tempo.
   - Laporan Keuangan tersedia bulanan/tahunan dan menggabungkan Invoice, pembelian stok, pembayaran supplier, saldo hutang, serta biaya operasional.

## Status Sales Order

Status proses dihitung otomatis dari hubungan Sales Order, Surat Jalan, Invoice, dan pembayaran:

```text
To Deliver
-> Partly Delivered
-> Delivered to Billed
-> Partly Billed
-> Billed
-> Paid
```

Status dapat dipilih manual dari enam pilihan tersebut setelah konfirmasi. Perhitungan otomatis tidak dinonaktifkan: status manual akan kedaluwarsa dan dihitung ulang ketika data SO, Surat Jalan, Invoice, atau pembayaran berubah.

## Supplier Onboarding

- Petugas membuat supplier, menghasilkan link undangan, lalu mengirimkannya melalui kanal komunikasi yang dipilih.
- Supplier mengisi profil tanpa login melalui `/supplier-registration` dan dapat melampirkan link dokumen atau PDF.
- Data kiriman masuk sebagai data pending untuk ditinjau sebelum diterapkan ke profil supplier.
- Link bersifat sekali kirim, berlaku 30 hari, dan dapat diganti jika hilang atau kedaluwarsa.
- Detail teknis tersedia di [`docs/supplier-onboarding.md`](docs/supplier-onboarding.md).

## Akses dan Keamanan Dokumen

- `staff` mengelola alur operasional sesuai endpoint yang diizinkan.
- `admin` memiliki akses tambahan ke Dashboard Finance, Laporan Keuangan, dan manajemen user.
- Owner/developer yang ID-nya ditunjuk dapat memakai **Akses Darurat** untuk membatalkan satu Invoice belum lunas agar revisi Surat Jalan dapat dilakukan.
- Akses darurat memerlukan autentikasi ulang, alasan, preview dampak, konfirmasi nomor Invoice, sesi sekali pakai, dan audit lengkap.
- Mode pembetulan dokumen tetap menjalankan validasi relasi dan menampilkan peringatan sebelum perubahan yang berisiko dilanjutkan.

## Modul Aplikasi

- **Ringkasan:** Beranda, Dashboard Penjualan, Dashboard SO.
- **Penjualan:** Sales Order, Price List, Surat Jalan, Invoice.
- **Pengadaan:** Pembelian.
- **Keuangan:** Dashboard Finance, Kas & Bank, Piutang Customer, Hutang Supplier.
- **Laporan:** Rekap Tagihan Pembayaran Pabrik, Pembayaran All Customer, Laporan Keuangan.
- **Master Data:** Customer, Supplier, User, dan Akses Darurat sesuai hak akses.

## Fitur Utama

- Autentikasi Bearer JWT dengan access token, refresh token, logout, role, dan pembatasan akses.
- CRUD dengan filter per field, sort, grouping, pagination, pengaturan kolom, tampilan desktop/mobile, form, dan preview.
- Persistensi state daftar melalui URL saat membuka form, detail, dan export.
- Spreadsheet barang dengan copy/paste, operasi baris, fill, undo/redo, dan validasi domain.
- Validasi kuantitas serta alokasi sumber antar SO, Surat Jalan, dan Invoice.
- Export print/PDF dan export Excel untuk laporan yang didukung.
- Tema terang/gelap dan antarmuka Bahasa Indonesia/English.
- Audit perubahan dokumen serta proteksi khusus untuk operasi berisiko.

## Teknologi

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, React Select, Jspreadsheet CE.
- **Backend:** Node.js, Express, MongoDB, Mongoose.
- **Penyimpanan gambar:** Cloudinary untuk gambar Price List jika dikonfigurasi.
- **Keamanan:** Bearer JWT, `bcryptjs`, Helmet, CORS allowlist, validasi `Origin/Referer`, rate limiting autentikasi, dan audit log.

## Struktur Repository

- `frontend/` - antarmuka Next.js, form, preview, dashboard, laporan, dan export.
- `backend/` - REST API Express, model Mongoose, autentikasi, validasi, audit, dan proses bisnis.
- `docs/` - dokumentasi operasional dan catatan QA tambahan.

## Prasyarat

- Node.js 20.9 atau lebih baru
- npm
- MongoDB

## Instalasi

```bash
cd frontend
npm install

cd ../backend
npm install
```

## Environment Backend

Salin `backend/.env.example` menjadi `backend/.env`, lalu isi nilai lokal/rahasia yang diperlukan:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/prima_putra_perkasa
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
APP_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
TEMP_DOCUMENT_CORRECTION_MODE=true
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=replace_with_strong_admin_password
BREAK_GLASS_OWNER_IDS=
BREAK_GLASS_DEVELOPER_IDS=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_PRICE_LIST_FOLDER=prima-putra-perkasa/price-list
```

Jangan commit `backend/.env`. Untuk deployment terpisah, set `NEXT_PUBLIC_API_BASE_URL` saat build frontend ke URL HTTPS backend dan masukkan origin frontend ke `APP_ORIGINS`.

## Menjalankan Aplikasi

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Buka `http://localhost:3000`. Health check backend tersedia di `GET /api/health`.

## Membuat Admin

Isi `ADMIN_USERNAME` dan `ADMIN_PASSWORD` pada `backend/.env`, lalu jalankan:

```bash
cd backend
npm run create:admin
```

Role default user baru adalah `staff`. Pembuatan user melalui API hanya dapat dilakukan oleh admin yang sudah login.

## Validasi Project

Frontend:

```bash
cd frontend
node --test tests/*.test.cjs
npm run build
```

Backend:

```bash
cd backend
node --check index.js
node --test utils/*.test.js config/*.test.js scripts/*.test.js routes/**/*.test.js routes/**/**/*.test.js
```

## API dan Proteksi Request

API utama tersedia di bawah `/api`, termasuk auth, customer, supplier, supplier form publik, Sales Order, Surat Jalan, Invoice, Pembelian, Kas & Bank, dashboard, laporan keuangan, audit log, dan akses darurat.

Backend menggunakan bearer token tanpa cookie/session. Proteksi request meliputi:

- CORS allowlist dari `APP_ORIGINS`.
- Validasi `Origin/Referer` untuk `POST`, `PUT`, `PATCH`, dan `DELETE`.
- `credentials: false` agar cookie tidak digunakan untuk autentikasi.
- Hash password dengan `bcryptjs` dan pembatasan percobaan pada endpoint autentikasi.
- Response privat tidak mengirim field password.

## Backfill Nomor Urutan Barang

Periksa Sales Order, Surat Jalan, dan Invoice tanpa mengubah database:

```bash
cd backend
npm run backfill:item-order
```

Terapkan setelah ringkasan dry-run sesuai:

```bash
npm run backfill:item-order -- --apply
```

Gunakan `--only=purchase-orders`, `--only=surat-jalan`, atau `--only=invoices` untuk membatasi koleksi.
