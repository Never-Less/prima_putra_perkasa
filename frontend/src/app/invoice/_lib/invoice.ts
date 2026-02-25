export type InvoiceBarang = {
  Kuantitas: number;
  Unit: string;
  HargaSatuan: number;
  Jumlah: number;
};

export type InvoiceItem = {
  id: string;
  Tanggal: string;
  NoInvoice: string;
  NoPO: string;
  NoSuratJalan: string;
  IdCustomer: string;
  Barang: InvoiceBarang[];
  IsPpn: boolean;
  PpnRate: number;
  PpnAmount: number;
  Subtotal: number;
  GrandTotal: number;
};

export type InvoiceBarangFormRow = {
  Kuantitas: string;
  Unit: string;
  HargaSatuan: string;
};

export type InvoiceFormState = {
  Tanggal: string;
  NoInvoice: string;
  NoPO: string;
  NoSuratJalan: string;
  IdCustomer: string;
  IsPpn: boolean;
  PpnRate: string;
  BarangRows: InvoiceBarangFormRow[];
};

export type InvoiceFilter = {
  NoInvoice: string;
  NoPO: string;
  NoSuratJalan: string;
  IdCustomer: string;
  IsPpn: "" | "true" | "false";
  TanggalDari: string;
  TanggalSampai: string;
};

export const defaultInvoiceFilter: InvoiceFilter = {
  NoInvoice: "",
  NoPO: "",
  NoSuratJalan: "",
  IdCustomer: "",
  IsPpn: "",
  TanggalDari: "",
  TanggalSampai: "",
};

