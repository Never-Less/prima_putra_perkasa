import { requestApi } from "../../_lib/api-client";
import { formatAppDate, parseAppDate, parseAppDateRangeEnd, parseAppDateRangeStart, toInputDateValue } from "../../_lib/date";
import { decodeHtmlEntities } from "../../_lib/html-entities";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

type Locale = "id" | "en";

export type SuratJalanBarang = {
  id: string;
  nama: string;
  spesifikasi: string | null;
  kodeDepartemen: string;
  jumlah: number;
  unit: string;
};

export type SuratJalanBarangFormRow = {
  nama: string;
  spesifikasi: string;
  kodeDepartemen: string;
  jumlah: string;
  unit: string;
};

export type SuratJalanItem = {
  id: string;
  noSuratJalan: string;
  noPo: string;
  // Ringkasan unik dari barang[].kodeDepartemen untuk filter/table/export lama.
  kodeDepartemen: string;
  tanggal: string;
  idCustomer: string;
  barang: SuratJalanBarang[];
  kendaraan: string;
  deliveryStatus: "notDelivered" | "partial" | "complete" | null;
  createdAt: string;
  updatedAt: string;
};

export type SuratJalanFilter = {
  noSuratJalan: string;
  noPo: string;
  namaBarang: string;
  kodeDepartemen: string;
  idCustomer: string;
  kendaraan: string;
  tanggalDari: string;
  tanggalSampai: string;
};

export type SuratJalanFormState = {
  noSuratJalan: string;
  noPo: string;
  tanggal: string;
  idCustomer: string;
  kendaraan: string;
  barangRows: SuratJalanBarangFormRow[];
};

export type SuratJalanPrefillPayload = {
  noPo: string;
  tanggal: string;
  idCustomer: string;
  kendaraan?: string;
  barang: Array<{
    nama: string;
    spesifikasi?: string;
    kodeDepartemen?: string;
    jumlah: number;
    unit: string;
  }>;
};

export type SuratJalanListQuery = SuratJalanFilter & PaginationQueryState;

export type SuratJalanNoPoOption = {
  noPo: string;
  idCustomer: string;
  barang: SuratJalanNoPoBarangOption[];
};

export type SuratJalanNoPoBarangOption = {
  namaBarang: string;
  spesifikasi: string;
  kuantitas: number;
  unit: string;
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

const suratJalanMutationCachePaths = [
  "/api/surat-jalan",
  "/api/invoices",
  "/api/purchase-orders",
];
const suratJalanPrefillStorageKey = "ppp_surat_jalan_prefill";

export const defaultSuratJalanFilter: SuratJalanFilter = {
  noSuratJalan: "",
  noPo: "",
  namaBarang: "",
  kodeDepartemen: "",
  idCustomer: "",
  kendaraan: "",
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
  return decodeHtmlEntities(toText(value)).trim().toLowerCase();
}

function toDecodedText(value: unknown) {
  return decodeHtmlEntities(toText(value));
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
  const barang = Array.isArray(item.barang)
    ? item.barang
        .map(toSuratJalanNoPoBarangOption)
        .filter((barangItem): barangItem is SuratJalanNoPoBarangOption =>
          Boolean(barangItem)
        )
    : [];

  if (!noPo) {
    return null;
  }

  return {
    noPo,
    idCustomer,
    barang,
  };
}

function toSuratJalanNoPoBarangOption(value: unknown): SuratJalanNoPoBarangOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const barang = value as Record<string, unknown>;
  const namaBarang = toDecodedText(barang.namaBarang || barang.nama).trim();
  const spesifikasi = toDecodedText(barang.spesifikasi).trim();
  const kuantitas = toNumber(barang.kuantitas ?? barang.jumlah, 0);
  const unit = toDecodedText(barang.unit).trim();

  if (!namaBarang || kuantitas <= 0 || !unit) {
    return null;
  }

  return {
    namaBarang,
    spesifikasi,
    kuantitas,
    unit,
  };
}

function toSuratJalanBarang(value: unknown): SuratJalanBarang | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const barang = value as Record<string, unknown>;
  const id = toText(barang.id || barang._id).trim();
  const nama = toDecodedText(barang.nama).trim();
  const spesifikasi = toDecodedText(barang.spesifikasi).trim() || null;
  const kodeDepartemen = toDecodedText(barang.kodeDepartemen).trim();
  const jumlah = toNumber(barang.jumlah, 0);
  const unit = toDecodedText(barang.unit).trim();

  if (!nama || jumlah <= 0) {
    return null;
  }

  return {
    id,
    nama,
    spesifikasi,
    kodeDepartemen,
    jumlah,
    unit,
  };
}

function normalizeSuratJalanPrefillBarang(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const barang = value as Record<string, unknown>;
  const nama = toDecodedText(barang.nama || barang.namaBarang).trim();
  const spesifikasi = toDecodedText(barang.spesifikasi).trim();
  const kodeDepartemen = toDecodedText(barang.kodeDepartemen).trim();
  const jumlah = toNumber(barang.jumlah ?? barang.kuantitas, 0);
  const unit = toDecodedText(barang.unit).trim();

  if (!nama || jumlah <= 0 || !unit) {
    return null;
  }

  return {
    nama,
    spesifikasi,
    kodeDepartemen,
    jumlah,
    unit,
  };
}

