# Perbaikan workflow dan QA ulang — 9 September 2026

Hasil: **50 skenario unik lolos** pada pengujian helper, backend, dan integrasi HTTP/MongoDB. Pengujian interaktif browser belum dilakukan karena tool browser tidak tersedia.

## Perubahan

- Pilihan `partial` / `non partial` dihapus dari schema aktif, payload/response Surat Jalan, form, preview, filter, kolom tabel, dan contoh Postman. Field lama dalam dokumen MongoDB tidak dimigrasi/dihapus secara massal; tidak lagi digunakan.
- Status pengiriman dihitung dari qty, termasuk beberapa baris SO dengan barang identik yang berbagi jumlah pengiriman. Semua SJ dapat dilanjutkan ke Invoice tanpa pilihan tipe manual.
- Create dan update Invoice memeriksa customer seluruh SO, sumber SJ dan barang, jumlah alokasi sumber, sisa qty SO maupun SJ, serta nomor invoice duplikat.
- Tagihan langsung SO dan tagihan melalui SJ memakai batas qty SO yang sama. Update invoice mengecualikan dokumen itu sendiri; nilai nominal dihitung ulang dari qty × harga.
- Saat qty di spreadsheet invoice diubah, alokasi sumbernya ikut disesuaikan. Suffix kode departemen pada spesifikasi invoice tetap merujuk barang SO asli.
- SJ yang terhubung ke invoice tidak dapat dihapus atau direvisi. SO yang masih mempunyai SJ atau invoice tidak dapat dihapus atau direvisi. Pesan konfirmasi menjelaskan batasan ini dalam bahasa Indonesia dan Inggris.
- Urutan penanganan: hapus atau lepaskan Invoice, lalu SJ, baru SO. Tidak ada penghapusan otomatis seluruh rantai dokumen.
- SJ baru wajib memiliki SO yang masih tersedia. Mengubah satu SJ tidak lagi diam-diam memperbarui SJ lain.

## Perlindungan simpan bersamaan

Create/update/delete pada SO, SJ, dan Invoice memakai transaksi MongoDB. Satu dokumen pengunci bersama menserialkan mutasi dokumen; transaksi yang berbenturan mengulang pembacaan pada snapshot baru. Respons berhasil dikirim setelah commit dan respons gagal membatalkan transaksi.

Ini membutuhkan MongoDB replica set/sharded cluster yang mendukung transaksi. MongoDB Atlas yang dipakai QA telah memenuhi syarat. Mutasi dokumen diserialkan untuk menjaga konsistensi; baca daftar tidak memakai kunci ini. Penulisan langsung melalui skrip/database di luar route tersebut tidak dilindungi wrapper transaksi.

## Hasil pengujian

| Suite | Lolos | Gagal |
| --- | ---: | ---: |
| Backend delivery-validation | 7 | 0 |
| Backend sales-order-workflow | 12 | 0 |
| Frontend invoice-selection | 7 | 0 |
| Integrasi workflow MongoDB utama | 22 | 0 |
| Tambahan kompatibilitas MongoDB | 2 | 0 |
| Total skenario unik | **50** | **0** |

Integrasi utama mencakup SO → SJ → Invoice, SO → Invoice langsung, pengiriman/tagihan sebagian, invoice gabungan, harga berbeda untuk barang identik, PPN, TOP, pembayaran, pengeditan qty, rollback penolakan update, enam bug QA awal, blokir revisi/hapus bertingkat, dan dua skenario bersamaan.

Dua pengujian bersamaan yang lolos:

1. Dua invoice penuh untuk satu SO disimpan bersamaan: tepat satu mendapat HTTP 201, satunya HTTP 409; database hanya menyimpan satu invoice.
2. Pembuatan invoice dan penghapusan SJ bersamaan: hanya salah satunya diterima; tidak ada invoice yang ditinggalkan dengan sumber SJ yang terhapus.

Tambahan kompatibilitas menguji nomor invoice duplikat ketika sisa qty masih tersedia (termasuk perubahan nomor melalui PUT) serta invoice SJ lama tanpa sumber per barang dengan suffix kode departemen.

Suite terakhir juga dijalankan ulang dalam mode in-memory: 21 lolos, 3 dilewati karena khusus MongoDB asli. Ketiga skenario tersebut sudah lolos pada run MongoDB utama. TypeScript, lint file frontend yang berubah, syntax 43 file backend, dan pemeriksaan whitespace lolos.

## Bukti dan database QA

- `frontend/tests/workflow-qa-results.tap`: 22 skenario; database `ppp_qa_workflow_1788935977083_6d1b57`.
- `frontend/tests/workflow-qa-compatibility-results.tap`: 2 skenario tambahan; database `ppp_qa_workflow_1788936294741_3983c2`.
- `frontend/tests/workflow-qa-memory-results.tap`: pengujian ulang tanpa MongoDB.
- `frontend/tests/sales-document-workflow.test.cjs`: tes regresi yang dapat dijalankan ulang.

Database QA terpisah dari transaksi operasional. Setiap run menggunakan nama baru dan data dibersihkan antar skenario hanya pada database QA yang dibuat run tersebut. Database tidak dihapus setelah run, sehingga menyisakan skenario terakhir. Server HTTP sementara sudah ditutup.

## Menjalankan ulang

Dari root repository:

```powershell
node --test backend/utils/sales-order-workflow.test.js backend/utils/delivery-validation.test.js
node --test frontend/tests/invoice-selection.test.cjs
node --test frontend/tests/sales-document-workflow.test.cjs
```

Untuk seluruh 24 skenario integrasi dengan MongoDB asli:

```powershell
$env:QA_REAL_DB = '1'
node --test frontend/tests/sales-document-workflow.test.cjs
Remove-Item Env:QA_REAL_DB
```

URI diambil dari `QA_MONGODB_URI` atau `backend/.env`; nama database default pada URI selalu diganti dengan nama QA baru. URI/token/password tidak dicetak.

Klik tombol halaman, paste Jspreadsheet, render preview/print, navigasi Back/Forward, dan pemulihan filter URL belum diverifikasi di browser. Tidak ada commit atau deploy dalam pekerjaan ini.