export const sampleInvoiceRows: InvoiceItem[] = [
  {
    id: "inv-260301",
    Tanggal: "2026-03-01",
    NoInvoice: "INV-260301",
    NoPO: "PO-90011",
    NoSuratJalan: "SJ-260311",
    IdCustomer: "65f1234567890abcde123411",
    Barang: [
      {
        Kuantitas: 120,
        Unit: "zak",
        HargaSatuan: 75000,
        Jumlah: 9000000,
      },
      {
        Kuantitas: 40,
        Unit: "m3",
        HargaSatuan: 300000,
        Jumlah: 12000000,
      },
    ],
    IsPpn: true,
    PpnRate: 11,
    PpnAmount: 2310000,
    Subtotal: 21000000,
    GrandTotal: 23310000,
  },
  {
    id: "inv-260302",
    Tanggal: "2026-03-02",
    NoInvoice: "INV-260302",
    NoPO: "PO-90012",
    NoSuratJalan: "SJ-260312",
    IdCustomer: "65f1234567890abcde123422",
    Barang: [
      {
        Kuantitas: 80,
        Unit: "batang",
        HargaSatuan: 95000,
        Jumlah: 7600000,
      },
    ],
    IsPpn: false,
    PpnRate: 11,
    PpnAmount: 0,
    Subtotal: 7600000,
    GrandTotal: 7600000,
  },
  {
    id: "inv-260303",
    Tanggal: "2026-03-03",
    NoInvoice: "INV-260303",
    NoPO: "PO-90013",
    NoSuratJalan: "SJ-260313",
    IdCustomer: "65f1234567890abcde123433",
    Barang: [
      {
        Kuantitas: 24,
        Unit: "kaleng",
        HargaSatuan: 150000,
        Jumlah: 3600000,
      },
    ],
    IsPpn: true,
    PpnRate: 11,
    PpnAmount: 396000,
    Subtotal: 3600000,
    GrandTotal: 3996000,
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function parseNumber(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export function formatTanggal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function toInputDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function createEmptyInvoiceBarangRow(): InvoiceBarangFormRow {
  return {
    Kuantitas: "",
    Unit: "",
    HargaSatuan: "",
  };
}

export function isInvoiceBarangRowFilled(row: InvoiceBarangFormRow) {
  return Boolean(row.Kuantitas.trim() || row.Unit.trim() || row.HargaSatuan.trim());
}

export function ensureTrailingEmptyInvoiceBarangRow(rows: InvoiceBarangFormRow[]) {
  const normalizedRows = rows.map((row) => ({
    Kuantitas: String(row.Kuantitas || ""),
    Unit: String(row.Unit || ""),
    HargaSatuan: String(row.HargaSatuan || ""),
  }));

  if (normalizedRows.length === 0) {
    return [createEmptyInvoiceBarangRow()];
  }

  while (
    normalizedRows.length > 1 &&
    !isInvoiceBarangRowFilled(normalizedRows[normalizedRows.length - 1]) &&
    !isInvoiceBarangRowFilled(normalizedRows[normalizedRows.length - 2])
  ) {
    normalizedRows.pop();
  }

  const lastRow = normalizedRows[normalizedRows.length - 1];

  if (isInvoiceBarangRowFilled(lastRow)) {
    return [...normalizedRows, createEmptyInvoiceBarangRow()];
  }

  return normalizedRows;
}

export function invoiceBarangRowsToList(rows: InvoiceBarangFormRow[]): InvoiceBarang[] {
  return rows
    .map((row) => {
      const kuantitas = parseNumber(row.Kuantitas.trim());
      const hargaSatuan = parseNumber(row.HargaSatuan.trim());
      const unit = row.Unit.trim();
      const jumlah = roundCurrency(kuantitas * hargaSatuan);

      return {
        Kuantitas: kuantitas,
        Unit: unit,
        HargaSatuan: hargaSatuan,
        Jumlah: jumlah,
      };
    })
    .filter((item) => item.Unit);
}

export function calculateInvoiceSummary(barang: InvoiceBarang[], isPpn: boolean, ppnRate: number) {
  const subtotal = roundCurrency(barang.reduce((acc, item) => acc + item.Jumlah, 0));
  const ppnAmount = isPpn ? roundCurrency(subtotal * (ppnRate / 100)) : 0;
  const grandTotal = roundCurrency(subtotal + ppnAmount);

  return {
    Subtotal: subtotal,
    PpnAmount: ppnAmount,
    GrandTotal: grandTotal,
  };
}

export function toInvoiceFormState(item: InvoiceItem): InvoiceFormState {
  return {
    Tanggal: toInputDate(item.Tanggal),
    NoInvoice: item.NoInvoice,
    NoPO: item.NoPO,
    NoSuratJalan: item.NoSuratJalan,
    IdCustomer: item.IdCustomer,
    IsPpn: item.IsPpn,
    PpnRate: String(item.PpnRate),
    BarangRows: ensureTrailingEmptyInvoiceBarangRow(
      item.Barang.map((barang) => ({
        Kuantitas: String(barang.Kuantitas),
        Unit: barang.Unit,
        HargaSatuan: String(barang.HargaSatuan),
      }))
    ),
  };
}

export function filterInvoiceRows(rows: InvoiceItem[], filter: InvoiceFilter) {
  const fromDate = filter.TanggalDari ? new Date(filter.TanggalDari) : null;
  const toDate = filter.TanggalSampai ? new Date(filter.TanggalSampai) : null;

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return rows.filter((row) => {
    const matchNoInvoice = normalize(row.NoInvoice).includes(normalize(filter.NoInvoice));
    const matchNoPO = normalize(row.NoPO).includes(normalize(filter.NoPO));
    const matchNoSuratJalan = normalize(row.NoSuratJalan).includes(normalize(filter.NoSuratJalan));
    const matchIdCustomer = normalize(row.IdCustomer).includes(normalize(filter.IdCustomer));

    const matchPpn =
      !filter.IsPpn ||
      (filter.IsPpn === "true" && row.IsPpn) ||
      (filter.IsPpn === "false" && !row.IsPpn);

    const rowDate = new Date(row.Tanggal);
    const validRowDate = !Number.isNaN(rowDate.getTime());

    const matchFromDate = !fromDate || (validRowDate && rowDate >= fromDate);
    const matchToDate = !toDate || (validRowDate && rowDate <= toDate);

    return (
      matchNoInvoice &&
      matchNoPO &&
      matchNoSuratJalan &&
      matchIdCustomer &&
      matchPpn &&
      matchFromDate &&
      matchToDate
    );
  });
}