function toSuratJalanPrefillPayload(value: unknown): SuratJalanPrefillPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const noPo = toText(payload.noPo).trim();
  const tanggal = toText(payload.tanggal).trim();
  const idCustomer = parseCustomerId(payload.idCustomer);
  const kendaraan = toText(payload.kendaraan).trim();
  const barang = Array.isArray(payload.barang)
    ? payload.barang
        .map(normalizeSuratJalanPrefillBarang)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeSuratJalanPrefillBarang>> =>
          Boolean(item)
        )
    : [];

  if (!noPo || !idCustomer || barang.length === 0) {
    return null;
  }

  return {
    noPo,
    tanggal,
    idCustomer,
    kendaraan,
    barang,
  };
}

function summarizeKodeDepartemen(items: SuratJalanBarang[]) {
  const codes = items
    .map((barang) => barang.kodeDepartemen.trim())
    .filter(Boolean);

  return Array.from(new Set(codes)).join(", ");
}

export function toSuratJalanItem(value: unknown): SuratJalanItem | null {
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
    kodeDepartemen: summarizeKodeDepartemen(barangList) || toDecodedText(row.kodeDepartemen).trim(),
    tanggal: toText(row.tanggal).trim(),
    idCustomer: parseCustomerId(row.idCustomer),
    barang: barangList,
    kendaraan: toText(row.kendaraan).trim(),
    deliveryStatus:
      row.deliveryStatus === "complete" ||
      row.deliveryStatus === "partial" ||
      row.deliveryStatus === "notDelivered"
        ? row.deliveryStatus
        : null,
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

function toNormalizedSuratJalanPayload(form: SuratJalanFormState) {
  return {
    noSuratJalan: toText(form.noSuratJalan).trim(),
    noPo: toText(form.noPo).trim(),
    tanggal: toText(form.tanggal).trim(),
    idCustomer: toText(form.idCustomer).trim(),
    barang: barangRowsToList(form.barangRows),
    kendaraan: toText(form.kendaraan).trim(),
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
    namaBarang: query.namaBarang,
    kodeDepartemen: query.kodeDepartemen,
    idCustomer: query.idCustomer,
    kendaraan: query.kendaraan,
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
    invalidateCachePaths: suratJalanMutationCachePaths,
  });

  return toSuratJalanItem(response?.suratJalan);
}

export async function updateSuratJalan(id: string, form: SuratJalanFormState) {
  const payload = toNormalizedSuratJalanPayload(form);
  const response = await requestApi<SuratJalanResponse>(`/api/surat-jalan/${id}`, {
    method: "PUT",
    body: payload,
    invalidateCachePaths: suratJalanMutationCachePaths,
  });

  return toSuratJalanItem(response?.suratJalan);
}

export async function deleteSuratJalan(id: string) {
  await requestApi(`/api/surat-jalan/${id}`, {
    method: "DELETE",
    invalidateCachePaths: suratJalanMutationCachePaths,
  });
}

export function formatTanggal(value: string, locale: Locale = "id") {
  return formatAppDate(value, locale);
}

export function toInputDate(value: string) {
  return toInputDateValue(value);
}

export function barangLabel(items: SuratJalanBarang[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return "-";
  }

  return items
    .map((item) => {
      const nama = decodeHtmlEntities(item.nama).trim();
      const spesifikasi = decodeHtmlEntities(item.spesifikasi).trim();
      const unit = decodeHtmlEntities(item.unit).trim();
      const namaWithSpec = spesifikasi ? `${nama} (${spesifikasi})` : nama;
      const qtyWithUnit = unit ? `${item.jumlah} ${unit}` : String(item.jumlah);
      return `${namaWithSpec}: ${qtyWithUnit}`;
    })
    .join(", ");
}

export function formatSuratJalanBarangPreviewText(
  item: Pick<SuratJalanBarang, "nama" | "spesifikasi" | "kodeDepartemen" | "jumlah" | "unit">
) {
  const nama = decodeHtmlEntities(item.nama).trim();
  const spesifikasi = decodeHtmlEntities(item.spesifikasi).trim();
  const unit = decodeHtmlEntities(item.unit).trim();
  const kodeDepartemen = decodeHtmlEntities(item.kodeDepartemen).trim();
  const namaWithSpec = spesifikasi ? `${nama} (${spesifikasi})` : nama;
  const qtyWithUnit = unit ? `${item.jumlah} ${unit}` : `${item.jumlah} -`;

  return {
    kodeDepartemen,
    text: `${namaWithSpec}: ${qtyWithUnit}`,
  };
}

