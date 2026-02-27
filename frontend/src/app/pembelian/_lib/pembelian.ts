import { requestApi } from "../../_lib/api-client";

type Locale = "id" | "en";

export type PembelianItem = {
  id: string;
  tanggalNota: string;
  namaSupplier: string;
  noNpwp: string;
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
  idInvoice: string;
  hutang: boolean;
  ppn: boolean;
  lamaHutang: string;
  nilaiNota: string;
  tanggalJatuhTempo: string;
  tanggalBayar: string;
};

export type PembelianPrefillPayload = {
  tanggalNota?: string;
  idInvoice?: string;
  noInvoice?: string;
  ppn?: boolean;
  nilaiNota?: number;
};

type PembelianListResponse = {
  pembelians?: unknown[];
};

type PembelianResponse = {
  pembelian?: unknown;
};

type ResolveInvoiceLabel = (invoiceId: string) => string;

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

const pembelianPrefillStorageKey = "ppp_pembelian_prefill";

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
    noNpwp: toText(row.noNpwp).trim(),
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

function toNormalizedPembelianPayload(form: PembelianFormState) {
  const lamaHutang = parseNumberFromUnknown(form.lamaHutang);
  const nilaiNota = parseNumberFromUnknown(form.nilaiNota);
  const idInvoice = toText(form.idInvoice).trim();
  const tanggalJatuhTempo = toText(form.tanggalJatuhTempo).trim();
  const tanggalBayar = toText(form.tanggalBayar).trim();

  return {
    tanggalNota: toText(form.tanggalNota).trim(),
    namaSupplier: toText(form.namaSupplier).trim(),
    noNpwp: toText(form.noNpwp).trim(),
    idInvoice: idInvoice || null,
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

export async function createPembelian(form: PembelianFormState) {
  const payload = toNormalizedPembelianPayload(form);
  const response = await requestApi<PembelianResponse>("/api/pembelian", {
    method: "POST",
    body: payload,
  });

  return toPembelianItem(response?.pembelian);
}

export async function updatePembelian(id: string, form: PembelianFormState) {
  const payload = toNormalizedPembelianPayload(form);
  const response = await requestApi<PembelianResponse>(`/api/pembelian/${id}`, {
    method: "PUT",
    body: payload,
  });

  return toPembelianItem(response?.pembelian);
}

export async function deletePembelian(id: string) {
  await requestApi(`/api/pembelian/${id}`, {
    method: "DELETE",
  });
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
    idInvoice: item.idInvoice,
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
    "";

  return {
    tanggalNota: toInputDate(prefill.tanggalNota || null),
    namaSupplier: "",
    noNpwp: "",
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
    const matchNoNpwp = normalize(row.noNpwp || "").includes(normalize(filter.noNpwp));
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
