export type SuratJalanTipe = "partial" | "non partial";
type Locale = "id" | "en";

export type SuratJalanBarang = {
  Nama: string;
  Jumlah: number;
};

export type SuratJalanBarangFormRow = {
  Nama: string;
  Jumlah: string;
};

export type SuratJalanItem = {
  id: string;
  NoSuratJalan: string;
  NoPO: string;
  Tanggal: string;
  IdCustomer: string;
  Barang: SuratJalanBarang[];
  Kendaraan: string;
  Tipe: SuratJalanTipe;
  SudahSelesai: boolean;
};

export type SuratJalanFilter = {
  NoSuratJalan: string;
  NoPO: string;
  IdCustomer: string;
  Kendaraan: string;
  Tipe: "" | SuratJalanTipe;
  SudahSelesai: "" | "true" | "false";
  TanggalDari: string;
  TanggalSampai: string;
};

export type SuratJalanFormState = {
  NoSuratJalan: string;
  NoPO: string;
  Tanggal: string;
  IdCustomer: string;
  Kendaraan: string;
  Tipe: SuratJalanTipe;
  SudahSelesai: boolean;
  BarangRows: SuratJalanBarangFormRow[];
};

export const defaultSuratJalanFilter: SuratJalanFilter = {
  NoSuratJalan: "",
  NoPO: "",
  IdCustomer: "",
  Kendaraan: "",
  Tipe: "",
  SudahSelesai: "",
  TanggalDari: "",
  TanggalSampai: "",
};

