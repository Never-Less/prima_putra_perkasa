# QA workflow Sales Order, Surat Jalan, dan Invoice

> Ini laporan temuan awal. Perbaikan dan hasil pengujian ulang tersedia di [laporan tindak lanjut](qa-sales-workflow-fixes-2026-09-09.md). File TAP workflow sekarang berisi hasil pengujian ulang setelah perbaikan.

Tanggal: 9 September 2026. Hasil: **belum lulus QA integritas data**.

## Cakupan dan lingkungan

- Menguji router Express asli lewat HTTP, middleware Bearer JWT dan Origin, model Mongoose, helper konversi barang frontend, serta penyimpanan MongoDB asli.
- Database testing terakhir: `ppp_qa_workflow_1788926220617_713d98`.
- Percobaan konfirmasi sebelumnya memakai `ppp_qa_workflow_1788926134854_9469a3`.
- Keduanya dibuat terpisah dari database operasional dan masih tersedia. Data QA direset antar skenario; database menyisakan data skenario terakhir, bukan seluruh riwayat pengujian.
- Server QA memakai port lokal acak dan ditutup setelah tes; konfigurasi server aplikasi yang sudah berjalan tidak diubah.
- Akun dan customer QA dibuat hanya pada database testing. Password acak melalui hash model User; JWT pengujian memakai secret sementara dalam proses tes.
- Pengujian pertama dengan persistence in-memory mengonfirmasi temuan awal; hasil utama di bawah berasal dari pengujian ulang MongoDB asli.
- Browser otomatis tidak tersedia pada sesi ini. Klik shortcut halaman, edit/paste Jspreadsheet, tampilan preview/print, navigasi Back/Forward, dan pemulihan filter URL **belum diuji secara interaktif**. Helper konversi yang dipakai UI telah dijalankan; ini bukan pengganti pengujian browser.
- Login/refresh token, konkurensi transaksi, dan audit middleware belum dicakup harness ini. Auth yang diuji adalah validasi Bearer pada router privat.

## Ringkasan eksekusi

| Suite | Lolos | Gagal |
| --- | ---: | ---: |
| Backend delivery-validation + sales-order-workflow | 18 | 0 |
| Frontend invoice-selection | 7 | 0 |
| Integrasi HTTP + MongoDB workflow | 8 | 6 |
| Total skenario unik | **33** | **6** |

Pengecekan syntax 38 file backend serta file tes integrasi juga lolos. Hasil gagal integrasi adalah assertion penerimaan yang mereproduksi masalah aplikasi, bukan timeout atau masalah koneksi. Percobaan awal koneksi dari sandbox gagal; koneksi di luar sandbox kemudian berhasil.

## Skenario integrasi yang lolos

1. SO → SJ → Invoice: qty, referensi sumber SJ, subtotal 100.000, PPN 11.000, total 111.000, TOP 30 hari, status billed → paid. Lunas tanpa tanggal bayar ditolak. Hapus SO yang terhubung ditolak. Hapus invoice mengosongkan link invoice SO dan mengembalikan sisa qty tagihan.
2. SO → Invoice langsung tanpa SJ: qty/harga dan `noPoManual` terjaga; tanpa PPN menghasilkan total 100.000.
3. Pengiriman parsial 4 + 6 dari SO qty 10 dan dua invoice: status partlyBilled → billed. Percobaan pengiriman 4 + 7 ditolak HTTP 409.
4. Nomor SO duplikat termasuk beda kapital, nomor SJ duplikat, dan edit SJ melebihi qty pesanan ditolak HTTP 409.
5. Ketiga router menolak permintaan tanpa Bearer dengan HTTP 401 dan mutasi Origin asing dengan HTTP 403.
6. Dua SO dan dua SJ digabung ke satu invoice: total 222.000 termasuk PPN; alokasi tagihan masing-masing SO tetap 100.000 sebelum PPN.
7. Barang bernama sama dengan harga berbeda: 2 × 8.000 dan 12 × 11.000 tetap terpisah setelah SJ → Invoice → baca ulang; subtotal 148.000.
8. Edit invoice: perubahan PPN menghitung ulang total; TOP 14 hari memperbarui jatuh tempo; batal lunas mengosongkan tanggal bayar.

