# Prima Putra Perkasa

Repository structure:

- `frontend/` - Next.js application
- `backend/` - Node.js + Express API

## Prerequisites

- Node.js 18+ (Node.js 20 recommended)
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
```

Health check endpoint:

`GET /api/health`

## Auth API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (requires `Authorization: Bearer <token>`)

Body register/login:

```json
{
  "username": "admin",
  "password": "passwordku123"
}
```

Catatan: role default user baru adalah `staff`.
Response `register`, `login`, dan `refresh` mengembalikan `accessToken` dan `refreshToken`.

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