export const sampleSuratJalanRows: SuratJalanItem[] = [
  {
    id: "sj-260311",
    NoSuratJalan: "SJ-260311",
    NoPO: "PO-90011",
    Tanggal: "2026-03-11",
    IdCustomer: "65f1234567890abcde123411",
    Barang: [
      { Nama: "Semen Curah", Jumlah: 120 },
      { Nama: "Pasir Halus", Jumlah: 40 },
    ],
    Kendaraan: "B 9123 KXP",
    Tipe: "partial",
    SudahSelesai: false,
  },
  {
    id: "sj-260312",
    NoSuratJalan: "SJ-260312",
    NoPO: "PO-90012",
    Tanggal: "2026-03-12",
    IdCustomer: "65f1234567890abcde123422",
    Barang: [
      { Nama: "Besi Beton 10mm", Jumlah: 80 },
      { Nama: "Besi Beton 12mm", Jumlah: 65 },
    ],
    Kendaraan: "B 1455 TTY",
    Tipe: "non partial",
    SudahSelesai: true,
  },
  {
    id: "sj-260313",
    NoSuratJalan: "SJ-260313",
    NoPO: "PO-90013",
    Tanggal: "2026-03-13",
    IdCustomer: "65f1234567890abcde123433",
    Barang: [{ Nama: "Cat Dasar", Jumlah: 24 }],
    Kendaraan: "B 8071 VKD",
    Tipe: "partial",
    SudahSelesai: false,
  },
  {
    id: "sj-260314",
    NoSuratJalan: "SJ-260314",
    NoPO: "PO-90014",
    Tanggal: "2026-03-14",
    IdCustomer: "65f1234567890abcde123444",
    Barang: [
      { Nama: "Pipa PVC 4 inch", Jumlah: 32 },
      { Nama: "Pipa PVC 2 inch", Jumlah: 50 },
    ],
    Kendaraan: "B 6520 QPA",
    Tipe: "non partial",
    SudahSelesai: true,
  },
  {
    id: "sj-260315",
    NoSuratJalan: "SJ-260315",
    NoPO: "PO-90015",
    Tanggal: "2026-03-15",
    IdCustomer: "65f1234567890abcde123455",
    Barang: [{ Nama: "Kawat Beton", Jumlah: 200 }],
    Kendaraan: "B 8345 PRT",
    Tipe: "partial",
    SudahSelesai: false,
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function formatTanggal(value: string, locale: Locale = "id") {
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

export function toInputDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function barangLabel(items: SuratJalanBarang[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return "-";
  }

  return items.map((item) => `${item.Nama} (${item.Jumlah})`).join(", ");
}

export function filterSuratJalanRows(rows: SuratJalanItem[], filters: SuratJalanFilter) {
  const fromDate = filters.TanggalDari ? new Date(filters.TanggalDari) : null;
  const toDate = filters.TanggalSampai ? new Date(filters.TanggalSampai) : null;

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return rows.filter((row) => {
    const noSuratJalanMatch = normalize(row.NoSuratJalan).includes(normalize(filters.NoSuratJalan));
    const noPOMatch = normalize(row.NoPO).includes(normalize(filters.NoPO));
    const idCustomerMatch = normalize(row.IdCustomer).includes(normalize(filters.IdCustomer));
    const kendaraanMatch = normalize(row.Kendaraan).includes(normalize(filters.Kendaraan));

    const tipeMatch = !filters.Tipe || row.Tipe === filters.Tipe;
    const selesaiMatch =
      !filters.SudahSelesai ||
      (filters.SudahSelesai === "true" && row.SudahSelesai) ||
      (filters.SudahSelesai === "false" && !row.SudahSelesai);

    const rowDate = new Date(row.Tanggal);
    const hasValidDate = !Number.isNaN(rowDate.getTime());

    const fromDateMatch = !fromDate || (hasValidDate && rowDate >= fromDate);
    const toDateMatch = !toDate || (hasValidDate && rowDate <= toDate);

    return (
      noSuratJalanMatch &&
      noPOMatch &&
      idCustomerMatch &&
      kendaraanMatch &&
      tipeMatch &&
      selesaiMatch &&
      fromDateMatch &&
      toDateMatch
    );
  });
}

export function toFormState(item: SuratJalanItem): SuratJalanFormState {
  return {
    NoSuratJalan: item.NoSuratJalan,
    NoPO: item.NoPO,
    Tanggal: toInputDate(item.Tanggal),
    IdCustomer: item.IdCustomer,
    Kendaraan: item.Kendaraan,
    Tipe: item.Tipe,
    SudahSelesai: item.SudahSelesai,
    BarangRows: ensureTrailingEmptyBarangRow(
      item.Barang.map((barang) => ({
        Nama: barang.Nama,
        Jumlah: String(barang.Jumlah),
      }))
    ),
  };
}

export function createEmptyBarangRow(): SuratJalanBarangFormRow {
  return {
    Nama: "",
    Jumlah: "",
  };
}

export function isBarangRowFilled(row: SuratJalanBarangFormRow) {
  return Boolean(row.Nama.trim() || row.Jumlah.trim());
}

export function ensureTrailingEmptyBarangRow(rows: SuratJalanBarangFormRow[]) {
  const normalizedRows = rows.map((row) => ({
    Nama: String(row.Nama || ""),
    Jumlah: String(row.Jumlah || ""),
  }));

  if (normalizedRows.length === 0) {
    return [createEmptyBarangRow()];
  }

  while (
    normalizedRows.length > 1 &&
    !isBarangRowFilled(normalizedRows[normalizedRows.length - 1]) &&
    !isBarangRowFilled(normalizedRows[normalizedRows.length - 2])
  ) {
    normalizedRows.pop();
  }

  const lastRow = normalizedRows[normalizedRows.length - 1];

  if (isBarangRowFilled(lastRow)) {
    return [...normalizedRows, createEmptyBarangRow()];
  }

  return normalizedRows;
}

export function barangRowsToList(rows: SuratJalanBarangFormRow[]) {
  return rows
    .map((row) => {
      const Nama = row.Nama.trim();
      const jumlahParsed = Number(row.Jumlah.trim());

      return {
        Nama,
        Jumlah: Number.isFinite(jumlahParsed) ? jumlahParsed : 0,
      };
    })
    .filter((barang) => barang.Nama);
}
