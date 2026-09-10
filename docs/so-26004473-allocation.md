# Alokasi invoice ke SO 26004473

Pemeriksaan dan koreksi: 10 September 2026.

## Temuan

- SO memiliki 13 baris barang dengan total `jumlah` sebesar 3.544.000. Setiap baris sesuai qty × harga satuan.
- `nominalPo` tersimpan sebesar 3.190.140, sama dengan grand total invoice pertama setelah PPN. Tidak ada audit historis untuk menentukan proses yang pertama kali mengisi nominal tersebut.
- Invoice B0926/2653: 12 barang, subtotal 2.874.000, PPN 316.140, grand total 3.190.140.
- Invoice B0926/2668: oli 10 liter × 67.000, subtotal 670.000, PPN 73.700, grand total 743.700.
- Baris oli pada invoice memakai spesifikasi tampilan `DM 390`, sementara SO dan barang SJ asalnya memiliki spesifikasi kosong. Versi kode pada HEAD memfilter alokasi berdasarkan kecocokan nama/spesifikasi/unit; akibatnya baris ini terlewat. Kode lokal sudah memiliki pemetaan kembali melalui sumber barang SJ untuk progres qty.

## Aturan alokasi

- Nilai invoice teralokasi adalah penjumlahan `jumlah` baris invoice yang referensi SO-nya cocok, dari seluruh invoice terkait, sebelum PPN.
- Referensi sumber SJ/SO pada `sources` menentukan alokasi; untuk baris tanpa sumber, gunakan `noPoManual`. Baris lama tanpa referensi per barang hanya boleh menggunakan header jika SO-nya tunggal dan tidak ambigu.
- Satu baris gabungan beberapa SO dibagi proporsional menurut qty sumber masing-masing SO. Total seluruh bagian tetap sama dengan total baris.
- Alokasi nominal tidak lagi bergantung pada kecocokan teks barang atau dibatasi sisa qty SO. Nilai invoice yang tersimpan ditampilkan utuh agar selisih tidak disembunyikan. Validasi pembuatan invoice yang mencegah qty berlebih tetap berlaku.
- Progres qty/status pemenuhan tetap memakai sumber barang asli. Perbedaan kode departemen pada teks invoice tidak boleh membuat qty oli dianggap belum ditagih.
- Status Paid memerlukan semua invoice yang mengalokasikan barang ke SO tersebut sudah dibayar.
- Panel SO menampilkan alokasi setiap invoice beserta totalnya. Data legacy tanpa detail barang tetap memakai fallback subtotal tunggal yang sudah ada.

## Koreksi dan hasil

Hanya `nominalPo` SO dengan ID `6a94e6daea5b84db31e51153` dikoreksi dari 3.190.140 menjadi 3.544.000, beserta timestamp perubahan. Koreksi memakai transaksi, memeriksa nominal lama, seluruh barang, dan timestamp agar tidak menimpa perubahan bersamaan. AuditLog mencatat perubahan nominal dengan actor `Codex maintenance`. Harga, qty, nilai invoice, dan status pembayaran tidak diubah.

Verifikasi ulang database dengan fungsi workflow terbaru:

| Komponen | Hasil |
| --- | ---: |
| Nominal SO | 3.544.000 |
| Alokasi B0926/2653 | 2.874.000 |
| Alokasi B0926/2668 | 670.000 |
| Total invoice teralokasi | 3.544.000 |
| Sisa belum ditagih | 0 |
| Status hasil perhitungan | Billed |

Status Billed dihitung saat API membaca data, bukan disimpan sebagai field status baru. Backend/frontend live perlu memakai kode terbaru agar aturan dan rincian alokasi tampil.

## Validasi

- 19 tes unit workflow/alokasi lulus, termasuk reproduksi SO ini, invoice gabungan, perubahan nominal invoice, penghapusan invoice, dan perbedaan teks barang.
- 21 tes integrasi SO–SJ–Invoice dengan persistence tiruan lulus; 3 tes yang memerlukan database QA khusus dilewati.
- TypeScript, lint file frontend terkait, dan syntax backend lulus.
- Koreksi nominal dan verifikasi data SO ini dilakukan pada database yang dikonfigurasi, bukan fixture tes.
