export type ReleaseNoteSection = {
  title: string;
  changes: string[];
};

export type ReleaseNote = {
  id: string;
  version: string;
  date: string;
  title: string;
  summary: string;
  sections: ReleaseNoteSection[];
};

// Urutkan dari rilis terbaru. Tambahkan satu entry pada setiap commit perubahan aplikasi.
export const releaseNotes: ReleaseNote[] = [
  {
    id: "2026-09-21-financial-report-supplier-payments",
    version: "2026.09.21",
    date: "2026-09-21",
    title: "Pembayaran dan Hutang Supplier pada Laporan Keuangan",
    summary: "Laporan keuangan kini membedakan jenis pembelian dan status pelunasan serta menampilkan pembayaran supplier dan saldo hutang pada akhir periode.",
    sections: [
      {
        title: "Laporan Keuangan",
        changes: [
          "Ringkasan bulanan dan tahunan menampilkan total pembayaran supplier pada periode berjalan serta saldo hutang supplier pada akhir periode.",
          "Pembelian tunai dihitung sebagai pembayaran pada tanggal nota, sedangkan pembayaran hutang mengikuti tanggal bayar yang tercatat.",
          "Perhitungan laba tetap menggunakan seluruh pembelian yang terhubung agar nilai gross profit tidak berubah karena status pembayaran.",
        ],
      },
      {
        title: "Tampilan dan Export",
        changes: [
          "Tabel stock barang membedakan jenis pembelian Tunai atau Hutang dari status pembayaran Lunas atau Belum Lunas.",
          "Print dan Excel laporan keuangan menyertakan ringkasan pembayaran, saldo hutang, jenis pembelian, dan status pembayaran.",
        ],
      },
    ],
  },
  {
    id: "2026-09-21-supplier-debt-and-correction-warning",
    version: "2026.09.21",
    date: "2026-09-21",
    title: "Hutang Supplier dan Peringatan Pembetulan Dokumen",
    summary: "Hutang supplier kini dapat dipantau dari data Pembelian, status pelunasan lebih jelas, dan mode pembetulan dokumen tetap menampilkan peringatan sebelum perubahan dilanjutkan.",
    sections: [
      {
        title: "Hutang Supplier dan Pembelian",
        changes: [
          "Halaman Hutang Supplier menampilkan total hutang, tingkat keterlambatan, filter supplier dan jatuh tempo, serta pengelompokan data berdasarkan supplier atau bulan.",
          "Status pembayaran Pembelian dipisahkan dari jenis transaksi hutang dan otomatis menampilkan Lunas atau Belum Lunas berdasarkan tanggal bayar.",
          "Daftar Pembelian dilengkapi kolom serta filter Status Pembayaran pada tampilan desktop dan mobile.",
        ],
      },
      {
        title: "Pembetulan Dokumen",
        changes: [
          "Sales Order, Surat Jalan, dan Invoice tetap menjalankan validasi relasi saat mode pembetulan data aktif.",
          "Pelanggaran validasi ditampilkan sebagai peringatan dengan pilihan Tetap Lanjutkan, sedangkan mode normal tetap memblokir perubahan yang tidak valid.",
        ],
      },
      {
        title: "Navigasi",
        changes: [
          "Piutang Customer dan Hutang Supplier ditempatkan pada kategori Keuangan, sementara rekap pembayaran dan laporan keuangan dikelompokkan dalam kategori Laporan.",
        ],
      },
    ],
  },
  {
    id: "2026-09-17-mobile-print-purchase-update",
    version: "2026.09.17",
    date: "2026-09-17",
    title: "Penyempurnaan Daftar Mobile, Print, dan Invoice Pembelian",
    summary: "Daftar data lebih ringkas di perangkat mobile, hasil print tidak lagi terpengaruh ukuran layar, dan pilihan Invoice pada Pembelian tetap akurat saat data dimuat.",
    sections: [
      {
        title: "Daftar dan Filter Mobile",
        changes: [
          "Filter pada halaman daftar kini dapat dibuka atau ditutup dan ditampilkan dalam dua kolom pada perangkat mobile.",
          "Teks kartu daftar yang terlalu panjang dipotong dengan tanda elipsis agar tampilan tetap rapi.",
          "Kolom kartu mobile mengikuti kolom desktop, termasuk pengaturan kolom tampil atau tersembunyi dan kelengkapan tanggal dokumen Sales Order.",
        ],
      },
      {
        title: "Print",
        changes: [
          "Navbar, sidebar, dan ruang sidebar tidak lagi ikut tercetak sehingga hasil print konsisten tanpa dipengaruhi breakpoint atau ukuran layar komputer.",
        ],
      },
      {
        title: "Pembelian",
        changes: [
          "Invoice yang sudah tersimpan pada Pembelian tetap dipertahankan ketika daftar pilihan Invoice masih dimuat dan tidak lagi berubah menjadi Stock karena keterlambatan data.",
        ],
      },
    ],
  },
  {
    id: "2026-09-15-document-correction-mode",
    version: "2026.09.15",
    date: "2026-09-15",
    title: "Mode Pembetulan Dokumen dan Tampilan Total Rekap",
    summary: "Pembetulan data Sales Order, Surat Jalan, dan Invoice kini dapat dilakukan sementara tanpa terhalang validasi relasi, serta baris total rekap tagihan lebih mudah dibaca.",
    sections: [
      {
        title: "Pembetulan Data Dokumen",
        changes: [
          "Mode koreksi sementara memungkinkan Sales Order diperbarui meskipun sudah terhubung ke Surat Jalan atau Invoice.",
          "Surat Jalan dan Invoice dapat diperbaiki tanpa terhalang pemeriksaan relasi antar dokumen selama mode koreksi aktif.",
          "Validasi dasar seperti format data, identitas dokumen, dan nomor dokumen ganda tetap dipertahankan.",
        ],
      },
      {
        title: "Rekap Tagihan Pabrik",
        changes: [
          "Warna teks pada baris total pembayaran dan outstanding kini menyesuaikan tema terang, tema gelap, dan hasil print.",
        ],
      },
    ],
  },
  {
    id: "2026-09-04-light-erp-finance-supplier-revision",
    version: "2026.09.04",
    date: "2026-09-04",
    title: "Kas & Bank, Profil Supplier, dan Kontrol Revisi SO",
    summary: "Pencatatan arus kas dibuat lebih nyata dan sederhana, biaya dapat dilacak per Sales Order, profil supplier lebih lengkap, dan revisi SO kini menjaga dokumen terkait tetap aman.",
    sections: [
      {
        title: "Kas, Bank, dan Laporan",
        changes: [
          "Menu Kas & Bank mencatat uang masuk dan keluar berdasarkan kas atau rekening yang digunakan.",
          "Transaksi dapat dikaitkan ke Sales Order, Invoice, Pembelian, supplier, customer, PPN, dan batch kas kecil.",
          "Dashboard Finance memakai transaksi Kas & Bank sebagai sumber cash flow aktual.",
          "Laporan profit aktual per Sales Order membandingkan penjualan sebelum PPN dengan biaya keluar yang dialokasikan ke SO.",
        ],
      },
      {
        title: "Sales Order dan Pengiriman",
        changes: [
          "Perubahan SO yang sudah memiliki Surat Jalan atau Invoice disimpan sebagai revisi dan menampilkan jumlah dokumen yang perlu diperiksa.",
          "Dokumen Surat Jalan dan Invoice lama tidak diubah otomatis ketika SO direvisi.",
          "Jumlah pengiriman divalidasi terhadap sisa barang SO dan SO yang sudah dipakai tidak dapat dihapus langsung.",
        ],
      },
      {
        title: "Supplier",
        changes: [
          "Profil supplier kini memuat alamat, NPWP, PIC, telepon, email, kategori barang, catatan, status aktif, serta link kartu nama, katalog, atau price list.",
        ],
      },
    ],
  },
  {
    id: "2026-09-02-operational-ui-update",
    version: "2026.09.02",
    date: "2026-09-02",
    title: "Pembaruan Operasional dan Tampilan Aplikasi",
    summary: "Tampilan aplikasi, pengelolaan daftar data, monitoring Sales Order dan tagihan, pengaturan pembayaran, serta riwayat dokumen kini lebih lengkap.",
    sections: [
      {
        title: "Tampilan dan Navigasi",
        changes: [
          "Tampilan aplikasi diperbarui dengan gaya ERP yang lebih ringkas dan konsisten di desktop maupun perangkat mobile.",
          "Panel filter kini memiliki padding, label field, dan area tombol Reset serta Terapkan yang lebih rapi dan konsisten seperti aplikasi ERP.",
          "Menu sidebar kini dilengkapi ikon dan dikelompokkan berdasarkan Ringkasan, Penjualan, Pembelian, Keuangan, dan Data Master.",
          "Halaman utama, form, laporan, tombol, notifikasi, dialog konfirmasi, pagination, serta mode gelap dirapikan agar lebih mudah digunakan.",
        ],
      },
      {
        title: "Daftar Data dan Filter",
        changes: [
          "Halaman Customer, Supplier, Surat Jalan, Invoice, Sales Order, Pembelian, dan User menggunakan tampilan daftar yang lebih seragam.",
          "Filter per kolom, pengurutan data, dan pengaturan kolom tampil atau tersembunyi membantu pencarian data lebih cepat.",
          "Filter tabel diterapkan melalui tombol Terapkan Filter atau tombol Enter agar perubahan beberapa field dapat diproses sekaligus.",
          "Pencarian nama barang pada Sales Order, Surat Jalan, dan Invoice juga mencakup spesifikasi atau deskripsi barang.",
          "Daftar Sales Order, Surat Jalan, dan Invoice kini memprioritaskan kolom utama; nomor dokumen dapat langsung dibuka tanpa tombol Pilih Row.",
          "Header daftar dan tombol tambah data dibuat konsisten, termasuk penyempurnaan tampilan loading, pesan status, dan aksi tabel.",
        ],
      },
      {
        title: "Term of Payment",
        changes: [
          "TOP default customer otomatis diterapkan ke Sales Order dan Invoice.",
          "TOP customer existing dan tanggal jatuh tempo Invoice lama dapat diselaraskan melalui migrasi berdasarkan daftar ketentuan pembayaran customer.",
          "Mendukung Net 30, Net 60, Cash Before Delivery, Cash on Delivery, serta DP dan pelunasan bertahap.",
          "Tanggal jatuh tempo tersimpan dan dapat disesuaikan pada setiap dokumen.",
        ],
      },
      {
        title: "Dashboard dan Reminder",
        changes: [
          "Dashboard Penjualan menampilkan omzet, tren bulanan, status pembayaran, customer teratas, dan produk terlaris berdasarkan invoice.",
          "Dashboard Finance khusus admin merangkum kas masuk dan keluar, arus kas bersih, PPN, piutang, hutang pembelian, umur piutang, serta invoice yang segera jatuh tempo.",
          "Daftar tagihan belum dibayar dapat difilter dan dikelompokkan berdasarkan customer atau bulan pembayaran.",
          "Daftar Sales Order dapat difilter untuk melihat SO yang belum memiliki Surat Jalan atau sudah siap dibuatkan Invoice.",
          "Tabel Sales Order menampilkan seluruh Surat Jalan dan Invoice terkait beserta tanggal dan status proses yang sama dengan Dashboard SO.",
          "Tabel Surat Jalan menampilkan apakah pengiriman barang untuk SO terkait masih sebagian atau sudah lengkap.",
          "Nomor SO, Surat Jalan, dan Invoice pada kartu Kanban dapat dibuka langsung ke dokumen masing-masing.",
          "Halaman dokumen Sales Order menampilkan status, seluruh Surat Jalan dan Invoice terkait, serta rincian barang yang belum dikirim atau belum ditagih.",
          "Status Billed dihitung dari total nilai Invoice yang dialokasikan ke masing-masing SO, termasuk gabungan beberapa Invoice dan Invoice yang memuat banyak SO.",
          "Kanban Sales Order tetap menampilkan status dan umur proses tanpa memenuhi kartu dengan rincian barang.",
          "Indikator hijau, kuning, oranye, dan merah memudahkan pemantauan tingkat keterlambatan.",
        ],
      },
      {
        title: "Dokumen dan Cetak",
        changes: [
          "Nomor Sales Order wajib unik dan tidak dapat digunakan kembali pada dokumen baru maupun saat mengubah dokumen.",
          "Nilai Sales Order dihitung dari total harga seluruh barang dan tidak lagi ditimpa oleh grand total Invoice; status billing membandingkan subtotal barang yang setara tanpa PPN.",
          "Tautan dan judul halaman Sales Order kini menggunakan nama Sales Order, termasuk URL baru /salesOrder.",
          "Sales Order dapat dicetak dengan format yang konsisten dengan Invoice.",
          "Catatan bagian bawah hasil cetak menyesuaikan TOP pada Sales Order atau Invoice.",
        ],
      },
      {
        title: "Performa",
        changes: [
          "Dashboard Penjualan dan Finance menggunakan endpoint agregasi khusus agar browser tidak perlu memuat seluruh dokumen untuk menghitung ringkasan.",
          "Dashboard Sales Order memuat data SO, Surat Jalan, Invoice, dan customer melalui satu request terintegrasi.",
          "Query tabel dan relasi dokumen dioptimalkan dengan index serta pemrosesan data secara bulk di backend.",
        ],
      },
      {
        title: "Riwayat Perubahan",
        changes: [
          "Sales Order, Surat Jalan, Invoice, dan Pembelian memiliki log perubahan masing-masing.",
          "Perubahan field dan item menampilkan nilai sebelum dan sesudah beserta pengguna dan waktunya.",
        ],
      },
    ],
  },
];
