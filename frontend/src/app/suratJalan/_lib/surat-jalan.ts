export type SuratJalanTipe = "partial" | "non partial";
type Locale = "id" | "en";

export type SuratJalanBarang = {
  nama: string;
  jumlah: number;
};

export type SuratJalanBarangFormRow = {
  nama: string;
  jumlah: string;
};

export type SuratJalanItem = {
  id: string;
  noSuratJalan: string;
  noPo: string;
  tanggal: string;
  idCustomer: string;
  barang: SuratJalanBarang[];
  kendaraan: string;
  tipe: SuratJalanTipe;
  sudahSelesai: boolean;
};

export type SuratJalanFilter = {
  noSuratJalan: string;
  noPo: string;
  idCustomer: string;
  kendaraan: string;
  tipe: "" | SuratJalanTipe;
  sudahSelesai: "" | "true" | "false";
  tanggalDari: string;
  tanggalSampai: string;
};

export type SuratJalanFormState = {
  noSuratJalan: string;
  noPo: string;
  tanggal: string;
  idCustomer: string;
  kendaraan: string;
  tipe: SuratJalanTipe;
  sudahSelesai: boolean;
  barangRows: SuratJalanBarangFormRow[];
};

export const defaultSuratJalanFilter: SuratJalanFilter = {
  noSuratJalan: "",
  noPo: "",
  idCustomer: "",
  kendaraan: "",
  tipe: "",
  sudahSelesai: "",
  tanggalDari: "",
  tanggalSampai: "",
};

export const sampleSuratJalanRows: SuratJalanItem[] = [
  {
    id: "sj-260311",
    noSuratJalan: "SJ-260311",
    noPo: "PO-90011",
    tanggal: "2026-03-11",
    idCustomer: "PT Nusantara Bangun",
    barang: [
      { nama: "Semen Curah", jumlah: 120 },
      { nama: "Pasir Halus", jumlah: 40 },
    ],
    kendaraan: "B 9123 KXP",
    tipe: "partial",
    sudahSelesai: false,
  },
  {
    id: "sj-260312",
    noSuratJalan: "SJ-260312",
    noPo: "PO-90011",
    tanggal: "2026-03-12",
    idCustomer: "CV Pilar Teknik",
    barang: [
      { nama: "Besi Beton 10mm", jumlah: 80 },
      { nama: "Besi Beton 12mm", jumlah: 65 },
    ],
    kendaraan: "B 1455 TTY",
    tipe: "non partial",
    sudahSelesai: true,
  },
  {
    id: "sj-260313",
    noSuratJalan: "SJ-260313",
    noPo: "PO-90013",
    tanggal: "2026-03-13",
    idCustomer: "PT Sinar Baja Utama",
    barang: [{ nama: "Cat Dasar", jumlah: 24 }],
    kendaraan: "B 8071 VKD",
    tipe: "partial",
    sudahSelesai: false,
  },
  {
    id: "sj-260314",
    noSuratJalan: "SJ-260314",
    noPo: "PO-90013",
    tanggal: "2026-03-14",
    idCustomer: "PT Delima Konstruksi",
    barang: [
      { nama: "Pipa PVC 4 inch", jumlah: 32 },
      { nama: "Pipa PVC 2 inch", jumlah: 50 },
    ],
    kendaraan: "B 6520 QPA",
    tipe: "non partial",
    sudahSelesai: true,
  },
  {
    id: "sj-260315",
    noSuratJalan: "SJ-260315",
    noPo: "PO-90015",
    tanggal: "2026-03-15",
    idCustomer: "PT Nusantara Bangun",
    barang: [{ nama: "Kawat Beton", jumlah: 200 }],
    kendaraan: "B 8345 PRT",
    tipe: "partial",
    sudahSelesai: false,
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

  return items.map((item) => `${item.nama} (${item.jumlah})`).join(", ");
}

export function filterSuratJalanRows(rows: SuratJalanItem[], filters: SuratJalanFilter) {
  const fromDate = filters.tanggalDari ? new Date(filters.tanggalDari) : null;
  const toDate = filters.tanggalSampai ? new Date(filters.tanggalSampai) : null;

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return rows.filter((row) => {
    const noSuratJalanMatch = normalize(row.noSuratJalan).includes(normalize(filters.noSuratJalan));
    const noPOMatch = normalize(row.noPo).includes(normalize(filters.noPo));
    const idCustomerMatch = normalize(row.idCustomer).includes(normalize(filters.idCustomer));
    const kendaraanMatch = normalize(row.kendaraan).includes(normalize(filters.kendaraan));

    const tipeMatch = !filters.tipe || row.tipe === filters.tipe;
    const selesaiMatch =
      !filters.sudahSelesai ||
      (filters.sudahSelesai === "true" && row.sudahSelesai) ||
      (filters.sudahSelesai === "false" && !row.sudahSelesai);

    const rowDate = new Date(row.tanggal);
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
    noSuratJalan: item.noSuratJalan,
    noPo: item.noPo,
    tanggal: toInputDate(item.tanggal),
    idCustomer: item.idCustomer,
    kendaraan: item.kendaraan,
    tipe: item.tipe,
    sudahSelesai: item.sudahSelesai,
    barangRows: ensureTrailingEmptyBarangRow(
      item.barang.map((barang) => ({
        nama: barang.nama,
        jumlah: String(barang.jumlah),
      }))
    ),
  };
}

export function createEmptyBarangRow(): SuratJalanBarangFormRow {
  return {
    nama: "",
    jumlah: "",
  };
}

export function isBarangRowFilled(row: SuratJalanBarangFormRow) {
  return Boolean(row.nama.trim() || row.jumlah.trim());
}

export function ensureTrailingEmptyBarangRow(rows: SuratJalanBarangFormRow[]) {
  const normalizedRows = rows.map((row) => ({
    nama: String(row.nama || ""),
    jumlah: String(row.jumlah || ""),
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
      const nama = row.nama.trim();
      const jumlahParsed = Number(row.jumlah.trim());

      return {
        nama,
        jumlah: Number.isFinite(jumlahParsed) ? jumlahParsed : 0,
      };
    })
    .filter((barang) => barang.nama);
}
