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
```

Health check endpoint:

`GET /api/health`
