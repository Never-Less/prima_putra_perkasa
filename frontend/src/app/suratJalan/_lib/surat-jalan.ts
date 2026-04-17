import { requestApi } from "../../_lib/api-client";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

export type SuratJalanTipe = "partial" | "non partial";
type Locale = "id" | "en";

export type SuratJalanBarang = {
  nama: string;
  spesifikasi: string | null;
  jumlah: number;
  unit: string;
};

export type SuratJalanBarangFormRow = {
  nama: string;
  spesifikasi: string;
  jumlah: string;
  unit: string;
};

export type SuratJalanItem = {
  id: string;
  noSuratJalan: string;
  noPo: string;
  kodeDepartemen: string;
  tanggal: string;
  idCustomer: string;
  barang: SuratJalanBarang[];
  kendaraan: string;
  tipe: SuratJalanTipe;
  createdAt: string;
  updatedAt: string;
};

export type SuratJalanFilter = {
  noSuratJalan: string;
  noPo: string;
  kodeDepartemen: string;
  idCustomer: string;
  kendaraan: string;
  tipe: "" | SuratJalanTipe;
  tanggalDari: string;
  tanggalSampai: string;
};

export type SuratJalanFormState = {
  noSuratJalan: string;
  noPo: string;
  kodeDepartemen: string;
  tanggal: string;
  idCustomer: string;
  kendaraan: string;
  tipe: SuratJalanTipe;
  barangRows: SuratJalanBarangFormRow[];
};

export type SuratJalanListQuery = SuratJalanFilter & PaginationQueryState;

export type SuratJalanNoPoOption = {
  noPo: string;
  idCustomer: string;
};

type SuratJalanListResponse = {
  suratJalan?: unknown[];
  pagination?: unknown;
  summary?: {
    totalRows?: unknown;
    totalGroups?: unknown;
  };
};

type SuratJalanResponse = {
  suratJalan?: unknown;
};

type SuratJalanNoPoOptionsResponse = {
  noPoOptions?: unknown[];
};

type ResolveCustomerLabel = (customerId: string) => string;

export const defaultSuratJalanFilter: SuratJalanFilter = {
  noSuratJalan: "",
  noPo: "",
  kodeDepartemen: "",
  idCustomer: "",
  kendaraan: "",
  tipe: "",
  tanggalDari: "",
  tanggalSampai: "",
};

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normalize(value: unknown) {
  return toText(value).trim().toLowerCase();
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function parseCustomerId(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object") {
    const customer = value as Record<string, unknown>;
    const id = toText(customer.id || customer._id).trim();

    if (id) {
      return id;
    }

    return toText(customer.nama).trim();
  }

  return toText(value).trim();
}

function toSuratJalanNoPoOption(value: unknown): SuratJalanNoPoOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const noPo = toText(item.noPo).trim();
  const idCustomer = parseCustomerId(item.idCustomer);

  if (!noPo) {
    return null;
  }

  return {
    noPo,
    idCustomer,
  };
}

function toSuratJalanBarang(value: unknown): SuratJalanBarang | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const barang = value as Record<string, unknown>;
  const nama = toText(barang.nama).trim();
  const spesifikasi = toText(barang.spesifikasi).trim() || null;
  const jumlah = toNumber(barang.jumlah, 0);
  const unit = toText(barang.unit).trim();

  if (!nama || jumlah <= 0) {
    return null;
  }

  return {
    nama,
    spesifikasi,
    jumlah,
    unit,
  };
}

