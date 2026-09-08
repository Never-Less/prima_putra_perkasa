# Prima Putra Perkasa

Prima Putra Perkasa adalah aplikasi web internal untuk mengelola alur administrasi penjualan dan operasional perusahaan, mulai dari **Sales Order**, **Surat Jalan**, dan **Invoice** hingga **Pembelian**, pembayaran customer, tagihan pabrik, serta laporan keuangan.

## Ringkasan Aplikasi

Aplikasi menghubungkan data antarproses agar pencatatan transaksi lebih konsisten. Sales Order dapat digunakan sebagai sumber data Surat Jalan, kemudian Surat Jalan yang belum ditagihkan dapat dipilih saat membuat Invoice. Sistem juga membantu menghitung nilai transaksi, memantau status pembayaran, dan menyiapkan dokumen untuk dicetak, disimpan sebagai PDF, atau diekspor ke Excel.

Alur utama aplikasi:

```text
Sales Order -> Surat Jalan -> Invoice -> Pembayaran dan Laporan
                              |
                              -> Pembelian
```

## Fitur Utama

- Autentikasi berbasis JWT dengan access token, refresh token, logout, serta role `admin` dan `staff`.
- Pengelolaan master data customer, supplier, dan user.
- CRUD Sales Order, Surat Jalan, Invoice, dan Pembelian dengan tabel, filter, pagination, form, dan preview.
- Pengisian barang berbentuk spreadsheet untuk mempercepat input transaksi.
- Relasi data antar Sales Order, Surat Jalan, Invoice, dan Pembelian, termasuk pengisian otomatis dari dokumen terkait.
- Perhitungan subtotal, PPN, grand total, jatuh tempo, serta status pembayaran.
- Rekap pembayaran seluruh customer dan outstanding tagihan per pabrik.
- Laporan keuangan bulanan dan tahunan berdasarkan invoice, pembelian stok, dan biaya operasional.
- Export dokumen untuk print/PDF serta export Excel pada laporan yang didukung.
- Antarmuka responsif dengan tema terang/gelap dan pilihan Bahasa Indonesia atau English.

## Teknologi

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, React Select, dan Jspreadsheet CE.
- **Backend:** Node.js, Express, MongoDB, dan Mongoose.
- **Keamanan:** Bearer Token JWT, `bcryptjs`, Helmet, CORS allowlist, validasi `Origin/Referer`, dan rate limiting pada autentikasi.

## Struktur Repository

- `frontend/` - aplikasi Next.js untuk antarmuka, form, preview, laporan, dan export.
- `backend/` - REST API Express, model Mongoose, autentikasi, dan proses bisnis.

## Prerequisites

- Node.js 20.9 atau lebih baru
- npm

## Setup

Install dependencies for each app:

```bash
cd frontend
npm install

cd ../backend
npm install
```

## Run Development Servers

Frontend (Next.js):

```bash
cd frontend
npm run dev
```

Backend (Express):

```bash
cd backend
npm run dev
```

## Backend Environment

Create a `.env` file in `backend/` (or copy from `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/prima_putra_perkasa
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
APP_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=replace_with_strong_admin_password
```

Health check endpoint:

`GET /api/health`

## Auth API

- `POST /api/auth/register` (admin only)
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (requires `Authorization: Bearer <token>`)

Body register/login:

```json
{
  "username": "user@example.com",
  "password": "isi_password"
}
```

Catatan: role default user baru adalah `staff`. Endpoint register hanya dapat dipakai oleh admin yang sudah login dan tidak mengembalikan token untuk user baru.
Response `login` dan `refresh` mengembalikan `accessToken` dan `refreshToken`.
Endpoint `register`, `login`, dan `refresh` memakai rate limit dasar untuk mengurangi brute force.

Body refresh/logout:

```json
{
  "refreshToken": "isi_refresh_token_di_sini"
}
```

## Customer API

Semua endpoint customer butuh bearer token:

- `POST /api/customers`
- `GET /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

Body create/update:

```json
{
  "nama": "PT Contoh",
  "alamat": "Jl. Contoh No. 123",
  "atasNama": "Budi Santoso"
}
```

## Pembelian API

Semua endpoint pembelian butuh bearer token:

- `POST /api/pembelian`
- `GET /api/pembelian`
- `GET /api/pembelian/:id`
- `PUT /api/pembelian/:id`
- `DELETE /api/pembelian/:id`

Body create/update:

```json
{
  "tanggalNota": "2026-02-24",
  "namaSupplier": "PT Supplier Utama",
  "noNota": "NOTA-001",
  "idInvoice": "65f1234567890abcde123456",
  "hutang": true,
  "ppn": true,
  "lamaHutang": 30,
  "nilaiNota": 15000000,
  "tanggalJatuhTempo": "2026-03-26",
  "tanggalBayar": null
}
```

## CSRF Setup (Bearer Token)

Backend menggunakan bearer token (tanpa cookie/session), jadi CSRF token klasik tidak dipakai.
Proteksi yang diterapkan:

- CORS allowlist dari `APP_ORIGINS`
- Validasi `Origin/Referer` untuk request mutasi (`POST/PUT/PATCH/DELETE`)
- `credentials: false` agar cookie tidak dipakai untuk auth

## Perubahan Branch Development

Perubahan berikut tersedia di branch `development` dan belum menjadi bagian dari rilis utama:

- `fix: akuratkan billing sales order dan rapikan price list`
