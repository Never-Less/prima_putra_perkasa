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
- password harus di-hash dengan `bcryptjs`.
- Terapkan middleware auth pada endpoint privat.
- Gunakan camelCase untuk penamaan field domain/bisnis pada schema, payload request, dan response API (contoh: `noInvoice`, `idCustomer`, `grandTotal`).
- Struktur route harus rapi dan terpisah per domain:
  - Gunakan folder per domain, contoh: `backend/routes/auth/`.
  - Pisahkan endpoint ke file masing-masing (contoh: `login.js`, `register.js`, `me.js`).
  - Gunakan `index.js` sebagai aggregator route dalam folder domain.
- Jangan mengganti/mengubah kontrak CRUD route yang sudah ada tanpa permintaan eksplisit dari user.
- Jika UI membutuhkan data untuk komponen `select` dari backend, kirim field seminimal mungkin (contoh: `id` + label) untuk mencegah data berlebihan terekspos.
- Pertahankan proteksi CSRF yang sesuai untuk Bearer:
  - CORS allowlist via `APP_ORIGINS`.
  - Validasi `Origin/Referer` untuk method mutasi (`POST`, `PUT`, `PATCH`, `DELETE`).
- Jangan expose field sensitif (`password`) di response API.

## Frontend Standards

- Gunakan **Style A** sebagai baseline UI aplikasi Surat Jalan untuk development berikutnya.
- Struktur utama halaman sample/frontend:
  - Page awal menampilkan **table Surat Jalan + filter berdasarkan field**.
  - Klik row membuka **form + preview pada halaman yang sama**.
- Pertahankan opsi konfigurasi tampilan berikut di Style A:
  - `tipe Positioning`
  - `Warna`
  - `Style Table`
  - `Style Form`
- Hindari membuat style alternatif baru yang tidak dipakai. Jika ada style lama tidak terpakai, hapus agar codebase tetap bersih.
- Untuk input field, gunakan pola/library yang sudah dipakai di project:
  - Gunakan input lokal yang distyling dengan Tailwind sesuai komponen/form existing.
  - Gunakan `AppDateInput` untuk field tanggal.
  - Gunakan `react-select` untuk select/searchable select ketika pola existing membutuhkannya.
  - Jangan menambahkan library form/input baru tanpa kebutuhan eksplisit.
- Gunakan i18n untuk text UI dan copy aplikasi.
  - Default bahasa: `id` (Bahasa Indonesia).
  - Bahasa tambahan saat ini: `en` (English).
  - Tambahan/ubah text UI harus melalui dictionary i18n, bukan hardcoded string langsung di komponen.
  - Pertahankan fallback aman ke bahasa default (`id`) jika key tidak ditemukan.

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
