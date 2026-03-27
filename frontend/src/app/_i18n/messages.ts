export const supportedLocales = ["id", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "id";
export const localeStorageKey = "ppp_locale";

type MessageDictionary = Record<string, string>;

export const messages: Record<Locale, MessageDictionary> = {
  id: {
    "brand.name": "PRIMA PUTRA PERKASA",
    "nav.home": "Beranda",
    "nav.login": "Login",
    "nav.customer": "Customer",
    "nav.suratJalan": "Surat Jalan",
    "nav.invoice": "Invoice",
    "nav.pembelian": "Pembelian",
    "nav.menu": "Menu",
    "nav.theme": "Tema",
    "nav.logout": "Logout",
    "nav.sidebar.subtitle": "Dashboard Surat Jalan",
    "nav.language": "Bahasa",
    "nav.language.id": "Indonesia",
    "nav.language.en": "English",

    "home.title": "Frontend Surat Jalan",
    "home.description":
      "Pilih halaman yang ingin digunakan: Surat Jalan, Invoice, Pembelian, atau Customer.",
    "home.route.customer.title": "Customer",
    "home.route.customer.description":
      "Halaman customer dengan tabel, filter field, serta form dan preview sesuai schema backend.",
    "home.route.customer.cta": "Buka Customer",
    "home.route.suratJalan.title": "Surat Jalan",
    "home.route.suratJalan.description":
      "Halaman Surat Jalan dengan tabel, filter field, serta form dan preview dalam satu halaman.",
    "home.route.suratJalan.cta": "Buka Surat Jalan",
    "home.route.invoice.title": "Invoice",
    "home.route.invoice.description":
      "Halaman invoice dengan field sesuai schema backend, termasuk barang, PPN, dan kalkulasi total.",
    "home.route.invoice.cta": "Buka Invoice",
    "home.route.pembelian.title": "Pembelian",
    "home.route.pembelian.description":
      "Halaman pembelian dengan tabel, filter field, serta form dan preview sesuai schema backend.",
    "home.route.pembelian.cta": "Buka Pembelian",
    "login.title": "Login",
    "login.description":
      "Masuk menggunakan username dan password untuk mengakses dashboard.",
    "login.submit": "Masuk",
    "login.error.default": "Gagal login. Periksa username/password lalu coba lagi.",
    "common.resetFilter": "Reset Filter",
    "common.filterByField": "Filter Berdasarkan Field",
    "common.action": "Aksi",
    "common.selected": "Terpilih",
    "common.selectRow": "Pilih Row",
    "common.filterResult": "Hasil filter: {{count}} data",
    "common.totalData": "Total data: {{count}}",
    "common.all": "Semua",
    "common.optional": "Opsional",
    "common.retry": "Coba Lagi",
    "common.noData": "Belum ada data.",
    "common.saveChanges": "Simpan Perubahan",
    "common.newData": "Data Baru",
    "common.export": "Export",
    "common.delete": "Hapus",
    "common.cancel": "Batal",
    "common.close": "Tutup",
    "common.resetForm": "Reset Form",
    "common.noItems": "Belum ada barang.",
    "common.loading": "Memuat...",
    "common.true": "true",
    "common.false": "false",
    "theme.light": "Terang",
    "theme.dark": "Gelap",

    "customer.page.description":
      "Page customer disesuaikan dengan field schema backend: nama, alamat, dan atasNama.",
    "customer.table.title": "Tabel Customer",
    "customer.form.title": "Form Edit + Preview Customer",
    "customer.form.description":
      "Field disesuaikan dengan schema backend customer: nama, alamat, dan atasNama.",
    "customer.preview.title": "Preview Customer",
    "customer.apiLoadError": "Gagal memuat data customer dari backend.",
    "customer.mutationError": "Gagal memproses perubahan customer.",
    "customer.adminOnlyAction": "Tambah, ubah, dan hapus customer hanya untuk admin.",
    "customer.deleteConfirm": "Hapus data customer ini?",
    "customer.confirmUpdateTitle": "Konfirmasi Ubah Data Customer",
    "customer.confirmUpdateDescription":
      "Simpan perubahan data untuk customer \"{{nama}}\"?",
    "customer.confirmDeleteTitle": "Konfirmasi Hapus Customer",
    "customer.confirmDeleteDescription":
      "Data customer \"{{nama}}\" akan dihapus permanen. Lanjutkan?",
    "customer.toast.createSuccess": "Data customer berhasil ditambahkan.",
    "customer.toast.updateSuccess": "Data customer \"{{nama}}\" berhasil diperbarui.",
    "customer.toast.deleteSuccess": "Data customer \"{{nama}}\" berhasil dihapus.",

    "invoice.page.description":
      "Page invoice disesuaikan dengan field schema backend: tanggal, noInvoice, noPo, noSuratJalan, namaCustomer, barang, isPpn, ppnRate, subtotal, ppnAmount, dan grandTotal.",
    "invoice.table.title": "Tabel Invoice",
    "invoice.form.title": "Form Edit + Preview Invoice",
    "invoice.form.description":
      "Field disesuaikan dengan schema backend invoice. Nilai subtotal, ppnAmount, dan grandTotal dihitung otomatis.",
    "invoice.form.noPoSelectPlaceholder": "Pilih noPo...",
    "invoice.form.noPoNoOptions": "Belum ada noPo dari surat jalan.",
    "invoice.form.customerAutoHint": "Customer diisi otomatis dari noPo yang dipilih.",
    "invoice.form.noSuratJalanHint": "Pilih satu atau lebih noSuratJalan berdasarkan noPo.",
    "invoice.form.noSuratJalanSelectPlaceholder": "Pilih noSuratJalan...",
    "invoice.form.noSuratJalanNoOptions": "Belum ada noSuratJalan untuk noPo ini.",
    "invoice.form.noSuratJalanDisabledHint": "Pilih noPo terlebih dahulu.",
    "invoice.form.items.title": "barang (namaBarang, kuantitas, unit, hargaSatuan)",
    "invoice.form.items.hint":
      "Baris kosong baru akan muncul otomatis saat baris terakhir mulai diisi.",
    "invoice.form.items.placeholder.name": "namaBarang",
    "invoice.form.items.placeholder.qty": "kuantitas",
    "invoice.form.items.placeholder.unit": "unit",
    "invoice.form.items.placeholder.price": "hargaSatuan",
    "invoice.preview.title": "Preview Invoice",
    "invoice.apiLoadError": "Gagal memuat data invoice dari backend.",
    "invoice.customerLoadError": "Gagal memuat pilihan customer untuk invoice.",
    "invoice.suratJalanLoadError": "Gagal memuat pilihan surat jalan untuk invoice.",
    "invoice.mutationError": "Gagal memproses perubahan invoice.",
    "invoice.confirmUpdateTitle": "Konfirmasi Ubah Invoice",
    "invoice.confirmUpdateDescription":
      "Simpan perubahan untuk invoice \"{{noInvoice}}\"?",
    "invoice.confirmDeleteTitle": "Konfirmasi Hapus Invoice",
    "invoice.confirmDeleteDescription":
      "Invoice \"{{noInvoice}}\" akan dihapus permanen. Lanjutkan?",
    "invoice.toast.createSuccess": "Invoice \"{{noInvoice}}\" berhasil ditambahkan.",
    "invoice.toast.updateSuccess": "Invoice \"{{noInvoice}}\" berhasil diperbarui.",
    "invoice.toast.deleteSuccess": "Invoice \"{{noInvoice}}\" berhasil dihapus.",
    "invoice.postCreateModal.title": "Invoice Berhasil Dibuat",
    "invoice.postCreateModal.description":
      "Invoice \"{{noInvoice}}\" (NoPO: {{noPo}}) berhasil dibuat. Anda dapat mengekspor invoice atau lanjut membuat data pembelian baru.",
    "invoice.postUpdateModal.title": "Invoice Berhasil Diperbarui",
    "invoice.postUpdateModal.description":
      "Invoice \"{{noInvoice}}\" (NoPO: {{noPo}}) berhasil diperbarui. Anda dapat mengekspor invoice.",
    "invoice.postSaveModal.exportButton": "Export Invoice",
    "invoice.postSaveModal.createPembelianButton": "Buat Pembelian Baru",

    "suratJalan.page.description":
      "Page surat jalan disesuaikan dengan field schema backend: noSuratJalan, noPo, kodeDepartemen, tanggal, namaCustomer, barang, kendaraan, dan tipe.",
    "suratJalan.table.title": "Tabel Surat Jalan",
    "suratJalan.table.exportNoPoButton": "Export NoPO",
    "suratJalan.form.title": "Form Edit + Preview",
    "suratJalan.form.description":
      "Klik baris pada tabel untuk mengisi form dan melihat preview.",
    "suratJalan.form.noPoHint": "Pilih NoPO yang sudah ada atau ketik NoPO baru.",
    "suratJalan.form.noPoSelectPlaceholder": "Pilih atau ketik NoPO...",
    "suratJalan.form.noPoNoOptions": "Belum ada NoPO yang cocok.",
    "suratJalan.form.noPoCreateLabel": "Gunakan \"{{value}}\" sebagai NoPO baru",
    "suratJalan.form.customerLockedByNoPo":
      "Nama customer mengikuti data NoPO yang dipilih dan tidak dapat diubah.",
    "suratJalan.form.items.title": "barang",
    "suratJalan.form.items.hint":
      "Isi nama, spesifikasi (opsional), jumlah, dan unit. Baris kosong baru akan muncul otomatis.",
    "suratJalan.form.items.placeholder.name": "nama barang",
    "suratJalan.form.items.placeholder.spec": "spesifikasi (opsional)",
    "suratJalan.form.items.placeholder.qty": "jumlah",
    "suratJalan.form.items.placeholder.unit": "unit",
    "suratJalan.preview.title": "Preview Surat Jalan",
    "suratJalan.apiLoadError": "Gagal memuat data surat jalan dari backend.",
    "suratJalan.customerLoadError": "Gagal memuat pilihan customer untuk surat jalan.",
    "suratJalan.mutationError": "Gagal memproses perubahan surat jalan.",
    "suratJalan.confirmUpdateTitle": "Konfirmasi Ubah Surat Jalan",
    "suratJalan.confirmUpdateDescription":
      "Simpan perubahan untuk surat jalan \"{{noSuratJalan}}\"?",
    "suratJalan.confirmDeleteTitle": "Konfirmasi Hapus Surat Jalan",
    "suratJalan.confirmDeleteDescription":
      "Surat jalan \"{{noSuratJalan}}\" akan dihapus permanen. Lanjutkan?",
    "suratJalan.toast.createSuccess":
      "Surat jalan \"{{noSuratJalan}}\" berhasil ditambahkan.",
    "suratJalan.toast.updateSuccess":
      "Surat jalan \"{{noSuratJalan}}\" berhasil diperbarui.",
    "suratJalan.toast.deleteSuccess":
      "Surat jalan \"{{noSuratJalan}}\" berhasil dihapus.",
    "suratJalan.postCreateModal.partialTitle": "Surat Jalan Berhasil Dibuat",
    "suratJalan.postCreateModal.partialDescription":
      "Surat jalan \"{{noSuratJalan}}\" (NoPO: {{noPo}}) bertipe partial. Anda dapat mengekspor surat jalan.",
    "suratJalan.postCreateModal.nonPartialTitle": "Surat Jalan Non Partial Dibuat",
    "suratJalan.postCreateModal.nonPartialDescription":
      "Surat jalan \"{{noSuratJalan}}\" (NoPO: {{noPo}}) bertipe non partial. Anda dapat mengekspor surat jalan atau lanjut membuat invoice dari data NoPO ini.",
    "suratJalan.postUpdateModal.partialTitle": "Surat Jalan Berhasil Diperbarui",
    "suratJalan.postUpdateModal.partialDescription":
      "Surat jalan \"{{noSuratJalan}}\" (NoPO: {{noPo}}) bertipe partial sudah diperbarui. Anda dapat mengekspor surat jalan.",
    "suratJalan.postUpdateModal.nonPartialTitle": "Surat Jalan Non Partial Diperbarui",
    "suratJalan.postUpdateModal.nonPartialDescription":
      "Surat jalan \"{{noSuratJalan}}\" (NoPO: {{noPo}}) bertipe non partial sudah diperbarui. Anda dapat mengekspor surat jalan atau lanjut membuat invoice dari data NoPO ini.",
    "suratJalan.postCreateModal.exportButton": "Export Surat Jalan",
    "suratJalan.postCreateModal.createInvoiceButton": "Buat Invoice",

    "pembelian.page.description":
      "Page pembelian disesuaikan dengan field schema backend: tanggalNota, namaSupplier, noNpwp, noInvoice, hutang, ppn, lamaHutang, nilaiNota, tanggalJatuhTempo, dan tanggalBayar.",
    "pembelian.table.title": "Tabel Pembelian",
    "pembelian.form.title": "Form Edit + Preview Pembelian",
    "pembelian.form.description":
      "Field disesuaikan dengan schema backend pembelian. lamaHutang dan tanggalJatuhTempo wajib saat hutang bernilai true.",
    "pembelian.lamaHutang.note": "Dalam hitungan hari",
    "pembelian.preview.title": "Preview Pembelian",
    "pembelian.apiLoadError": "Gagal memuat data pembelian dari backend.",
    "pembelian.invoiceLoadError": "Gagal memuat pilihan invoice untuk pembelian.",
    "pembelian.mutationError": "Gagal memproses perubahan pembelian.",
    "pembelian.invoiceRequired": "Invoice wajib dipilih sebelum menyimpan pembelian.",
    "pembelian.confirmUpdateTitle": "Konfirmasi Ubah Pembelian",
    "pembelian.confirmUpdateDescription":
      "Simpan perubahan data pembelian untuk supplier \"{{namaSupplier}}\"?",
    "pembelian.confirmDeleteTitle": "Konfirmasi Hapus Pembelian",
    "pembelian.confirmDeleteDescription":
      "Data pembelian supplier \"{{namaSupplier}}\" akan dihapus permanen. Lanjutkan?",
    "pembelian.toast.createSuccess": "Data pembelian berhasil ditambahkan.",
    "pembelian.toast.updateSuccess":
      "Data pembelian supplier \"{{namaSupplier}}\" berhasil diperbarui.",
    "pembelian.toast.deleteSuccess":
      "Data pembelian supplier \"{{namaSupplier}}\" berhasil dihapus.",

    "field.nama": "nama",
    "field.username": "username",
    "field.password": "password",
    "field.alamat": "alamat",
    "field.atasNama": "atasNama",
    "field.noInvoice": "noInvoice",
    "field.tanggal": "tanggal",
    "field.noPo": "noPo",
    "field.kodeDepartemen": "kodeDepartemen",
    "field.noSuratJalan": "noSuratJalan",
    "field.idCustomer": "idCustomer",
    "field.namaCustomer": "nama Customer",
    "field.subtotal": "subtotal",
    "field.ppnAmount": "ppnAmount",
    "field.grandTotal": "grandTotal",
    "field.isPpn": "isPpn",
    "field.tanggalDari": "tanggal Dari",
    "field.tanggalSampai": "tanggal Sampai",
    "field.kendaraan": "kendaraan",
    "field.tipe": "tipe",
    "field.barang": "barang",
    "field.spesifikasi": "spesifikasi",
    "field.unit": "unit",
    "field.namaBarang": "namaBarang",
    "field.ppnRate": "ppnRate",
    "field.tanggalNota": "tanggalNota",
    "field.namaSupplier": "namaSupplier",
    "field.noNpwp": "noNpwp",
    "field.idInvoice": "idInvoice",
    "field.hutang": "hutang",
    "field.ppn": "ppn",
    "field.lamaHutang": "lamaHutang",
    "field.nilaiNota": "nilaiNota",
    "field.tanggalJatuhTempo": "tanggalJatuhTempo",
    "field.tanggalBayar": "tanggalBayar",
    "field.nilaiNotaMin": "nilaiNota Min",
    "field.nilaiNotaMax": "nilaiNota Max",
    "field.tanggalBayarDari": "tanggalBayar Dari",
    "field.tanggalBayarSampai": "tanggalBayar Sampai",
  },
  en: {
    "brand.name": "PRIMA PUTRA PERKASA",
    "nav.home": "Home",
    "nav.login": "Login",
    "nav.customer": "Customer",
    "nav.suratJalan": "Delivery Note",
    "nav.invoice": "Invoice",
    "nav.pembelian": "Purchase",
    "nav.menu": "Menu",
    "nav.theme": "Theme",
    "nav.logout": "Logout",
    "nav.sidebar.subtitle": "Delivery Dashboard",
    "nav.language": "Language",
    "nav.language.id": "Indonesia",
    "nav.language.en": "English",

    "home.title": "Delivery Frontend",
    "home.description":
      "Choose a page to use: Delivery Note, Invoice, Purchase, or Customer.",
    "home.route.customer.title": "Customer",
    "home.route.customer.description":
      "Customer page with table, field filters, and form plus preview based on backend schema.",
    "home.route.customer.cta": "Open Customer",
    "home.route.suratJalan.title": "Delivery Note",
    "home.route.suratJalan.description":
      "Delivery Note page with table, field filters, and form plus preview in one page.",
    "home.route.suratJalan.cta": "Open Delivery Note",
    "home.route.invoice.title": "Invoice",
    "home.route.invoice.description":
      "Invoice page with backend schema fields, including Items, VAT, and total calculation.",
    "home.route.invoice.cta": "Open Invoice",
    "home.route.pembelian.title": "Purchase",
    "home.route.pembelian.description":
      "Purchase page with table, field filters, and form plus preview based on backend schema.",
    "home.route.pembelian.cta": "Open Purchase",
    "login.title": "Login",
    "login.description":
      "Sign in with username and password to access the dashboard.",
    "login.submit": "Sign In",
    "login.error.default": "Login failed. Check username/password and try again.",
    "common.resetFilter": "Reset Filter",
    "common.filterByField": "Filter by Field",
    "common.action": "Action",
    "common.selected": "Selected",
    "common.selectRow": "Select Row",
    "common.filterResult": "Filtered result: {{count}} rows",
    "common.totalData": "Total rows: {{count}}",
    "common.all": "All",
    "common.optional": "Optional",
    "common.retry": "Retry",
    "common.noData": "No data available.",
    "common.saveChanges": "Save Changes",
    "common.newData": "New Data",
    "common.export": "Export",
    "common.delete": "Delete",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.resetForm": "Reset Form",
    "common.noItems": "No items yet.",
    "common.loading": "Loading...",
    "common.true": "true",
    "common.false": "false",
    "theme.light": "Light",
    "theme.dark": "Dark",

    "customer.page.description":
      "Customer page aligned with backend schema fields: nama, alamat, and atasNama.",
    "customer.table.title": "Customer Table",
    "customer.form.title": "Edit Form + Customer Preview",
    "customer.form.description":
      "Fields are aligned with customer backend schema: nama, alamat, and atasNama.",
    "customer.preview.title": "Customer Preview",
    "customer.apiLoadError": "Failed to load customer data from backend.",
    "customer.mutationError": "Failed to process customer changes.",
    "customer.adminOnlyAction": "Create, update, and delete customer are admin-only actions.",
    "customer.deleteConfirm": "Delete this customer?",
    "customer.confirmUpdateTitle": "Confirm Customer Update",
    "customer.confirmUpdateDescription":
      "Save changes for customer \"{{nama}}\"?",
    "customer.confirmDeleteTitle": "Confirm Customer Deletion",
    "customer.confirmDeleteDescription":
      "Customer \"{{nama}}\" will be deleted permanently. Continue?",
    "customer.toast.createSuccess": "Customer has been added successfully.",
    "customer.toast.updateSuccess": "Customer \"{{nama}}\" has been updated successfully.",
    "customer.toast.deleteSuccess": "Customer \"{{nama}}\" has been deleted successfully.",

    "invoice.page.description":
      "Invoice page aligned with backend schema fields: tanggal, noInvoice, noPo, noSuratJalan, customerName, barang, isPpn, ppnRate, subtotal, ppnAmount, and grandTotal.",
    "invoice.table.title": "Invoice Table",
    "invoice.form.title": "Edit Form + Invoice Preview",
    "invoice.form.description":
      "Fields are aligned with invoice backend schema. subtotal, ppnAmount, and grandTotal are auto-calculated.",
    "invoice.form.noPoSelectPlaceholder": "Select noPo...",
    "invoice.form.noPoNoOptions": "No noPo options from delivery notes yet.",
    "invoice.form.customerAutoHint": "Customer is filled automatically from the selected noPo.",
    "invoice.form.noSuratJalanHint": "Select one or more noSuratJalan based on noPo.",
    "invoice.form.noSuratJalanSelectPlaceholder": "Select noSuratJalan...",
    "invoice.form.noSuratJalanNoOptions": "No noSuratJalan available for this noPo.",
    "invoice.form.noSuratJalanDisabledHint": "Select noPo first.",
    "invoice.form.items.title": "Items (ItemName, Quantity, unit, UnitPrice)",
    "invoice.form.items.hint": "A new empty row is added when the last row starts being filled.",
    "invoice.form.items.placeholder.name": "Item name",
    "invoice.form.items.placeholder.qty": "Quantity",
    "invoice.form.items.placeholder.unit": "unit",
    "invoice.form.items.placeholder.price": "Unit Price",
    "invoice.preview.title": "Invoice Preview",
    "invoice.apiLoadError": "Failed to load invoice data from backend.",
    "invoice.customerLoadError": "Failed to load customer options for invoice.",
    "invoice.suratJalanLoadError": "Failed to load delivery note options for invoice.",
    "invoice.mutationError": "Failed to process invoice changes.",
    "invoice.confirmUpdateTitle": "Confirm Invoice Update",
    "invoice.confirmUpdateDescription":
      "Save changes for invoice \"{{noInvoice}}\"?",
    "invoice.confirmDeleteTitle": "Confirm Invoice Deletion",
    "invoice.confirmDeleteDescription":
      "Invoice \"{{noInvoice}}\" will be deleted permanently. Continue?",
    "invoice.toast.createSuccess": "Invoice \"{{noInvoice}}\" has been added successfully.",
    "invoice.toast.updateSuccess": "Invoice \"{{noInvoice}}\" has been updated successfully.",
    "invoice.toast.deleteSuccess": "Invoice \"{{noInvoice}}\" has been deleted successfully.",
    "invoice.postCreateModal.title": "Invoice Created",
    "invoice.postCreateModal.description":
      "Invoice \"{{noInvoice}}\" (noPo: {{noPo}}) was created successfully. You can export this invoice or continue creating a new purchase record.",
    "invoice.postUpdateModal.title": "Invoice Updated",
    "invoice.postUpdateModal.description":
      "Invoice \"{{noInvoice}}\" (noPo: {{noPo}}) was updated successfully. You can export this invoice.",
    "invoice.postSaveModal.exportButton": "Export Invoice",
    "invoice.postSaveModal.createPembelianButton": "Create New Purchase",

    "suratJalan.page.description":
      "Delivery Note page aligned with backend schema fields: noSuratJalan, noPo, kodeDepartemen, tanggal, customerName, barang, kendaraan, and tipe.",
    "suratJalan.table.title": "Delivery Note Table",
    "suratJalan.table.exportNoPoButton": "Export noPo",
    "suratJalan.form.title": "Edit Form + Preview",
    "suratJalan.form.description":
      "Click a table row to fill the form and see the preview.",
    "suratJalan.form.noPoHint":
      "Select an existing noPo or type a new noPo value.",
    "suratJalan.form.noPoSelectPlaceholder": "Select or type noPo...",
    "suratJalan.form.noPoNoOptions": "No matching noPo found.",
    "suratJalan.form.noPoCreateLabel": "Use \"{{value}}\" as a new noPo",
    "suratJalan.form.customerLockedByNoPo":
      "Customer follows the selected noPo data and cannot be changed.",
    "suratJalan.form.items.title": "Items",
    "suratJalan.form.items.hint":
      "Fill item name, specification (optional), quantity, and unit. A new empty row will appear automatically.",
    "suratJalan.form.items.placeholder.name": "Item name",
    "suratJalan.form.items.placeholder.spec": "Specification (optional)",
    "suratJalan.form.items.placeholder.qty": "Quantity",
    "suratJalan.form.items.placeholder.unit": "unit",
    "suratJalan.preview.title": "Delivery Note Preview",
    "suratJalan.apiLoadError": "Failed to load delivery note data from backend.",
    "suratJalan.customerLoadError":
      "Failed to load customer options for delivery note.",
    "suratJalan.mutationError": "Failed to process delivery note changes.",
    "suratJalan.confirmUpdateTitle": "Confirm Delivery Note Update",
    "suratJalan.confirmUpdateDescription":
      "Save changes for delivery note \"{{noSuratJalan}}\"?",
    "suratJalan.confirmDeleteTitle": "Confirm Delivery Note Deletion",
    "suratJalan.confirmDeleteDescription":
      "Delivery note \"{{noSuratJalan}}\" will be deleted permanently. Continue?",
    "suratJalan.toast.createSuccess":
      "Delivery note \"{{noSuratJalan}}\" has been added successfully.",
    "suratJalan.toast.updateSuccess":
      "Delivery note \"{{noSuratJalan}}\" has been updated successfully.",
    "suratJalan.toast.deleteSuccess":
      "Delivery note \"{{noSuratJalan}}\" has been deleted successfully.",
    "suratJalan.postCreateModal.partialTitle": "Delivery Note Created",
    "suratJalan.postCreateModal.partialDescription":
      "Delivery note \"{{noSuratJalan}}\" (noPo: {{noPo}}) is partial. You can export this delivery note.",
    "suratJalan.postCreateModal.nonPartialTitle": "Non Partial Delivery Note Created",
    "suratJalan.postCreateModal.nonPartialDescription":
      "Delivery note \"{{noSuratJalan}}\" (noPo: {{noPo}}) is non partial. You can export it or continue to create an invoice from this noPo data.",
    "suratJalan.postUpdateModal.partialTitle": "Delivery Note Updated",
    "suratJalan.postUpdateModal.partialDescription":
      "Delivery note \"{{noSuratJalan}}\" (noPo: {{noPo}}) is partial and has been updated. You can export this delivery note.",
    "suratJalan.postUpdateModal.nonPartialTitle": "Non Partial Delivery Note Updated",
    "suratJalan.postUpdateModal.nonPartialDescription":
      "Delivery note \"{{noSuratJalan}}\" (noPo: {{noPo}}) is non partial and has been updated. You can export it or continue to create an invoice from this noPo data.",
    "suratJalan.postCreateModal.exportButton": "Export Delivery Note",
    "suratJalan.postCreateModal.createInvoiceButton": "Create Invoice",

    "pembelian.page.description":
      "Purchase page aligned with backend schema fields: tanggalNota, namaSupplier, noNpwp, noInvoice, hutang, ppn, lamaHutang, nilaiNota, tanggalJatuhTempo, and tanggalBayar.",
    "pembelian.table.title": "Purchase Table",
    "pembelian.form.title": "Edit Form + Purchase Preview",
    "pembelian.form.description":
      "Fields are aligned with purchase backend schema. lamaHutang and tanggalJatuhTempo are required when hutang is true.",
    "pembelian.lamaHutang.note": "Measured in days",
    "pembelian.preview.title": "Purchase Preview",
    "pembelian.apiLoadError": "Failed to load purchase data from backend.",
    "pembelian.invoiceLoadError": "Failed to load invoice options for purchase.",
    "pembelian.mutationError": "Failed to process purchase changes.",
    "pembelian.invoiceRequired": "Invoice must be selected before saving purchase data.",
    "pembelian.confirmUpdateTitle": "Confirm Purchase Update",
    "pembelian.confirmUpdateDescription":
      "Save purchase changes for supplier \"{{namaSupplier}}\"?",
    "pembelian.confirmDeleteTitle": "Confirm Purchase Deletion",
    "pembelian.confirmDeleteDescription":
      "Purchase data for supplier \"{{namaSupplier}}\" will be deleted permanently. Continue?",
    "pembelian.toast.createSuccess": "Purchase data has been added successfully.",
    "pembelian.toast.updateSuccess":
      "Purchase data for supplier \"{{namaSupplier}}\" has been updated successfully.",
    "pembelian.toast.deleteSuccess":
      "Purchase data for supplier \"{{namaSupplier}}\" has been deleted successfully.",

    "field.nama": "Name",
    "field.username": "username",
    "field.password": "password",
    "field.alamat": "Address",
    "field.atasNama": "Attention Name",
    "field.noInvoice": "noInvoice",
    "field.tanggal": "Date",
    "field.noPo": "noPo",
    "field.kodeDepartemen": "departmentCode",
    "field.noSuratJalan": "noSuratJalan",
    "field.idCustomer": "idCustomer",
    "field.namaCustomer": "Customer Name",
    "field.subtotal": "subtotal",
    "field.ppnAmount": "ppnAmount",
    "field.grandTotal": "grandTotal",
    "field.isPpn": "isPpn",
    "field.tanggalDari": "Date From",
    "field.tanggalSampai": "Date To",
    "field.kendaraan": "Vehicle",
    "field.tipe": "Type",
    "field.barang": "Items",
    "field.spesifikasi": "Specification",
    "field.unit": "unit",
    "field.namaBarang": "ItemName",
    "field.ppnRate": "ppnRate",
    "field.tanggalNota": "tanggalNota",
    "field.namaSupplier": "namaSupplier",
    "field.noNpwp": "noNpwp",
    "field.idInvoice": "idInvoice",
    "field.hutang": "hutang",
    "field.ppn": "ppn",
    "field.lamaHutang": "lamaHutang",
    "field.nilaiNota": "nilaiNota",
    "field.tanggalJatuhTempo": "tanggalJatuhTempo",
    "field.tanggalBayar": "tanggalBayar",
    "field.nilaiNotaMin": "Min nilaiNota",
    "field.nilaiNotaMax": "Max nilaiNota",
    "field.tanggalBayarDari": "tanggalBayar From",
    "field.tanggalBayarSampai": "tanggalBayar To",
  },
};

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}