## Temuan yang direproduksi

Semua temuan di bawah prioritas tinggi karena memengaruhi konsistensi dokumen atau nilai tagihan. Route yang disebut adalah path aplikasi; harness memakai alias `/so`, `/sj`, `/invoice`.

| ID | Langkah reproduksi | Aktual | Harapan |
| --- | --- | --- | --- |
| QA-01 | Buat SO customer A; POST invoice untuk SO itu memakai customer B yang valid | HTTP 201, invoice tersimpan | Tolak customer yang tidak cocok dengan SO |
| QA-02 | Tagih SJ qty 10 seluruhnya; buat invoice kedua bernomor berbeda untuk SJ yang sama | HTTP 201 lagi | Tolak penagihan melebihi sisa qty SJ/SO |
| QA-03 | POST barang invoice qty 10, harga 10.000, tetapi `jumlah: 1` | HTTP 201, subtotal menjadi 1 | Hitung ulang menjadi 100.000 atau tolak payload tidak konsisten |
| QA-04 | Buat SO → SJ → Invoice; DELETE SJ tersebut | HTTP 200; invoice masih menyimpan sumber SJ yang dihapus | Cegah penghapusan SJ yang sudah menjadi sumber invoice, atau sediakan pembatalan terkoordinasi |
| QA-05 | Tagih SO langsung qty 10 seluruhnya; buat invoice langsung kedua | HTTP 201 lagi | Tolak qty yang sudah habis ditagih |
| QA-06 | Tagih SO langsung seluruhnya; kemudian buat SJ dan tagih melalui SJ itu | HTTP 201 lagi | Hitung pemakaian qty bersama untuk alur langsung maupun melalui SJ |

Lokasi yang perlu ditindaklanjuti:

- `backend/routes/invoice/create.js`: belum memeriksa kecocokan customer, keberadaan/kecocokan referensi SO/SJ, atau sisa qty penagihan sebelum create.
- `backend/routes/invoice/validators.js`: normalisasi menerima `jumlah` dari payload tanpa memastikan qty × harga. Fungsi ini juga dipakai route update; pengujian manipulasi nominal pada PUT belum dilakukan.
- `backend/routes/surat-jalan/remove.js`: langsung menghapus SJ tanpa pemeriksaan invoice terkait.
- Perbaikan perlu mempertimbangkan edit invoice dengan mengecualikan dokumen sendiri, sumber barang berulang, invoice gabungan, dan perlindungan terhadap permintaan bersamaan. Validasi UI saja tidak mencukupi.

Belum ada perbaikan logika bisnis dalam tahap QA ini. Tes penerimaan yang gagal sengaja dipertahankan untuk verifikasi perbaikan berikutnya.

## Menjalankan ulang

Dari root repository:

```powershell
node --test backend/utils/sales-order-workflow.test.js backend/utils/delivery-validation.test.js
node --test frontend/tests/invoice-selection.test.cjs
node --test frontend/tests/sales-document-workflow.test.cjs
```

Tes terakhir di atas memakai in-memory persistence. Untuk MongoDB asli:

```powershell
$env:QA_REAL_DB = '1'
node --test frontend/tests/sales-document-workflow.test.cjs
Remove-Item Env:QA_REAL_DB
```

URI dibaca dari `QA_MONGODB_URI` atau `backend/.env`, tidak dicetak. Setiap run otomatis memakai nama database baru berprefix `ppp_qa_workflow_`; database default pada URI tidak digunakan. Data reset hanya diperbolehkan jika nama koneksi sama persis dengan nama QA yang dibuat proses tersebut. Tes akan tetap exit 1 selama temuan belum diperbaiki.

Sumber tes: `frontend/tests/sales-document-workflow.test.cjs`. Bukti eksekusi MongoDB terakhir: `frontend/tests/workflow-qa-results.tap`.
