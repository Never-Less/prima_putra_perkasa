# Akses darurat owner/developer

Kewenangan terpisah dari role operasional `admin`/`staff`. Tidak ada admin yang otomatis mendapatkan akses darurat. Tidak ada endpoint untuk memberikan kewenangan ini.

## Mengaktifkan akun yang ditunjuk

1. Buat/gunakan akun individual owner/developer dengan password kuat. Catat `_id` MongoDB akun tersebut (bukan username).
2. Pengelola deployment mengisi `BREAK_GLASS_OWNER_IDS` dan/atau `BREAK_GLASS_DEVELOPER_IDS` di environment backend. Beberapa ID dipisahkan koma. Nilai kosong menutup akses untuk semua akun. Jangan masukkan akun bersama.
3. Restart seluruh instance backend dengan konfigurasi yang sama, kemudian login ulang. Menu **Akses darurat** tersedia di navigasi, URL `/breakGlass`.
4. Akun yang ditunjuk dilindungi dari perubahan username/password/role dan penghapusan melalui User CRUD, termasuk oleh admin lain. Perubahan akun ini dilakukan oleh pengelola deployment.

Tidak ada akun produksi yang otomatis ditunjuk oleh perubahan kode ini. Cabut akses dengan menghapus ID dari environment dan restart seluruh instance; permintaan berikutnya ditolak. Riwayat tetap disimpan.

## Operasi awal: cancelUnpaidInvoice

Cari dan pilih nomor invoice, masukkan alasan 10–1000 karakter, dan password sendiri. Sistem memverifikasi password, membuat sesi lima menit untuk satu invoice, dan menampilkan preview. Ketik nomor invoice persis untuk mengeksekusi, atau cabut sesi. Sesi disimpan di server; halaman tidak menyimpan password atau sesi darurat ke localStorage. Sesi yang ditinggalkan kedaluwarsa sendiri.

Operasi menghapus invoice dari daftar aktif, menyimpan snapshot lengkap invoice dan SO sebelum/sesudah ke `BreakGlassAudit`, menyinkronkan referensi invoice pada SO, dan menulis audit dokumen invoice. SJ tidak dihapus atau diubah; validasi normal tetap menolak revisi jika masih ada invoice lain yang mengacu ke SJ tersebut. Ini bukan pembatalan pajak atau pembalikan transaksi pembayaran.

Invoice dengan `isPaid`, tanggal pembayaran, atau transaksi kas/bank yang cocok dengan ID/nomor invoice ditolak. Perubahan invoice/SO sesudah preview memerlukan sesi baru. Sesi terikat pengguna, operasi, dan dokumen, tidak bisa dipakai ulang atau diteruskan pengguna lain.

Semua perubahan bisnis, konsumsi sesi, dan audit keberhasilan berada dalam transaksi MongoDB yang sama dengan workflow lock dokumen existing. Pembuatan transaksi kas/bank ikut lock tersebut dan memvalidasi invoice agar tidak berlomba dengan pembatalan invoice. MongoDB wajib replica set atau sharded cluster yang mendukung transaction; tidak ada fallback nontransactional. Rate limit verifikasi password mengikuti middleware in-memory existing (5 percobaan/15 menit/IP/path); pada deployment multi-instance terapkan juga pembatasan bersama di gateway.

## API (Bearer JWT dan Origin allowlist existing)

- `POST /api/break-glass/sessions`: `{ operation: "cancelUnpaidInvoice", targetId, reason, password }` → `sessionId`, `expiresAt`, `preview`.
- `POST /api/break-glass/sessions/:id/execute`: `{ confirmation: "nomor invoice persis" }`.
- `POST /api/break-glass/sessions/:id/revoke`: `{}`.
- `GET /api/break-glass/history`: 50 event terakhir, hanya owner/developer; tanpa snapshot besar. Snapshot lengkap tersedia di koleksi audit bagi pengelola deployment.
- `GET /api/break-glass/invoice-options?q=...`: pencarian minimal 2 karakter, maksimal 25 opsi ID + nomor invoice; kelayakan pembayaran diperiksa kembali saat aktivasi/eksekusi.

Aktivasi, kegagalan verifikasi password, pencabutan, dan eksekusi sukses dicatat. Audit tidak memiliki endpoint edit/hapus, tetapi bukan penyimpanan tahan manipulasi oleh administrator database. Terapkan backup/retensi audit sesuai kebutuhan operasional. Kontrak CRUD dokumen normal tetap tersedia; fitur ini tidak mengubah seluruh kebijakan otorisasi CRUD lama. Operasi tambahan harus dibuat sebagai handler khusus dengan validasi sendiri, bukan payload update MongoDB bebas.

## Validasi

`node --test routes/break-glass/break-glass.test.js` menguji otorisasi, CSRF, proteksi akun, password/rate limit, binding sesi, expiry/revoke, stale preview, pembayaran, replay, dan rollback ketika audit gagal memakai model/transaction mock. Uji transaksi riil dan permintaan bersamaan pada staging replica set sebelum deployment; suite mock tidak membuktikan perilaku server MongoDB.
