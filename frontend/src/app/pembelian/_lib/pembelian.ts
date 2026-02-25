type Locale = "id" | "en";

export type PembelianItem = {
  id: string;
  TanggalNota: string;
  NamaSupplier: string;
  NoNpwp: string;
  NoInvoice: string | null;
  Hutang: boolean;
  Ppn: boolean;
  LamaHutang: number;
  NilaiNota: number;
  TanggalJatuhTempo: string | null;
  TanggalBayar: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PembelianFilter = {
  NamaSupplier: string;
  NoNpwp: string;
  NoInvoice: string;
  Hutang: "" | "true" | "false";
  Ppn: "" | "true" | "false";
  TanggalNotaDari: string;
  TanggalNotaSampai: string;
  TanggalBayarDari: string;
  TanggalBayarSampai: string;
  NilaiNotaMin: string;
  NilaiNotaMax: string;
};

export type PembelianFormState = {
  TanggalNota: string;
  NamaSupplier: string;
  NoNpwp: string;
  NoInvoice: string;
  Hutang: boolean;
  Ppn: boolean;
  LamaHutang: string;
  NilaiNota: string;
  TanggalJatuhTempo: string;
  TanggalBayar: string;
};

export const defaultPembelianFilter: PembelianFilter = {
  NamaSupplier: "",
  NoNpwp: "",
  NoInvoice: "",
  Hutang: "",
  Ppn: "",
  TanggalNotaDari: "",
  TanggalNotaSampai: "",
  TanggalBayarDari: "",
  TanggalBayarSampai: "",
  NilaiNotaMin: "",
  NilaiNotaMax: "",
};

export const samplePembelianRows: PembelianItem[] = [
  {
    id: "pembelian-260401",
    TanggalNota: "2026-04-01",
    NamaSupplier: "PT Bahan Bangunan Utama",
    NoNpwp: "01.234.567.8-999.000",
    NoInvoice: "INV-260301",
    Hutang: true,
    Ppn: true,
    LamaHutang: 30,
    NilaiNota: 27500000,
    TanggalJatuhTempo: "2026-05-01",
    TanggalBayar: null,
    createdAt: "2026-04-01T09:10:00.000Z",
    updatedAt: "2026-04-01T09:10:00.000Z",
  },
  {
    id: "pembelian-260402",
    TanggalNota: "2026-04-03",
    NamaSupplier: "CV Beton Jaya",
    NoNpwp: "",
    NoInvoice: "INV-260302",
    Hutang: false,
    Ppn: false,
    LamaHutang: 0,
    NilaiNota: 6800000,
    TanggalJatuhTempo: null,
    TanggalBayar: "2026-04-03",
    createdAt: "2026-04-03T11:00:00.000Z",
    updatedAt: "2026-04-03T11:00:00.000Z",
  },
  {
    id: "pembelian-260403",
    TanggalNota: "2026-04-05",
    NamaSupplier: "PT Cat Nusantara",
    NoNpwp: "02.987.654.3-111.000",
    NoInvoice: "INV-260303",
    Hutang: true,
    Ppn: true,
    LamaHutang: 14,
    NilaiNota: 12950000,
    TanggalJatuhTempo: "2026-04-19",
    TanggalBayar: "2026-04-18",
    createdAt: "2026-04-05T10:20:00.000Z",
    updatedAt: "2026-04-18T09:30:00.000Z",
  },
  {
    id: "pembelian-260404",
    TanggalNota: "2026-04-07",
    NamaSupplier: "PT Logam Perkasa",
    NoNpwp: "03.456.789.0-222.000",
    NoInvoice: "INV-260302",
    Hutang: false,
    Ppn: true,
    LamaHutang: 0,
    NilaiNota: 45000000,
    TanggalJatuhTempo: null,
    TanggalBayar: "2026-04-09",
    createdAt: "2026-04-07T13:45:00.000Z",
    updatedAt: "2026-04-09T09:00:00.000Z",
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function parseFilterNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseDateRangeStart(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateRangeEnd(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(23, 59, 59, 999);
  return date;
}

function isDateWithinRange(value: string | null, fromDate: Date | null, toDate: Date | null) {
  if (!fromDate && !toDate) {
    return true;
  }

  if (!value) {
    return false;
  }

  const targetDate = new Date(value);

  if (Number.isNaN(targetDate.getTime())) {
    return false;
  }

  if (fromDate && targetDate < fromDate) {
    return false;
  }

  if (toDate && targetDate > toDate) {
    return false;
  }

  return true;
}

export function formatTanggal(value: string | null, locale: Locale = "id") {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const dateLocale = locale === "en" ? "en-US" : "id-ID";

  return date.toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatRupiah(value: number, locale: Locale = "id") {
  const numberLocale = locale === "en" ? "en-US" : "id-ID";

  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function toInputDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function toPembelianFormState(item: PembelianItem): PembelianFormState {
  return {
    TanggalNota: toInputDate(item.TanggalNota),
    NamaSupplier: item.NamaSupplier,
    NoNpwp: item.NoNpwp,
    NoInvoice: item.NoInvoice || "",
    Hutang: item.Hutang,
    Ppn: item.Ppn,
    LamaHutang: String(item.LamaHutang),
    NilaiNota: String(item.NilaiNota),
    TanggalJatuhTempo: toInputDate(item.TanggalJatuhTempo),
    TanggalBayar: toInputDate(item.TanggalBayar),
  };
}

export function filterPembelianRows(rows: PembelianItem[], filter: PembelianFilter) {
  const tanggalNotaDari = parseDateRangeStart(filter.TanggalNotaDari);
  const tanggalNotaSampai = parseDateRangeEnd(filter.TanggalNotaSampai);
  const tanggalBayarDari = parseDateRangeStart(filter.TanggalBayarDari);
  const tanggalBayarSampai = parseDateRangeEnd(filter.TanggalBayarSampai);
  const nilaiNotaMin = parseFilterNumber(filter.NilaiNotaMin);
  const nilaiNotaMax = parseFilterNumber(filter.NilaiNotaMax);

  return rows.filter((row) => {
    const matchNamaSupplier = normalize(row.NamaSupplier).includes(normalize(filter.NamaSupplier));
    const matchNoNpwp = normalize(row.NoNpwp || "").includes(normalize(filter.NoNpwp));
    const matchNoInvoice = normalize(row.NoInvoice || "").includes(normalize(filter.NoInvoice));

    const matchHutang =
      !filter.Hutang ||
      (filter.Hutang === "true" && row.Hutang) ||
      (filter.Hutang === "false" && !row.Hutang);

    const matchPpn =
      !filter.Ppn ||
      (filter.Ppn === "true" && row.Ppn) ||
      (filter.Ppn === "false" && !row.Ppn);

    const matchTanggalNota = isDateWithinRange(row.TanggalNota, tanggalNotaDari, tanggalNotaSampai);
    const matchTanggalBayar = isDateWithinRange(row.TanggalBayar, tanggalBayarDari, tanggalBayarSampai);

    const matchNilaiNotaMin = nilaiNotaMin === null || row.NilaiNota >= nilaiNotaMin;
    const matchNilaiNotaMax = nilaiNotaMax === null || row.NilaiNota <= nilaiNotaMax;

    return (
      matchNamaSupplier &&
      matchNoNpwp &&
      matchNoInvoice &&
      matchHutang &&
      matchPpn &&
      matchTanggalNota &&
      matchTanggalBayar &&
      matchNilaiNotaMin &&
      matchNilaiNotaMax
    );
  });
}
