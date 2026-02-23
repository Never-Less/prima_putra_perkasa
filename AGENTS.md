# AGENTS.md

Panduan untuk agent yang bekerja di repository `prima_putra_perkasa`.

## Scope

- File ini berlaku untuk seluruh repository (root).
- Jika ada instruksi user yang bertentangan, ikuti instruksi user terbaru.

## Bahasa Komunikasi

- Gunakan Bahasa Indonesia saat berkomunikasi dengan user.

## Struktur Project

- `frontend/`: Next.js (App Router, TypeScript).
- `backend/`: Node.js + Express + MongoDB (Mongoose).

## Aturan Umum

- Jangan memindahkan struktur folder utama (`frontend`, `backend`) tanpa diminta.
- Jangan membuat file `.env` berisi secret ke git.
- Gunakan `.env.example` untuk dokumentasi variabel environment.
- Buat perubahan sekecil mungkin dan relevan dengan request user.

## Backend Standards

- Auth menggunakan Bearer Token (JWT), bukan cookie session.
- Password harus di-hash dengan `bcryptjs`.
- Terapkan middleware auth pada endpoint privat.
- Struktur route harus rapi dan terpisah per domain:
  - Gunakan folder per domain, contoh: `backend/routes/auth/`.
  - Pisahkan endpoint ke file masing-masing (contoh: `login.js`, `register.js`, `me.js`).
  - Gunakan `index.js` sebagai aggregator route dalam folder domain.
- Pertahankan proteksi CSRF yang sesuai untuk Bearer:
  - CORS allowlist via `APP_ORIGINS`.
  - Validasi `Origin/Referer` untuk method mutasi (`POST`, `PUT`, `PATCH`, `DELETE`).
- Jangan expose field sensitif (`password`) di response API.

## Validasi Setelah Perubahan

- Untuk backend, minimal jalankan pengecekan syntax:
  - `node --check index.js`
  - `node --check routes/auth/index.js` (jika file ada/diubah)
  - `node --check routes/auth/login.js` (jika file ada/diubah)
  - `node --check routes/auth/register.js` (jika file ada/diubah)
  - `node --check routes/auth/me.js` (jika file ada/diubah)
  - `node --check routes/auth/refresh.js` (jika file ada/diubah)
  - `node --check routes/auth/logout.js` (jika file ada/diubah)
  - `node --check models/User.js` (jika file ada/diubah)
- Jika menambah dependency backend, pastikan `package.json` dan `package-lock.json` ikut ter-update.

## Referensi Cepat

- Jalankan frontend: `cd frontend && npm run dev`
- Jalankan backend: `cd backend && npm run dev`
- Health check backend: `GET /api/health`
