# Prima Putra Perkasa

[Bahasa Indonesia](README.md) | [English](README.en.md)

Prima Putra Perkasa is an internal web application for managing the company's sales administration and operational workflows, from **Sales Orders**, **Delivery Notes**, and **Invoices** to **Purchases**, customer payments, supplier bills, and financial reports.

## Application Overview

The application connects data across business processes to maintain consistent transaction records. Sales Orders can be used as the source for Delivery Notes, while unbilled Delivery Notes can be selected when creating Invoices. The system also calculates transaction values, monitors payment statuses, and prepares documents for printing, saving as PDF, or exporting to Excel.

Main application workflow:

```text
Sales Order -> Delivery Note -> Invoice -> Payments and Reports
                                 |
                                 -> Purchase
```

## Key Features

- JWT-based authentication with access tokens, refresh tokens, logout, and `admin` and `staff` roles.
- Customer, supplier, and user master data management.
- CRUD operations for Sales Orders, Delivery Notes, Invoices, and Purchases, including tables, filters, pagination, forms, and previews.
- Spreadsheet-style item entry for faster transaction input.
- Data relationships between Sales Orders, Delivery Notes, Invoices, and Purchases, including automatic population from related documents.
- Automatic calculation of subtotals, VAT, grand totals, due dates, and payment statuses.
- Customer payment summaries and outstanding supplier bill reports.
- Monthly and annual financial reports based on invoices, stock purchases, and operating expenses.
- Document export for printing or PDF, as well as Excel export for supported reports.
- Responsive interface with light and dark themes and Indonesian or English language options.

## Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, React Select, and Jspreadsheet CE.
- **Backend:** Node.js, Express, MongoDB, and Mongoose.
- **Security:** Bearer Token JWT, `bcryptjs`, Helmet, a CORS allowlist, `Origin/Referer` validation, and authentication rate limiting.

## Repository Structure

- `frontend/` - Next.js application for the user interface, forms, previews, reports, and exports.
- `backend/` - Express REST API, Mongoose models, authentication, and business processes.

## Prerequisites

- Node.js 20.9 or later
- npm

## Setup

Install dependencies for each application:

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

Create a `.env` file inside `backend/` or copy `backend/.env.example`:

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

## Authentication API

- `POST /api/auth/register` (admin only)
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me` (requires `Authorization: Bearer <token>`)

Register/login request body:

```json
{
  "username": "user@example.com",
  "password": "your_password"
}
```

Note: The default role for a new user is `staff`. The register endpoint can only be used by a signed-in administrator and does not return authentication tokens for the new user.
The `login` and `refresh` responses return an `accessToken` and a `refreshToken`.
The `register`, `login`, and `refresh` endpoints use basic rate limiting to reduce brute-force attempts.

Refresh/logout request body:

```json
{
  "refreshToken": "your_refresh_token_here"
}
```

## Customer API

All customer endpoints require a bearer token:

- `POST /api/customers`
- `GET /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

Create/update request body:

```json
{
  "nama": "PT Example",
  "alamat": "Example Street No. 123",
  "atasNama": "John Doe"
}
```

## Purchase API

All purchase endpoints require a bearer token:

- `POST /api/pembelian`
- `GET /api/pembelian`
- `GET /api/pembelian/:id`
- `PUT /api/pembelian/:id`
- `DELETE /api/pembelian/:id`

Create/update request body:

```json
{
  "tanggalNota": "2026-02-24",
  "namaSupplier": "PT Main Supplier",
  "noNota": "NOTE-001",
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

The backend uses bearer tokens without cookies or sessions, so traditional CSRF tokens are not used.
The following protections are applied:

- CORS allowlist configured through `APP_ORIGINS`.
- `Origin/Referer` validation for mutation requests (`POST/PUT/PATCH/DELETE`).
- `credentials: false` to prevent cookies from being used for authentication.

## Item Sequence Number Backfill

Run a dry run to inspect Sales Orders, Delivery Notes, and Invoices without modifying MongoDB:

```bash
cd backend
npm run backfill:item-order
```

Apply the backfill after confirming the dry-run summary:

```bash
npm run backfill:item-order -- --apply
```

Use `--only=purchase-orders`, `--only=surat-jalan`, or `--only=invoices` to limit the operation to a specific collection.

## Development Branch Changes

The following changes are available on the `development` branch and are not yet part of the main release:

- `fix: Update partial and non-partial behavior`