function toSuratJalanItem(value: unknown): SuratJalanItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();

  if (!id) {
    return null;
  }

  const barangList = Array.isArray(row.barang)
    ? row.barang.map(toSuratJalanBarang).filter((barang): barang is SuratJalanBarang => Boolean(barang))
    : [];

  return {
    id,
    noSuratJalan: toText(row.noSuratJalan).trim(),
    noPo: toText(row.noPo).trim(),
    kodeDepartemen: toText(row.kodeDepartemen).trim(),
    tanggal: toText(row.tanggal).trim(),
    idCustomer: parseCustomerId(row.idCustomer),
    barang: barangList,
    kendaraan: toText(row.kendaraan).trim(),
    tipe: normalize(row.tipe) === "non partial" ? "non partial" : "partial",
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

function toNormalizedSuratJalanPayload(form: SuratJalanFormState) {
  return {
    noSuratJalan: toText(form.noSuratJalan).trim(),
    noPo: toText(form.noPo).trim(),
    kodeDepartemen: toText(form.kodeDepartemen).trim(),
    tanggal: toText(form.tanggal).trim(),
    idCustomer: toText(form.idCustomer).trim(),
    barang: barangRowsToList(form.barangRows),
    kendaraan: toText(form.kendaraan).trim(),
    tipe: form.tipe,
  };
}

export async function fetchSuratJalanRows() {
  const response = await requestApi<SuratJalanListResponse>("/api/surat-jalan");

  if (!response || !Array.isArray(response.suratJalan)) {
    return [];
  }

  return response.suratJalan
    .map(toSuratJalanItem)
    .filter((item): item is SuratJalanItem => Boolean(item));
}

export async function fetchSuratJalanNoPoOptions() {
  const response = await requestApi<SuratJalanNoPoOptionsResponse>("/api/surat-jalan/no-po-options");

  if (!response || !Array.isArray(response.noPoOptions)) {
    return [];
  }

  return response.noPoOptions
    .map(toSuratJalanNoPoOption)
    .filter((item): item is SuratJalanNoPoOption => Boolean(item));
}

export async function fetchSuratJalanList(
  query: SuratJalanListQuery
): Promise<ServerListResult<SuratJalanItem>> {
  const requestPath = `/api/surat-jalan${buildListQueryString({
    noSuratJalan: query.noSuratJalan,
    noPo: query.noPo,
    kodeDepartemen: query.kodeDepartemen,
    idCustomer: query.idCustomer,
    kendaraan: query.kendaraan,
    tipe: query.tipe,
    tanggalDari: query.tanggalDari,
    tanggalSampai: query.tanggalSampai,
    page: query.page,
    limit: query.limit,
  })}`;
  const response = await requestApi<SuratJalanListResponse>(requestPath);
  const items = Array.isArray(response?.suratJalan)
    ? response.suratJalan
        .map(toSuratJalanItem)
        .filter((item): item is SuratJalanItem => Boolean(item))
    : [];
  const pagination = normalizeServerPaginationMeta(response?.pagination, {
    page: query.page,
    limit: query.limit,
  });
  const totalRows = Number(response?.summary?.totalRows);

  return {
    items,
    pagination,
    totalRows: Number.isFinite(totalRows) && totalRows >= 0 ? totalRows : items.length,
  };
}

export async function fetchSuratJalanById(id: string) {
  const suratJalanId = toText(id).trim();

  if (!suratJalanId) {
    return null;
  }

  const response = await requestApi<SuratJalanResponse>(`/api/surat-jalan/${suratJalanId}`);
  return toSuratJalanItem(response?.suratJalan);
}

export async function fetchSuratJalanByNoPo(noPo: string) {
  const suratJalanNoPo = toText(noPo).trim();

  if (!suratJalanNoPo) {
    return [];
  }

  const requestPath = `/api/surat-jalan/by-no-po?noPo=${encodeURIComponent(suratJalanNoPo)}`;
  const response = await requestApi<SuratJalanListResponse>(requestPath);

  if (!Array.isArray(response?.suratJalan)) {
    return [];
  }

  return response.suratJalan
    .map(toSuratJalanItem)
    .filter((item): item is SuratJalanItem => Boolean(item));
}

export async function createSuratJalan(form: SuratJalanFormState) {
  const payload = toNormalizedSuratJalanPayload(form);
  const response = await requestApi<SuratJalanResponse>("/api/surat-jalan", {
    method: "POST",
    body: payload,
  });

  return toSuratJalanItem(response?.suratJalan);
}

export async function updateSuratJalan(id: string, form: SuratJalanFormState) {
  const payload = toNormalizedSuratJalanPayload(form);
  const response = await requestApi<SuratJalanResponse>(`/api/surat-jalan/${id}`, {
    method: "PUT",
    body: payload,
  });

  return toSuratJalanItem(response?.suratJalan);
}

export async function deleteSuratJalan(id: string) {
  await requestApi(`/api/surat-jalan/${id}`, {
    method: "DELETE",
  });
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

  return items
    .map((item) => {
      const namaWithSpec = item.spesifikasi ? `${item.nama} (${item.spesifikasi})` : item.nama;
      const qtyWithUnit = item.unit ? `${item.jumlah} ${item.unit}` : String(item.jumlah);
      return `${namaWithSpec}: ${qtyWithUnit}`;
    })
    .join(", ");
}

export function filterSuratJalanRows(
  rows: SuratJalanItem[],
  filters: SuratJalanFilter,
  resolveCustomerLabel?: ResolveCustomerLabel
) {
  const fromDate = filters.tanggalDari ? new Date(filters.tanggalDari) : null;
  const toDate = filters.tanggalSampai ? new Date(filters.tanggalSampai) : null;

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return rows.filter((row) => {
    const noSuratJalanMatch = normalize(row.noSuratJalan).includes(normalize(filters.noSuratJalan));
    const noPoMatch = normalize(row.noPo).includes(normalize(filters.noPo));
    const kodeDepartemenMatch = normalize(row.kodeDepartemen).includes(
      normalize(filters.kodeDepartemen)
    );
    const customerLabel = resolveCustomerLabel ? resolveCustomerLabel(row.idCustomer) : row.idCustomer;
    const idCustomerMatch = normalize(customerLabel).includes(normalize(filters.idCustomer));
    const kendaraanMatch = normalize(row.kendaraan).includes(normalize(filters.kendaraan));

    const tipeMatch = !filters.tipe || row.tipe === filters.tipe;

    const rowDate = new Date(row.tanggal);
    const hasValidDate = !Number.isNaN(rowDate.getTime());

    const fromDateMatch = !fromDate || (hasValidDate && rowDate >= fromDate);
    const toDateMatch = !toDate || (hasValidDate && rowDate <= toDate);

    return (
      noSuratJalanMatch &&
      noPoMatch &&
      kodeDepartemenMatch &&
      idCustomerMatch &&
      kendaraanMatch &&
      tipeMatch &&
      fromDateMatch &&
      toDateMatch
    );
  });
}

export function toFormState(item: SuratJalanItem): SuratJalanFormState {
  return {
    noSuratJalan: item.noSuratJalan,
    noPo: item.noPo,
    kodeDepartemen: item.kodeDepartemen,
    tanggal: toInputDate(item.tanggal),
    idCustomer: item.idCustomer,
    kendaraan: item.kendaraan,
    tipe: item.tipe,
    barangRows: ensureTrailingEmptyBarangRow(
      item.barang.map((barang) => ({
        nama: barang.nama,
        spesifikasi: barang.spesifikasi || "",
        jumlah: String(barang.jumlah),
        unit: barang.unit || "",
      }))
    ),
  };
}

export function createEmptyBarangRow(): SuratJalanBarangFormRow {
  return {
    nama: "",
    spesifikasi: "",
    jumlah: "",
    unit: "",
  };
}

export function isBarangRowFilled(row: SuratJalanBarangFormRow) {
  return Boolean(
    row.nama.trim() || row.spesifikasi.trim() || row.jumlah.trim() || row.unit.trim()
  );
}

export function ensureTrailingEmptyBarangRow(rows: SuratJalanBarangFormRow[]) {
  const normalizedRows = rows.map((row) => ({
    nama: String(row.nama || ""),
    spesifikasi: String(row.spesifikasi || ""),
    jumlah: String(row.jumlah || ""),
    unit: String(row.unit || ""),
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
      const spesifikasi = row.spesifikasi.trim() || null;
      const jumlahParsed = Number(row.jumlah.trim());
      const unit = row.unit.trim();

      return {
        nama,
        spesifikasi,
        jumlah: Number.isFinite(jumlahParsed) ? jumlahParsed : 0,
        unit,
      };
    })
    .filter((barang) => barang.nama && barang.jumlah > 0 && barang.unit);
}
