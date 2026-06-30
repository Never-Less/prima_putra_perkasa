import { requestApi } from "../../_lib/api-client";
import {
  formatAppDate,
  parseAppDate,
  parseAppDateRangeEnd,
  parseAppDateRangeStart,
  toInputDateValue,
} from "../../_lib/date";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

type Locale = "id" | "en";

export type PembelianItem = {
  id: string;
  tanggalNota: string;
  namaSupplier: string;
  idSupplier: string;
  noNota: string;
  note: string;
  idInvoice: string;
  hutang: boolean;
  ppn: boolean;
  lamaHutang: number;
  nilaiNota: number;
  tanggalJatuhTempo: string | null;
  tanggalBayar: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PembelianInvoiceOption = {
  id: string;
  noInvoice: string;
};

export type PembelianFilter = {
  namaSupplier: string;
  noNota: string;
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
  idSupplier: string;
  noNota: string;
  note: string;
  idInvoice: string;
  hutang: boolean;
  ppn: boolean;
  lamaHutang: string;
  nilaiNota: string;
  tanggalJatuhTempo: string;
  tanggalBayar: string;
};

export type PembelianListQuery = PembelianFilter & PaginationQueryState;

export type PembelianPrefillPayload = {
  tanggalNota?: string;
  idInvoice?: string;
  noInvoice?: string;
  ppn?: boolean;
  nilaiNota?: number;
};

type PembelianListResponse = {
  pembelians?: unknown[];
  pagination?: unknown;
  summary?: {
    totalRows?: unknown;
    totalGroups?: unknown;
  };
};

type PembelianResponse = {
  pembelian?: unknown;
};

type ResolveInvoiceLabel = (invoiceId: string) => string;

export const pembelianStockInvoiceId = "__pembelian_stock__";

export const defaultPembelianFilter: PembelianFilter = {
  namaSupplier: "",
  noNota: "",
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

const pembelianPrefillStorageKey = "ppp_pembelian_prefill";
const pembelianMutationCachePaths = ["/api/pembelian", "/api/laporan-keuangan"];

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getMonthValueFromDate(value: string | null) {
  const textValue = toText(value).trim();

  if (!textValue) {
    return "";
  }

  const isoMonthMatch = textValue.match(/^(\d{4}-\d{2})/);

  if (isoMonthMatch) {
    return isoMonthMatch[1];
  }

  const date = parseAppDate(textValue);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function parseNumberFromUnknown(value: unknown, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function parseInvoiceId(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "object") {
    const invoice = value as Record<string, unknown>;
    return toText(invoice.id || invoice._id).trim();
  }

  return toText(value).trim();
}

function parseReferenceId(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "object") {
    const reference = value as Record<string, unknown>;
    return toText(reference.id || reference._id).trim();
  }

  return toText(value).trim();
}

function toPembelianItem(value: unknown): PembelianItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();

  if (!id) {
    return null;
  }

  return {
    id: id,
    tanggalNota: toText(row.tanggalNota).trim(),
    namaSupplier: toText(row.namaSupplier).trim(),
    idSupplier: parseReferenceId(row.idSupplier),
    noNota: toText(row.noNota).trim(),
    note: toText(row.note).trim(),
    idInvoice: parseInvoiceId(row.idInvoice),
    hutang: Boolean(row.hutang),
    ppn: Boolean(row.ppn),
    lamaHutang: parseNumberFromUnknown(row.lamaHutang),
    nilaiNota: parseNumberFromUnknown(row.nilaiNota),
    tanggalJatuhTempo: toText(row.tanggalJatuhTempo).trim() || null,
    tanggalBayar: toText(row.tanggalBayar).trim() || null,
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

function parseFilterNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseDateRangeStart(value: string) {
  return parseAppDateRangeStart(value);
}

function parseDateRangeEnd(value: string) {
  return parseAppDateRangeEnd(value);
}

function isDateWithinRange(value: string | null, fromDate: Date | null, toDate: Date | null) {
  if (!fromDate && !toDate) {
    return true;
  }

  if (!value) {
    return false;
  }

  const targetDate = parseAppDate(value);

  if (!targetDate) {
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

function toNormalizedPembelianPayload(form: PembelianFormState) {
  const lamaHutang = parseNumberFromUnknown(form.lamaHutang);
  const nilaiNota = parseNumberFromUnknown(form.nilaiNota);
  const idInvoice = toText(form.idInvoice).trim();
  const tanggalJatuhTempo = toText(form.tanggalJatuhTempo).trim();
  const tanggalBayar = form.hutang ? "" : toText(form.tanggalBayar).trim();

  return {
    tanggalNota: toText(form.tanggalNota).trim(),
    namaSupplier: toText(form.namaSupplier).trim(),
    idSupplier: toText(form.idSupplier).trim() || null,
    noNota: toText(form.noNota).trim(),
    note: toText(form.note).trim(),
    idInvoice: idInvoice && idInvoice !== pembelianStockInvoiceId ? idInvoice : null,
    hutang: form.hutang,
    ppn: form.ppn,
    lamaHutang: lamaHutang,
    nilaiNota: nilaiNota,
    tanggalJatuhTempo: tanggalJatuhTempo || null,
    tanggalBayar: tanggalBayar || null,
  };
}

function toPembelianPrefillPayload(value: unknown): PembelianPrefillPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const idInvoice = toText(payload.idInvoice).trim();
  const noInvoice = toText(payload.noInvoice).trim();

  if (!idInvoice && !noInvoice) {
    return null;
  }

  return {
    tanggalNota: toText(payload.tanggalNota).trim(),
    idInvoice: idInvoice,
    noInvoice: noInvoice,
    ppn: typeof payload.ppn === "boolean" ? payload.ppn : false,
    nilaiNota: parseNumberFromUnknown(payload.nilaiNota),
  };
}

export async function fetchPembelianRows() {
  const response = await requestApi<PembelianListResponse>("/api/pembelian");

  if (!response || !Array.isArray(response.pembelians)) {
    return [];
  }

  return response.pembelians
    .map(toPembelianItem)
    .filter((item): item is PembelianItem => Boolean(item));
}

export async function fetchPembelianList(
  query: PembelianListQuery
): Promise<ServerListResult<PembelianItem>> {
  const requestPath = `/api/pembelian${buildListQueryString({
    namaSupplier: query.namaSupplier,
    noNota: query.noNota,
    noInvoice: query.noInvoice,
    hutang: query.hutang,
    ppn: query.ppn,
    tanggalNotaDari: query.tanggalNotaDari,
    tanggalNotaSampai: query.tanggalNotaSampai,
    tanggalBayarDari: query.tanggalBayarDari,
    tanggalBayarSampai: query.tanggalBayarSampai,
    nilaiNotaMin: query.nilaiNotaMin,
    nilaiNotaMax: query.nilaiNotaMax,
    page: query.page,
    limit: query.limit,
  })}`;
  const response = await requestApi<PembelianListResponse>(requestPath);
  const items = Array.isArray(response?.pembelians)
    ? response.pembelians
        .map(toPembelianItem)
        .filter((item): item is PembelianItem => Boolean(item))
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

export async function fetchPembelianById(id: string) {
  const pembelianId = toText(id).trim();

  if (!pembelianId) {
    return null;
  }

  const response = await requestApi<PembelianResponse>(`/api/pembelian/${pembelianId}`);
  return toPembelianItem(response?.pembelian);
}

export async function createPembelian(form: PembelianFormState) {
  const payload = toNormalizedPembelianPayload(form);
  const response = await requestApi<PembelianResponse>("/api/pembelian", {
    method: "POST",
    body: payload,
    invalidateCachePaths: pembelianMutationCachePaths,
  });

  return toPembelianItem(response?.pembelian);
}

export async function updatePembelian(id: string, form: PembelianFormState) {
  const payload = toNormalizedPembelianPayload(form);
  const response = await requestApi<PembelianResponse>(`/api/pembelian/${id}`, {
    method: "PUT",
    body: payload,
    invalidateCachePaths: pembelianMutationCachePaths,
  });

  return toPembelianItem(response?.pembelian);
}

export async function deletePembelian(id: string) {
  await requestApi(`/api/pembelian/${id}`, {
    method: "DELETE",
    invalidateCachePaths: pembelianMutationCachePaths,
  });
}

export function formatTanggal(value: string | null, locale: Locale = "id") {
  return formatAppDate(value, locale);
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
  return toInputDateValue(value);
}

export function toPembelianFormState(item: PembelianItem): PembelianFormState {
  return {
    tanggalNota: toInputDate(item.tanggalNota),
    namaSupplier: item.namaSupplier,
    idSupplier: item.idSupplier,
    noNota: item.noNota,
    note: item.note,
    idInvoice: item.idInvoice || pembelianStockInvoiceId,
    hutang: item.hutang,
    ppn: item.ppn,
    lamaHutang: String(item.lamaHutang),
    nilaiNota: String(item.nilaiNota),
    tanggalJatuhTempo: toInputDate(item.tanggalJatuhTempo),
    tanggalBayar: toInputDate(item.tanggalBayar),
  };
}

export function toPembelianFormStateFromPrefill(
  prefill: PembelianPrefillPayload,
  invoiceOptions: PembelianInvoiceOption[] = []
): PembelianFormState {
  const fallbackInvoiceId =
    prefill.idInvoice ||
    invoiceOptions.find((invoice) => invoice.noInvoice === prefill.noInvoice)?.id ||
    pembelianStockInvoiceId;

  return {
    tanggalNota: toInputDate(prefill.tanggalNota || null),
    namaSupplier: "",
    idSupplier: "",
    noNota: "",
    note: "",
    idInvoice: fallbackInvoiceId,
    hutang: false,
    ppn: Boolean(prefill.ppn),
    lamaHutang: "0",
    nilaiNota: String(parseNumberFromUnknown(prefill.nilaiNota)),
    tanggalJatuhTempo: "",
    tanggalBayar: "",
  };
}

export function savePembelianPrefill(payload: PembelianPrefillPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(pembelianPrefillStorageKey, JSON.stringify(payload));
}

export function consumePembelianPrefill() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(pembelianPrefillStorageKey);

  if (!rawValue) {
    return null;
  }

  window.sessionStorage.removeItem(pembelianPrefillStorageKey);

  try {
    const parsedValue = JSON.parse(rawValue);
    return toPembelianPrefillPayload(parsedValue);
  } catch {
    return null;
  }
}

export function filterPembelianRows(
  rows: PembelianItem[],
  filter: PembelianFilter,
  resolveInvoiceLabel?: ResolveInvoiceLabel
) {
  const tanggalNotaDari = parseDateRangeStart(filter.tanggalNotaDari);
  const tanggalNotaSampai = parseDateRangeEnd(filter.tanggalNotaSampai);
  const tanggalBayarDari = parseDateRangeStart(filter.tanggalBayarDari);
  const tanggalBayarSampai = parseDateRangeEnd(filter.tanggalBayarSampai);
  const nilaiNotaMin = parseFilterNumber(filter.nilaiNotaMin);
  const nilaiNotaMax = parseFilterNumber(filter.nilaiNotaMax);

  return rows.filter((row) => {
    const matchNamaSupplier = normalize(row.namaSupplier).includes(normalize(filter.namaSupplier));
    const matchNoNota = normalize(row.noNota || "").includes(normalize(filter.noNota));
    const invoiceLabel = resolveInvoiceLabel ? resolveInvoiceLabel(row.idInvoice) : row.idInvoice;
    const matchNoInvoice = normalize(invoiceLabel || "").includes(normalize(filter.noInvoice));

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
      matchNoNota &&
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

export function isPembelianStockItem(row: PembelianItem) {
  return !String(row.idInvoice || "").trim();
}

export function filterPembelianStockRowsByMonth(rows: PembelianItem[], bulan: string) {
  const selectedMonth = String(bulan || "").trim();

  return rows.filter(
    (row) => isPembelianStockItem(row) && getMonthValueFromDate(row.tanggalNota) === selectedMonth
  );
}

export function calculatePembelianStockTotalByMonth(rows: PembelianItem[], bulan: string) {
  return filterPembelianStockRowsByMonth(rows, bulan).reduce(
    (total, row) => total + Number(row.nilaiNota || 0),
    0
  );
}