export function filterSuratJalanRows(
  rows: SuratJalanItem[],
  filters: SuratJalanFilter,
  resolveCustomerLabel?: ResolveCustomerLabel
) {
  const fromDate = parseAppDateRangeStart(filters.tanggalDari);
  const toDate = parseAppDateRangeEnd(filters.tanggalSampai);

  return rows.filter((row) => {
    const noSuratJalanMatch = normalize(row.noSuratJalan).includes(normalize(filters.noSuratJalan));
    const noPoMatch = normalize(row.noPo).includes(normalize(filters.noPo));
    const namaBarangFilter = normalize(filters.namaBarang);
    const namaBarangMatch =
      !namaBarangFilter ||
      row.barang.some((barang) =>
        normalize(`${barang.nama} ${barang.spesifikasi || ""}`).includes(namaBarangFilter)
      );
    const kodeDepartemenMatch = normalize(row.kodeDepartemen).includes(
      normalize(filters.kodeDepartemen)
    );
    const customerLabel = resolveCustomerLabel ? resolveCustomerLabel(row.idCustomer) : row.idCustomer;
    const idCustomerMatch = normalize(customerLabel).includes(normalize(filters.idCustomer));
    const kendaraanMatch = normalize(row.kendaraan).includes(normalize(filters.kendaraan));
    const rowDate = parseAppDate(row.tanggal);
    const fromDateMatch = !fromDate || Boolean(rowDate && rowDate >= fromDate);
    const toDateMatch = !toDate || Boolean(rowDate && rowDate <= toDate);

    return (
      noSuratJalanMatch &&
      noPoMatch &&
      namaBarangMatch &&
      kodeDepartemenMatch &&
      idCustomerMatch &&
      kendaraanMatch &&
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
    barangRows: ensureTrailingEmptyBarangRow(
      item.barang.map((barang) => ({
        nama: barang.nama,
        spesifikasi: barang.spesifikasi || "",
        kodeDepartemen: barang.kodeDepartemen || "",
        jumlah: String(barang.jumlah),
        unit: barang.unit || "",
      }))
    ),
  };
}

export function toFormStateFromPrefill(prefill: SuratJalanPrefillPayload): SuratJalanFormState {
  return {
    noSuratJalan: "",
    noPo: prefill.noPo,
    tanggal: toInputDate(prefill.tanggal),
    idCustomer: prefill.idCustomer,
    kendaraan: prefill.kendaraan || "",
    barangRows: ensureTrailingEmptyBarangRow(
      prefill.barang.map((barang) => ({
        nama: barang.nama,
        spesifikasi: barang.spesifikasi || "",
        kodeDepartemen: barang.kodeDepartemen || "",
        jumlah: String(barang.jumlah),
        unit: barang.unit,
      }))
    ),
  };
}

export function saveSuratJalanPrefill(payload: SuratJalanPrefillPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(suratJalanPrefillStorageKey, JSON.stringify(payload));
}

export function consumeSuratJalanPrefill() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(suratJalanPrefillStorageKey);

  if (!rawValue) {
    return null;
  }

  window.sessionStorage.removeItem(suratJalanPrefillStorageKey);

  try {
    return toSuratJalanPrefillPayload(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function createEmptyBarangRow(): SuratJalanBarangFormRow {
  return {
    nama: "",
    spesifikasi: "",
    kodeDepartemen: "",
    jumlah: "",
    unit: "",
  };
}

export function isBarangRowFilled(row: SuratJalanBarangFormRow) {
  return Boolean(
    row.nama.trim() ||
      row.spesifikasi.trim() ||
      row.kodeDepartemen.trim() ||
      row.jumlah.trim() ||
      row.unit.trim()
  );
}

export function ensureTrailingEmptyBarangRow(rows: SuratJalanBarangFormRow[]) {
  const normalizedRows = rows.map((row) => ({
    nama: String(row.nama || ""),
    spesifikasi: String(row.spesifikasi || ""),
    kodeDepartemen: String(row.kodeDepartemen || ""),
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
      const nama = toDecodedText(row.nama).trim();
      const spesifikasi = toDecodedText(row.spesifikasi).trim() || null;
      const kodeDepartemen = toDecodedText(row.kodeDepartemen).trim();
      const jumlahParsed = Number(row.jumlah.trim());
      const unit = toDecodedText(row.unit).trim();

      return {
        nama,
        spesifikasi,
        kodeDepartemen,
        jumlah: Number.isFinite(jumlahParsed) ? jumlahParsed : 0,
        unit,
      };
    })
    .filter((barang) => barang.nama && barang.jumlah > 0 && barang.unit);
}

export function buildSuratJalanBarangRowsFromNoPoOption(option?: SuratJalanNoPoOption | null) {
  if (!option || option.barang.length === 0) {
    return ensureTrailingEmptyBarangRow([createEmptyBarangRow()]);
  }

  return ensureTrailingEmptyBarangRow(
    option.barang.map((barang) => ({
      nama: barang.namaBarang,
      spesifikasi: barang.spesifikasi,
      kodeDepartemen: "",
      jumlah: String(barang.kuantitas),
      unit: barang.unit,
    }))
  );
}
