type Locale = "id" | "en";

export type PembelianItem = {
  id: string;
  tanggalNota: string;
  namaSupplier: string;
  noNpwp: string;
  noInvoice: string | null;
  hutang: boolean;
  ppn: boolean;
  lamaHutang: number;
  nilaiNota: number;
  tanggalJatuhTempo: string | null;
  tanggalBayar: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PembelianFilter = {
  namaSupplier: string;
  noNpwp: string;
  noInvoice: string;
  hutang: "" | "true" | "false";
  ppn: "" | "true" | "false";
  tanggalNotaDari: string;
  tanggalNotaSampai: string;
  tanggalBayarDari: string;
  tanggalBayarSampai: string;
  nilaiNotaMin: string;
  nilaiNotaMax: string;
};

export type PembelianFormState = {
  tanggalNota: string;
  namaSupplier: string;
  noNpwp: string;
  noInvoice: string;
  hutang: boolean;
  ppn: boolean;
  lamaHutang: string;
  nilaiNota: string;
  tanggalJatuhTempo: string;
  tanggalBayar: string;
};

export const defaultPembelianFilter: PembelianFilter = {
  namaSupplier: "",
  noNpwp: "",
  noInvoice: "",
  hutang: "",
  ppn: "",
  tanggalNotaDari: "",
  tanggalNotaSampai: "",
  tanggalBayarDari: "",
  tanggalBayarSampai: "",
  nilaiNotaMin: "",
  nilaiNotaMax: "",
};

export const samplePembelianRows: PembelianItem[] = [
  {
    id: "pembelian-260401",
    tanggalNota: "2026-04-01",
    namaSupplier: "PT Bahan Bangunan Utama",
    noNpwp: "01.234.567.8-999.000",
    noInvoice: "INV-260301",
    hutang: true,
    ppn: true,
    lamaHutang: 30,
    nilaiNota: 27500000,
    tanggalJatuhTempo: "2026-05-01",
    tanggalBayar: null,
    createdAt: "2026-04-01T09:10:00.000Z",
    updatedAt: "2026-04-01T09:10:00.000Z",
  },
  {
    id: "pembelian-260402",
    tanggalNota: "2026-04-03",
    namaSupplier: "CV Beton Jaya",
    noNpwp: "",
    noInvoice: "INV-260302",
    hutang: false,
    ppn: false,
    lamaHutang: 0,
    nilaiNota: 6800000,
    tanggalJatuhTempo: null,
    tanggalBayar: "2026-04-03",
    createdAt: "2026-04-03T11:00:00.000Z",
    updatedAt: "2026-04-03T11:00:00.000Z",
  },
  {
    id: "pembelian-260403",
    tanggalNota: "2026-04-05",
    namaSupplier: "PT Cat Nusantara",
    noNpwp: "02.987.654.3-111.000",
    noInvoice: "INV-260303",
    hutang: true,
    ppn: true,
    lamaHutang: 14,
    nilaiNota: 12950000,
    tanggalJatuhTempo: "2026-04-19",
    tanggalBayar: "2026-04-18",
    createdAt: "2026-04-05T10:20:00.000Z",
    updatedAt: "2026-04-18T09:30:00.000Z",
  },
  {
    id: "pembelian-260404",
    tanggalNota: "2026-04-07",
    namaSupplier: "PT Logam Perkasa",
    noNpwp: "03.456.789.0-222.000",
    noInvoice: "INV-260302",
    hutang: false,
    ppn: true,
    lamaHutang: 0,
    nilaiNota: 45000000,
    tanggalJatuhTempo: null,
    tanggalBayar: "2026-04-09",
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
    tanggalNota: toInputDate(item.tanggalNota),
    namaSupplier: item.namaSupplier,
    noNpwp: item.noNpwp,
    noInvoice: item.noInvoice || "",
    hutang: item.hutang,
    ppn: item.ppn,
    lamaHutang: String(item.lamaHutang),
    nilaiNota: String(item.nilaiNota),
    tanggalJatuhTempo: toInputDate(item.tanggalJatuhTempo),
    tanggalBayar: toInputDate(item.tanggalBayar),
  };
}

export function filterPembelianRows(rows: PembelianItem[], filter: PembelianFilter) {
  const tanggalNotaDari = parseDateRangeStart(filter.tanggalNotaDari);
  const tanggalNotaSampai = parseDateRangeEnd(filter.tanggalNotaSampai);
  const tanggalBayarDari = parseDateRangeStart(filter.tanggalBayarDari);
  const tanggalBayarSampai = parseDateRangeEnd(filter.tanggalBayarSampai);
  const nilaiNotaMin = parseFilterNumber(filter.nilaiNotaMin);
  const nilaiNotaMax = parseFilterNumber(filter.nilaiNotaMax);

  return rows.filter((row) => {
    const matchNamaSupplier = normalize(row.namaSupplier).includes(normalize(filter.namaSupplier));
    const matchNoNpwp = normalize(row.noNpwp || "").includes(normalize(filter.noNpwp));
    const matchNoInvoice = normalize(row.noInvoice || "").includes(normalize(filter.noInvoice));

    const matchHutang =
      !filter.hutang ||
      (filter.hutang === "true" && row.hutang) ||
      (filter.hutang === "false" && !row.hutang);

    const matchPpn =
      !filter.ppn ||
      (filter.ppn === "true" && row.ppn) ||
      (filter.ppn === "false" && !row.ppn);

    const matchTanggalNota = isDateWithinRange(row.tanggalNota, tanggalNotaDari, tanggalNotaSampai);
    const matchTanggalBayar = isDateWithinRange(row.tanggalBayar, tanggalBayarDari, tanggalBayarSampai);

    const matchNilaiNotaMin = nilaiNotaMin === null || row.nilaiNota >= nilaiNotaMin;
    const matchNilaiNotaMax = nilaiNotaMax === null || row.nilaiNota <= nilaiNotaMax;

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
