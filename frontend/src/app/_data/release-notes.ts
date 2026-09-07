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
