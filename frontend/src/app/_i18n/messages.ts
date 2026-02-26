export const supportedLocales = ["id", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "id";
export const localeStorageKey = "ppp_locale";

type MessageDictionary = Record<string, string>;

export const messages: Record<Locale, MessageDictionary> = {
  id: {
    "brand.name": "PRIMA PUTRA PERKASA",
    "nav.home": "Beranda",
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
      "Halaman invoice dengan field sesuai schema backend, termasuk Barang, PPN, dan kalkulasi total.",
    "home.route.invoice.cta": "Buka Invoice",
    "home.route.pembelian.title": "Pembelian",
    "home.route.pembelian.description":
      "Halaman pembelian dengan tabel, filter field, serta form dan preview sesuai schema backend.",
    "home.route.pembelian.cta": "Buka Pembelian",
    "common.resetFilter": "Reset Filter",
    "common.filterByField": "Filter Berdasarkan Field",
    "common.action": "Aksi",
    "common.selected": "Terpilih",
    "common.selectRow": "Pilih Row",
    "common.filterResult": "Hasil filter: {{count}} data",
    "common.totalData": "Total data: {{count}}",
    "common.all": "Semua",
    "common.saveChanges": "Simpan Perubahan",
    "common.resetForm": "Reset Form",
    "common.noItems": "Belum ada barang.",
    "common.loading": "Memuat...",
    "common.true": "true",
    "common.false": "false",

    "customer.page.description":
      "Page customer disesuaikan dengan field schema backend: Nama, Alamat, dan AtasNama.",
    "customer.table.title": "Tabel Customer",
    "customer.form.title": "Form Edit + Preview Customer",
    "customer.form.description":
      "Field disesuaikan dengan schema backend customer: Nama, Alamat, dan AtasNama.",
    "customer.preview.title": "Preview Customer",

    "invoice.page.description":
      "Page invoice disesuaikan dengan field schema backend: Tanggal, NoInvoice, NoPO, NoSuratJalan, NamaCustomer, Barang, IsPpn, PpnRate, Subtotal, PpnAmount, dan GrandTotal.",
    "invoice.table.title": "Tabel Invoice",
    "invoice.form.title": "Form Edit + Preview Invoice",
    "invoice.form.description":
      "Field disesuaikan dengan schema backend invoice. Nilai Subtotal, PpnAmount, dan GrandTotal dihitung otomatis.",
    "invoice.form.noSuratJalanHint": "Isi 1 NoSuratJalan per baris.",
    "invoice.form.items.title": "Barang (NamaBarang, Kuantitas, Unit, HargaSatuan)",
    "invoice.form.items.hint":
      "Baris kosong baru akan muncul otomatis saat baris terakhir mulai diisi.",
    "invoice.form.items.placeholder.name": "NamaBarang",
    "invoice.form.items.placeholder.qty": "Kuantitas",
    "invoice.form.items.placeholder.unit": "Unit",
    "invoice.form.items.placeholder.price": "HargaSatuan",
    "invoice.preview.title": "Preview Invoice",

    "suratJalan.page.description":
      "Page surat jalan disesuaikan dengan field schema backend: NoSuratJalan, NoPO, Tanggal, NamaCustomer, Barang, Kendaraan, Tipe, dan SudahSelesai.",
    "suratJalan.table.title": "Tabel Surat Jalan",
    "suratJalan.form.title": "Form Edit + Preview",
    "suratJalan.form.description":
      "Klik baris pada tabel untuk mengisi form dan melihat preview.",
    "suratJalan.form.items.title": "Barang",
    "suratJalan.form.items.hint": "Isi nama dan jumlah. Baris kosong baru akan muncul otomatis.",
    "suratJalan.form.items.placeholder.name": "Nama barang",
    "suratJalan.form.items.placeholder.qty": "Jumlah",
    "suratJalan.preview.title": "Preview Surat Jalan",

    "pembelian.page.description":
      "Page pembelian disesuaikan dengan field schema backend: TanggalNota, NamaSupplier, NoNpwp, NoInvoice, Hutang, Ppn, LamaHutang, NilaiNota, TanggalJatuhTempo, dan TanggalBayar.",
    "pembelian.table.title": "Tabel Pembelian",
    "pembelian.form.title": "Form Edit + Preview Pembelian",
    "pembelian.form.description":
      "Field disesuaikan dengan schema backend pembelian. LamaHutang dan TanggalJatuhTempo wajib saat Hutang bernilai true.",
    "pembelian.lamaHutang.note": "Dalam hitungan hari",
    "pembelian.preview.title": "Preview Pembelian",

    "field.Nama": "Nama",
    "field.Alamat": "Alamat",
    "field.AtasNama": "AtasNama",
    "field.NoInvoice": "NoInvoice",
    "field.Tanggal": "Tanggal",
    "field.NoPO": "NoPO",
    "field.NoSuratJalan": "NoSuratJalan",
    "field.IdCustomer": "IdCustomer",
    "field.NamaCustomer": "Nama Customer",
    "field.Subtotal": "Subtotal",
    "field.PpnAmount": "PpnAmount",
    "field.GrandTotal": "GrandTotal",
    "field.IsPpn": "IsPpn",
    "field.TanggalDari": "Tanggal Dari",
    "field.TanggalSampai": "Tanggal Sampai",
    "field.Kendaraan": "Kendaraan",
    "field.Tipe": "Tipe",
    "field.SudahSelesai": "SudahSelesai",
    "field.Barang": "Barang",
    "field.NamaBarang": "NamaBarang",
    "field.PpnRate": "PpnRate",
    "field.TanggalNota": "TanggalNota",
    "field.NamaSupplier": "NamaSupplier",
    "field.NoNpwp": "NoNpwp",
    "field.IdInvoice": "IdInvoice",
    "field.Hutang": "Hutang",
    "field.Ppn": "Ppn",
    "field.LamaHutang": "LamaHutang",
    "field.NilaiNota": "NilaiNota",
    "field.TanggalJatuhTempo": "TanggalJatuhTempo",
    "field.TanggalBayar": "TanggalBayar",
    "field.NilaiNotaMin": "NilaiNota Min",
    "field.NilaiNotaMax": "NilaiNota Max",
    "field.TanggalBayarDari": "TanggalBayar Dari",
    "field.TanggalBayarSampai": "TanggalBayar Sampai",
  },
  en: {
    "brand.name": "PRIMA PUTRA PERKASA",
    "nav.home": "Home",
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
    "common.resetFilter": "Reset Filter",
    "common.filterByField": "Filter by Field",
    "common.action": "Action",
    "common.selected": "Selected",
    "common.selectRow": "Select Row",
    "common.filterResult": "Filtered result: {{count}} rows",
    "common.totalData": "Total rows: {{count}}",
    "common.all": "All",
    "common.saveChanges": "Save Changes",
    "common.resetForm": "Reset Form",
    "common.noItems": "No items yet.",
    "common.loading": "Loading...",
    "common.true": "true",
    "common.false": "false",

    "customer.page.description":
      "Customer page aligned with backend schema fields: Nama, Alamat, and AtasNama.",
    "customer.table.title": "Customer Table",
    "customer.form.title": "Edit Form + Customer Preview",
    "customer.form.description":
      "Fields are aligned with customer backend schema: Nama, Alamat, and AtasNama.",
    "customer.preview.title": "Customer Preview",

    "invoice.page.description":
      "Invoice page aligned with backend schema fields: Tanggal, NoInvoice, NoPO, NoSuratJalan, CustomerName, Barang, IsPpn, PpnRate, Subtotal, PpnAmount, and GrandTotal.",
    "invoice.table.title": "Invoice Table",
    "invoice.form.title": "Edit Form + Invoice Preview",
    "invoice.form.description":
      "Fields are aligned with invoice backend schema. Subtotal, PpnAmount, and GrandTotal are auto-calculated.",
    "invoice.form.noSuratJalanHint": "Enter one NoSuratJalan per line.",
    "invoice.form.items.title": "Items (ItemName, Quantity, Unit, UnitPrice)",
    "invoice.form.items.hint": "A new empty row is added when the last row starts being filled.",
    "invoice.form.items.placeholder.name": "Item name",
    "invoice.form.items.placeholder.qty": "Quantity",
    "invoice.form.items.placeholder.unit": "Unit",
    "invoice.form.items.placeholder.price": "Unit Price",
    "invoice.preview.title": "Invoice Preview",

    "suratJalan.page.description":
      "Delivery Note page aligned with backend schema fields: NoSuratJalan, NoPO, Tanggal, CustomerName, Barang, Kendaraan, Tipe, and SudahSelesai.",
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
      "Purchase page aligned with backend schema fields: TanggalNota, NamaSupplier, NoNpwp, NoInvoice, Hutang, Ppn, LamaHutang, NilaiNota, TanggalJatuhTempo, and TanggalBayar.",
    "pembelian.table.title": "Purchase Table",
    "pembelian.form.title": "Edit Form + Purchase Preview",
    "pembelian.form.description":
      "Fields are aligned with purchase backend schema. LamaHutang and TanggalJatuhTempo are required when Hutang is true.",
    "pembelian.lamaHutang.note": "Measured in days",
    "pembelian.preview.title": "Purchase Preview",

    "field.Nama": "Name",
    "field.Alamat": "Address",
    "field.AtasNama": "Attention Name",
    "field.NoInvoice": "NoInvoice",
    "field.Tanggal": "Date",
    "field.NoPO": "NoPO",
    "field.NoSuratJalan": "NoSuratJalan",
    "field.IdCustomer": "IdCustomer",
    "field.NamaCustomer": "Customer Name",
    "field.Subtotal": "Subtotal",
    "field.PpnAmount": "PpnAmount",
    "field.GrandTotal": "GrandTotal",
    "field.IsPpn": "IsPpn",
    "field.TanggalDari": "Date From",
    "field.TanggalSampai": "Date To",
    "field.Kendaraan": "Vehicle",
    "field.Tipe": "Type",
    "field.SudahSelesai": "SudahSelesai",
    "field.Barang": "Items",
    "field.NamaBarang": "ItemName",
    "field.PpnRate": "PpnRate",
    "field.TanggalNota": "TanggalNota",
    "field.NamaSupplier": "NamaSupplier",
    "field.NoNpwp": "NoNpwp",
    "field.IdInvoice": "IdInvoice",
    "field.Hutang": "Hutang",
    "field.Ppn": "Ppn",
    "field.LamaHutang": "LamaHutang",
    "field.NilaiNota": "NilaiNota",
    "field.TanggalJatuhTempo": "TanggalJatuhTempo",
    "field.TanggalBayar": "TanggalBayar",
    "field.NilaiNotaMin": "Min NilaiNota",
    "field.NilaiNotaMax": "Max NilaiNota",
    "field.TanggalBayarDari": "TanggalBayar From",
    "field.TanggalBayarSampai": "TanggalBayar To",
  },
};

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}
