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
    "common.retry": "Coba Lagi",
    "common.noData": "Belum ada data.",
    "common.saveChanges": "Simpan Perubahan",
    "common.resetForm": "Reset Form",
    "common.noItems": "Belum ada barang.",
    "common.loading": "Memuat...",
    "common.true": "true",
    "common.false": "false",

    "customer.page.description":
      "Page customer disesuaikan dengan field schema backend: nama, alamat, dan atasNama.",
    "customer.table.title": "Tabel Customer",
    "customer.form.title": "Form Edit + Preview Customer",
    "customer.form.description":
      "Field disesuaikan dengan schema backend customer: nama, alamat, dan atasNama.",
    "customer.preview.title": "Preview Customer",
    "customer.apiLoadError": "Gagal memuat data customer dari backend.",

    "invoice.page.description":
      "Page invoice disesuaikan dengan field schema backend: tanggal, noInvoice, noPo, noSuratJalan, namaCustomer, barang, isPpn, ppnRate, subtotal, ppnAmount, dan grandTotal.",
    "invoice.table.title": "Tabel Invoice",
    "invoice.form.title": "Form Edit + Preview Invoice",
    "invoice.form.description":
      "Field disesuaikan dengan schema backend invoice. Nilai subtotal, ppnAmount, dan grandTotal dihitung otomatis.",
    "invoice.form.noSuratJalanHint": "Isi 1 noSuratJalan per baris.",
    "invoice.form.items.title": "barang (namaBarang, kuantitas, unit, hargaSatuan)",
    "invoice.form.items.hint":
      "Baris kosong baru akan muncul otomatis saat baris terakhir mulai diisi.",
    "invoice.form.items.placeholder.name": "namaBarang",
    "invoice.form.items.placeholder.qty": "kuantitas",
    "invoice.form.items.placeholder.unit": "unit",
    "invoice.form.items.placeholder.price": "hargaSatuan",
    "invoice.preview.title": "Preview Invoice",

    "suratJalan.page.description":
      "Page surat jalan disesuaikan dengan field schema backend: noSuratJalan, noPo, tanggal, namaCustomer, barang, kendaraan, tipe, dan sudahSelesai.",
    "suratJalan.table.title": "Tabel Surat Jalan",
    "suratJalan.form.title": "Form Edit + Preview",
    "suratJalan.form.description":
      "Klik baris pada tabel untuk mengisi form dan melihat preview.",
    "suratJalan.form.items.title": "barang",
    "suratJalan.form.items.hint": "Isi nama dan jumlah. Baris kosong baru akan muncul otomatis.",
    "suratJalan.form.items.placeholder.name": "nama barang",
    "suratJalan.form.items.placeholder.qty": "jumlah",
    "suratJalan.preview.title": "Preview Surat Jalan",

    "pembelian.page.description":
      "Page pembelian disesuaikan dengan field schema backend: tanggalNota, namaSupplier, noNpwp, noInvoice, hutang, ppn, lamaHutang, nilaiNota, tanggalJatuhTempo, dan tanggalBayar.",
    "pembelian.table.title": "Tabel Pembelian",
    "pembelian.form.title": "Form Edit + Preview Pembelian",
    "pembelian.form.description":
      "Field disesuaikan dengan schema backend pembelian. lamaHutang dan tanggalJatuhTempo wajib saat hutang bernilai true.",
    "pembelian.lamaHutang.note": "Dalam hitungan hari",
    "pembelian.preview.title": "Preview Pembelian",

    "field.nama": "nama",
    "field.username": "username",
    "field.password": "password",
    "field.alamat": "alamat",
    "field.atasNama": "atasNama",
    "field.noInvoice": "noInvoice",
    "field.tanggal": "tanggal",
    "field.noPo": "noPo",
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
    "field.sudahSelesai": "sudahSelesai",
    "field.barang": "barang",
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
    "common.retry": "Retry",
    "common.noData": "No data available.",
    "common.saveChanges": "Save Changes",
    "common.resetForm": "Reset Form",
    "common.noItems": "No items yet.",
    "common.loading": "Loading...",
    "common.true": "true",
    "common.false": "false",

    "customer.page.description":
      "Customer page aligned with backend schema fields: nama, alamat, and atasNama.",
    "customer.table.title": "Customer Table",
    "customer.form.title": "Edit Form + Customer Preview",
    "customer.form.description":
      "Fields are aligned with customer backend schema: nama, alamat, and atasNama.",
    "customer.preview.title": "Customer Preview",
    "customer.apiLoadError": "Failed to load customer data from backend.",

    "invoice.page.description":
      "Invoice page aligned with backend schema fields: tanggal, noInvoice, noPo, noSuratJalan, customerName, barang, isPpn, ppnRate, subtotal, ppnAmount, and grandTotal.",
    "invoice.table.title": "Invoice Table",
    "invoice.form.title": "Edit Form + Invoice Preview",
    "invoice.form.description":
      "Fields are aligned with invoice backend schema. subtotal, ppnAmount, and grandTotal are auto-calculated.",
    "invoice.form.noSuratJalanHint": "Enter one noSuratJalan per line.",
    "invoice.form.items.title": "Items (ItemName, Quantity, unit, UnitPrice)",
    "invoice.form.items.hint": "A new empty row is added when the last row starts being filled.",
    "invoice.form.items.placeholder.name": "Item name",
    "invoice.form.items.placeholder.qty": "Quantity",
    "invoice.form.items.placeholder.unit": "unit",
    "invoice.form.items.placeholder.price": "Unit Price",
    "invoice.preview.title": "Invoice Preview",

    "suratJalan.page.description":
      "Delivery Note page aligned with backend schema fields: noSuratJalan, noPo, tanggal, customerName, barang, kendaraan, tipe, and sudahSelesai.",
    "suratJalan.table.title": "Delivery Note Table",
    "suratJalan.form.title": "Edit Form + Preview",
    "suratJalan.form.description":
      "Click a table row to fill the form and see the preview.",
    "suratJalan.form.items.title": "Items",
    "suratJalan.form.items.hint":
      "Fill in item name and quantity. A new empty row will appear automatically.",
    "suratJalan.form.items.placeholder.name": "Item name",
    "suratJalan.form.items.placeholder.qty": "Quantity",
    "suratJalan.preview.title": "Delivery Note Preview",

    "pembelian.page.description":
      "Purchase page aligned with backend schema fields: tanggalNota, namaSupplier, noNpwp, noInvoice, hutang, ppn, lamaHutang, nilaiNota, tanggalJatuhTempo, and tanggalBayar.",
    "pembelian.table.title": "Purchase Table",
    "pembelian.form.title": "Edit Form + Purchase Preview",
    "pembelian.form.description":
      "Fields are aligned with purchase backend schema. lamaHutang and tanggalJatuhTempo are required when hutang is true.",
    "pembelian.lamaHutang.note": "Measured in days",
    "pembelian.preview.title": "Purchase Preview",

    "field.nama": "Name",
    "field.username": "username",
    "field.password": "password",
    "field.alamat": "Address",
    "field.atasNama": "Attention Name",
    "field.noInvoice": "noInvoice",
    "field.tanggal": "Date",
    "field.noPo": "noPo",
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
    "field.sudahSelesai": "sudahSelesai",
    "field.barang": "Items",
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
