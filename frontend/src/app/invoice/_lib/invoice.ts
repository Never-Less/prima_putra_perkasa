import { requestApi } from "../../_lib/api-client";
import { formatAppDate, parseAppDate, parseAppDateRangeEnd, parseAppDateRangeStart, toInputDateValue } from "../../_lib/date";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

export type InvoiceBarangSource = {
  suratJalanId: string;
  noSuratJalan: string;
  noPo: string;
  barangId: string;
  kuantitas: number;
};

export type InvoiceBarang = {
  namaBarang: string;
  spesifikasi: string;
  kuantitas: number;
  unit: string;
  hargaSatuan: number;
  jumlah: number;
  noPoManual: string;
  sources: InvoiceBarangSource[];
};

type Locale = "id" | "en";

export type InvoiceItem = {
  id: string;
  tanggal: string;
  noInvoice: string;
  noPo: string;
  noPoList: string[];
  noSuratJalan: string[];
  idCustomer: string;
  barang: InvoiceBarang[];
  isPpn: boolean;
  isPaid: boolean;
  tanggalBayar: string | null;
  ppnRate: number;
  ppnAmount: number;
  subtotal: number;
  grandTotal: number;
};

export type InvoiceBarangFormRow = {
  namaBarang: string;
  spesifikasi: string;
  kuantitas: string;
  unit: string;
  hargaSatuan: string;
  noPoManual: string;
  sources: InvoiceBarangSource[];
};

export type InvoiceFormState = {
  tanggal: string;
  noInvoice: string;
  noPo: string;
  noPoList: string[];
  noSuratJalanText: string;
  idCustomer: string;
  isPpn: boolean;
  isPaid: boolean;
  tanggalBayar: string;
  ppnRate: string;
  barangRows: InvoiceBarangFormRow[];
};

export type InvoicePrefillBarang = {
  namaBarang: string;
  spesifikasi: string;
  kuantitas: number;
  unit: string;
  hargaSatuan?: number;
  noPoManual?: string;
  sources?: InvoiceBarangSource[];
};

export type InvoicePrefillPayload = {
  tanggal: string;
  noPo: string;
  noPoList?: string[];
  noSuratJalan: string[];
  idCustomer: string;
  barang: InvoicePrefillBarang[];
  isPpn?: boolean;
  ppnRate?: number;
};

export type InvoiceFilter = {
  noInvoice: string;
  noPo: string;
  noSuratJalan: string;
  namaBarang: string;
  idCustomer: string;
  isPpn: "" | "true" | "false";
  isPaid: "" | "true" | "false";
  tanggalBayarDari: string;
  tanggalBayarSampai: string;
  tanggalDari: string;
  tanggalSampai: string;
};

export type InvoiceListQuery = InvoiceFilter & PaginationQueryState;

export type InvoiceSuratJalanBarangOption = {
  barangId: string;
  nama: string;
  spesifikasi: string;
  kodeDepartemen: string;
  jumlah: number;
  unit: string;
  hargaSatuan: number;
};

export type InvoiceSuratJalanRowOption = {
  suratJalanId: string;
  noSuratJalan: string;
  barang: InvoiceSuratJalanBarangOption[];
};

export type InvoiceSuratJalanOption = {
  noPo: string;
  idCustomer: string;
  barang: InvoiceSuratJalanBarangOption[];
  noSuratJalan: InvoiceSuratJalanRowOption[];
};

type InvoiceListResponse = {
  invoices?: unknown[];
  pagination?: unknown;
  summary?: {
    totalRows?: unknown;
  };
};

type InvoiceResponse = {
  invoice?: unknown;
};

type InvoiceSuratJalanOptionsResponse = {
  noPoOptions?: unknown[];
};

type ResolveCustomerLabel = (customerId: string) => string;

export const defaultInvoiceFilter: InvoiceFilter = {
  noInvoice: "",
  noPo: "",
  noSuratJalan: "",
  namaBarang: "",
  idCustomer: "",
  isPpn: "",
  isPaid: "",
  tanggalBayarDari: "",
  tanggalBayarSampai: "",
  tanggalDari: "",
  tanggalSampai: "",
};

const invoicePrefillStorageKey = "ppp_invoice_prefill";
const invoiceMutationCachePaths = [
  "/api/invoices",
  "/api/surat-jalan",
  "/api/purchase-orders",
  "/api/pembelian",
];

export const sampleInvoiceRows: InvoiceItem[] = [
  {
    id: "inv-260301",
    tanggal: "2026-03-01",
    noInvoice: "INV-260301",
    noPo: "SO-90011",
    noPoList: ["SO-90011"],
    noSuratJalan: ["SJ-260311", "SJ-260312"],
    idCustomer: "PT Nusantara Bangun",
    barang: [
      {
        namaBarang: "Semen Curah",
        spesifikasi: "",
        kuantitas: 120,
        unit: "zak",
        hargaSatuan: 75000,
        jumlah: 9000000,
        noPoManual: "SO-90011",
        sources: [],
      },
      {
        namaBarang: "Pasir Halus",
        spesifikasi: "",
        kuantitas: 40,
        unit: "m3",
        hargaSatuan: 300000,
        jumlah: 12000000,
        noPoManual: "SO-90011",
        sources: [],
      },
    ],
    isPpn: true,
    isPaid: false,
    tanggalBayar: null,
    ppnRate: 11,
    ppnAmount: 2310000,
    subtotal: 21000000,
    grandTotal: 23310000,
  },
  {
    id: "inv-260302",
    tanggal: "2026-03-02",
    noInvoice: "INV-260302",
    noPo: "SO-90012",
    noPoList: ["SO-90012"],
    noSuratJalan: ["SJ-260320"],
    idCustomer: "CV Pilar Teknik",
    barang: [
      {
        namaBarang: "Besi Beton",
        spesifikasi: "",
        kuantitas: 80,
        unit: "batang",
        hargaSatuan: 95000,
        jumlah: 7600000,
        noPoManual: "SO-90012",
        sources: [],
      },
    ],
    isPpn: false,
    isPaid: false,
    tanggalBayar: null,
    ppnRate: 11,
    ppnAmount: 0,
    subtotal: 7600000,
    grandTotal: 7600000,
  },
  {
    id: "inv-260303",
    tanggal: "2026-03-03",
    noInvoice: "INV-260303",
    noPo: "SO-90013",
    noPoList: ["SO-90013"],
    noSuratJalan: ["SJ-260313", "SJ-260314", "SJ-260315"],
    idCustomer: "PT Sinar Baja Utama",
    barang: [
      {
        namaBarang: "Cat Primer",
        spesifikasi: "",
        kuantitas: 24,
        unit: "kaleng",
        hargaSatuan: 150000,
        jumlah: 3600000,
        noPoManual: "SO-90013",
        sources: [],
      },
    ],
    isPpn: true,
    isPaid: false,
    tanggalBayar: null,
    ppnRate: 11,
    ppnAmount: 396000,
    subtotal: 3600000,
    grandTotal: 3996000,
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normalizeNoSuratJalanList(value: unknown) {
  const source = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const normalized: string[] = [];

  source.forEach((item) => {
    const noSuratJalan = String(item || "").trim();
    const key = normalize(noSuratJalan);

    if (!noSuratJalan || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(noSuratJalan);
  });

  return normalized;
}

function normalizeNoPoList(value: unknown) {
  const source = Array.isArray(value) ? value : toText(value).split(",");
  const seen = new Set<string>();
  const normalized: string[] = [];

  source.forEach((item) => {
    const noPo = toText(item).trim();
    const key = normalize(noPo);

    if (!noPo || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(noPo);
  });

  return normalized;
}

function normalizeInvoiceBarangSources(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: InvoiceBarangSource[] = [];

  value.forEach((source) => {
    if (!source || typeof source !== "object") {
      return;
    }

    const item = source as Record<string, unknown>;
    const suratJalanId = toText(item.suratJalanId).trim();
    const noSuratJalan = toText(item.noSuratJalan).trim();
    const noPo = toText(item.noPo).trim();
    const barangId = toText(item.barangId).trim();
    const kuantitas = parseNumberFromUnknown(item.kuantitas);

    if (!noSuratJalan || !noPo || kuantitas <= 0) {
      return;
    }

    normalized.push({
      suratJalanId,
      noSuratJalan,
      noPo,
      barangId,
      kuantitas,
    });
  });

  return normalized;
}

export function buildSuratJalanInvoiceSpesifikasi(spesifikasiValue: unknown, kodeDepartemenValue: unknown) {
  const spesifikasi = toText(spesifikasiValue).trim();
  const kodeDepartemen = toText(kodeDepartemenValue).trim();

  return [spesifikasi, kodeDepartemen].filter(Boolean).join(" - ");
}

function toInvoiceSuratJalanBarangOption(value: unknown): InvoiceSuratJalanBarangOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const barangId = toText(item.barangId || item.id || item._id).trim();
  const nama = toText(item.nama).trim();
  const spesifikasi = toText(item.spesifikasi).trim();
  const kodeDepartemen = toText(item.kodeDepartemen).trim();
  const jumlah = parseNumberFromUnknown(item.jumlah);
  const unit = toText(item.unit).trim();
  const hargaSatuan = parseNumberFromUnknown(item.hargaSatuan);

  if (!nama || jumlah <= 0) {
    return null;
  }

  return {
    barangId,
    nama,
    spesifikasi,
    kodeDepartemen,
    jumlah,
    unit,
    hargaSatuan,
  };
}

function toInvoiceSuratJalanRowOption(value: unknown): InvoiceSuratJalanRowOption | null {
  if (typeof value === "string") {
    const noSuratJalan = value.trim();

    if (!noSuratJalan) {
      return null;
    }

    return {
      suratJalanId: "",
      noSuratJalan,
      barang: [],
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const suratJalanId = toText(item.suratJalanId || item.id || item._id).trim();
  const noSuratJalan = toText(item.noSuratJalan).trim();
  const barang = Array.isArray(item.barang)
    ? item.barang
        .map(toInvoiceSuratJalanBarangOption)
        .filter((barangItem): barangItem is InvoiceSuratJalanBarangOption => Boolean(barangItem))
    : [];

  if (!noSuratJalan) {
    return null;
  }

  return {
    suratJalanId,
    noSuratJalan,
    barang,
  };
}

function toInvoiceSuratJalanOption(value: unknown): InvoiceSuratJalanOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const option = value as Record<string, unknown>;
  const noPo = toText(option.noPo).trim();
  const idCustomer = parseCustomerId(option.idCustomer);
  const noSuratJalan = Array.isArray(option.noSuratJalan)
    ? option.noSuratJalan
        .map(toInvoiceSuratJalanRowOption)
        .filter((item): item is InvoiceSuratJalanRowOption => Boolean(item))
    : [];
  const barang = Array.isArray(option.barang)
    ? option.barang
        .map(toInvoiceSuratJalanBarangOption)
        .filter((item): item is InvoiceSuratJalanBarangOption => Boolean(item))
    : [];

  if (!noPo || (noSuratJalan.length === 0 && barang.length === 0)) {
    return null;
  }

  return {
    noPo,
    idCustomer,
    barang,
    noSuratJalan,
  };
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

function parseNumber(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function parseNumberFromUnknown(value: unknown, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function toInvoiceBarang(value: unknown): InvoiceBarang | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const namaBarang = toText(item.namaBarang).trim();
  const spesifikasi = toText(item.spesifikasi).trim();
  const kuantitas = parseNumberFromUnknown(item.kuantitas);
  const unit = toText(item.unit).trim();
  const hargaSatuan = parseNumberFromUnknown(item.hargaSatuan);
  const jumlah = parseNumberFromUnknown(item.jumlah, roundCurrency(kuantitas * hargaSatuan));
  const noPoManual = toText(item.noPoManual).trim();
  const sources = normalizeInvoiceBarangSources(item.sources);

  if (!namaBarang || !unit || kuantitas < 0 || hargaSatuan < 0 || jumlah < 0) {
    return null;
  }

  return {
    namaBarang,
    spesifikasi,
    kuantitas,
    unit,
    hargaSatuan,
    jumlah,
    noPoManual,
    sources,
  };
}

function toInvoiceItem(value: unknown): InvoiceItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();

  if (!id) {
    return null;
  }

  const barang = Array.isArray(row.barang)
    ? row.barang.map(toInvoiceBarang).filter((item): item is InvoiceBarang => Boolean(item))
    : [];

  const isPaid = Boolean(row.isPaid);

  const noPoList = normalizeNoPoList(row.noPoList);
  const fallbackNoPoList = noPoList.length > 0 ? noPoList : normalizeNoPoList(row.noPo);

  return {
    id: id,
    tanggal: toText(row.tanggal).trim(),
    noInvoice: toText(row.noInvoice).trim(),
    noPo: invoiceNoPoListLabel(fallbackNoPoList),
    noPoList: fallbackNoPoList,
    noSuratJalan: normalizeNoSuratJalanList(row.noSuratJalan),
    idCustomer: parseCustomerId(row.idCustomer),
    barang: barang,
    isPpn: Boolean(row.isPpn),
    isPaid,
    tanggalBayar: isPaid ? toText(row.tanggalBayar).trim() || null : null,
    ppnRate: parseNumberFromUnknown(row.ppnRate, 11),
    ppnAmount: parseNumberFromUnknown(row.ppnAmount),
    subtotal: parseNumberFromUnknown(row.subtotal),
    grandTotal: parseNumberFromUnknown(row.grandTotal),
  };
}

function normalizePrefillBarang(value: unknown): InvoicePrefillBarang | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const namaBarang = toText(item.namaBarang).trim();
  const spesifikasi = toText(item.spesifikasi).trim();
  const kuantitas = parseNumberFromUnknown(item.kuantitas);
  const unit = toText(item.unit).trim();
  const hargaSatuan = parseNumberFromUnknown(item.hargaSatuan);
  const noPoManual = toText(item.noPoManual).trim();
  const sources = normalizeInvoiceBarangSources(item.sources);

  if (!namaBarang || kuantitas <= 0) {
    return null;
  }

  return {
    namaBarang,
    spesifikasi,
    kuantitas,
    unit,
    hargaSatuan,
    noPoManual,
    sources,
  };
}

function toInvoicePrefillPayload(value: unknown): InvoicePrefillPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const noPoList = normalizeNoPoList(payload.noPoList);
  const fallbackNoPoList = noPoList.length > 0 ? noPoList : normalizeNoPoList(payload.noPo);
  const noPo = invoiceNoPoListLabel(fallbackNoPoList);
  const idCustomer = toText(payload.idCustomer).trim();
  const tanggal = toText(payload.tanggal).trim();
  const noSuratJalan = normalizeNoSuratJalanList(payload.noSuratJalan);
  const barang = Array.isArray(payload.barang)
    ? payload.barang
        .map(normalizePrefillBarang)
        .filter((item): item is InvoicePrefillBarang => Boolean(item))
    : [];
  const isPpn = typeof payload.isPpn === "boolean" ? payload.isPpn : true;
  const ppnRate = parseNumberFromUnknown(payload.ppnRate, 11);

  if (fallbackNoPoList.length === 0 || barang.length === 0) {
    return null;
  }

  return {
    tanggal,
    noPo,
    noPoList: fallbackNoPoList,
    noSuratJalan,
    idCustomer,
    barang,
    isPpn,
    ppnRate,
  };
}

function toNormalizedInvoicePayload(form: InvoiceFormState) {
  const barang = invoiceBarangRowsToList(form.barangRows);
  const noSuratJalan = invoiceNoSuratJalanTextToList(form.noSuratJalanText);
  const noPoList = normalizeNoPoList(form.noPoList.length > 0 ? form.noPoList : form.noPo);
  const ppnRateValue = parseNumber(form.ppnRate || "0");

  return {
    tanggal: toText(form.tanggal).trim(),
    noInvoice: toText(form.noInvoice).trim(),
    noPo: noPoList,
    noPoList: noPoList,
    noSuratJalan: noSuratJalan,
    idCustomer: toText(form.idCustomer).trim(),
    barang: barang,
    isPpn: form.isPpn,
    isPaid: form.isPaid,
    tanggalBayar: form.isPaid ? toText(form.tanggalBayar).trim() || null : null,
    ppnRate: Number.isFinite(ppnRateValue) ? ppnRateValue : 0,
  };
}

export async function fetchInvoiceRows() {
  const response = await requestApi<InvoiceListResponse>("/api/invoices");

  if (!response || !Array.isArray(response.invoices)) {
    return [];
  }

  return response.invoices.map(toInvoiceItem).filter((item): item is InvoiceItem => Boolean(item));
}

export async function fetchInvoiceList(query: InvoiceListQuery): Promise<ServerListResult<InvoiceItem>> {
  const requestPath = `/api/invoices${buildListQueryString({
    noInvoice: query.noInvoice,
    noPo: query.noPo,
    noSuratJalan: query.noSuratJalan,
    namaBarang: query.namaBarang,
    idCustomer: query.idCustomer,
    isPpn: query.isPpn,
    isPaid: query.isPaid,
    tanggalBayarDari: query.tanggalBayarDari,
    tanggalBayarSampai: query.tanggalBayarSampai,
    tanggalDari: query.tanggalDari,
    tanggalSampai: query.tanggalSampai,
    page: query.page,
    limit: query.limit,
  })}`;
  const response = await requestApi<InvoiceListResponse>(requestPath);
  const items = Array.isArray(response?.invoices)
    ? response.invoices.map(toInvoiceItem).filter((item): item is InvoiceItem => Boolean(item))
    : [];
  const pagination = normalizeServerPaginationMeta(response?.pagination, {
    page: query.page,
    limit: query.limit,
  });
  const totalRows = Number(response?.summary?.totalRows);

  return {
    items,
    pagination,
    totalRows: Number.isFinite(totalRows) && totalRows >= 0 ? totalRows : pagination.totalItems,
  };
}

export async function fetchInvoiceExportRows(query: InvoiceFilter) {
  const requestPath = `/api/invoices${buildListQueryString({
    noInvoice: query.noInvoice,
    noPo: query.noPo,
    noSuratJalan: query.noSuratJalan,
    namaBarang: query.namaBarang,
    idCustomer: query.idCustomer,
    isPpn: query.isPpn,
    isPaid: query.isPaid,
    tanggalBayarDari: query.tanggalBayarDari,
    tanggalBayarSampai: query.tanggalBayarSampai,
    tanggalDari: query.tanggalDari,
    tanggalSampai: query.tanggalSampai,
  })}`;
  const response = await requestApi<InvoiceListResponse>(requestPath);

  if (!Array.isArray(response?.invoices)) {
    return [];
  }

  return response.invoices.map(toInvoiceItem).filter((item): item is InvoiceItem => Boolean(item));
}

export async function fetchInvoiceById(id: string) {
  const invoiceId = toText(id).trim();

  if (!invoiceId) {
    return null;
  }

  const response = await requestApi<InvoiceResponse>(`/api/invoices/${invoiceId}`);
  return toInvoiceItem(response?.invoice);
}

export async function fetchInvoiceSuratJalanOptions() {
  const response = await requestApi<InvoiceSuratJalanOptionsResponse>("/api/surat-jalan/invoice-options");

  if (!response || !Array.isArray(response.noPoOptions)) {
    return [];
  }

  return response.noPoOptions
    .map(toInvoiceSuratJalanOption)
    .filter((item): item is InvoiceSuratJalanOption => Boolean(item));
}

export async function createInvoice(form: InvoiceFormState) {
  const payload = toNormalizedInvoicePayload(form);
  const response = await requestApi<InvoiceResponse>("/api/invoices", {
    method: "POST",
    body: payload,
    invalidateCachePaths: invoiceMutationCachePaths,
  });

  return toInvoiceItem(response?.invoice);
}

export async function updateInvoice(id: string, form: InvoiceFormState) {
  const payload = toNormalizedInvoicePayload(form);
  const response = await requestApi<InvoiceResponse>(`/api/invoices/${id}`, {
    method: "PUT",
    body: payload,
    invalidateCachePaths: invoiceMutationCachePaths,
  });

  return toInvoiceItem(response?.invoice);
}

export async function deleteInvoice(id: string) {
  await requestApi(`/api/invoices/${id}`, {
    method: "DELETE",
    invalidateCachePaths: invoiceMutationCachePaths,
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

export function invoiceNoSuratJalanListToText(noSuratJalan: string[]) {
  return normalizeNoSuratJalanList(noSuratJalan).join("\n");
}

export function invoiceNoSuratJalanTextToList(value: string) {
  return normalizeNoSuratJalanList(value.split(/\r?\n/));
}

export function invoiceNoSuratJalanListLabel(noSuratJalan: string[]) {
  const normalized = normalizeNoSuratJalanList(noSuratJalan);

  if (normalized.length === 0) {
    return "-";
  }

  return normalized.join(", ");
}

export function invoiceNoPoListLabel(noPoList: string[]) {
  const normalized = normalizeNoPoList(noPoList);

  if (normalized.length === 0) {
    return "";
  }

  return normalized.join(", ");
}

export function toInputDate(value: string | null) {
  return toInputDateValue(value);
}

export function createEmptyInvoiceBarangRow(): InvoiceBarangFormRow {
  return {
    namaBarang: "",
    spesifikasi: "",
    kuantitas: "",
    unit: "",
    hargaSatuan: "",
    noPoManual: "",
    sources: [],
  };
}

export function isInvoiceBarangRowFilled(row: InvoiceBarangFormRow) {
  return Boolean(
    row.namaBarang.trim() ||
      row.spesifikasi.trim() ||
      row.kuantitas.trim() ||
      row.unit.trim() ||
      row.hargaSatuan.trim() ||
      row.noPoManual.trim() ||
      row.sources.length > 0
  );
}

export function ensureTrailingEmptyInvoiceBarangRow(rows: InvoiceBarangFormRow[]) {
  const normalizedRows = rows.map((row) => ({
    namaBarang: String(row.namaBarang || ""),
    spesifikasi: String(row.spesifikasi || ""),
    kuantitas: String(row.kuantitas || ""),
    unit: String(row.unit || ""),
    hargaSatuan: String(row.hargaSatuan || ""),
    noPoManual: String(row.noPoManual || ""),
    sources: normalizeInvoiceBarangSources(row.sources),
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

export function formatInvoiceBarangLabel(namaBarang: string, spesifikasi = "") {
  const normalizedNamaBarang = toText(namaBarang).trim();
  const normalizedSpesifikasi = toText(spesifikasi).trim();

  if (!normalizedNamaBarang) {
    return "";
  }

  if (!normalizedSpesifikasi) {
    return normalizedNamaBarang;
  }

  return `${normalizedNamaBarang} (${normalizedSpesifikasi})`;
}

function normalizeInvoiceBarangIdentityPart(value: string) {
  return normalize(value).replace(/\s+/g, " ");
}

function createInvoiceBarangIdentityKey(namaBarang: string, spesifikasi: string, unit: string, noPo = "") {
  return `${normalizeInvoiceBarangIdentityPart(namaBarang)}::${normalizeInvoiceBarangIdentityPart(
    spesifikasi
  )}::${normalizeInvoiceBarangIdentityPart(unit)}::${normalizeInvoiceBarangIdentityPart(noPo)}`;
}

function invoiceBarangSourceNoPoList(sources: InvoiceBarangSource[]) {
  const seen = new Set<string>();
  const values: string[] = [];

  normalizeInvoiceBarangSources(sources).forEach((source) => {
    const noPo = toText(source.noPo).trim();
    const key = normalize(noPo);

    if (!noPo || seen.has(key)) {
      return;
    }

    seen.add(key);
    values.push(noPo);
  });

  return values;
}

function invoiceBarangRowNoPoLabel(row: InvoiceBarangFormRow) {
  const sourceNoPoList = invoiceBarangSourceNoPoList(row.sources);

  if (sourceNoPoList.length > 0) {
    return sourceNoPoList.join(", ");
  }

  return toText(row.noPoManual).trim();
}

export function invoiceBarangNoPoLabel(barang: Pick<InvoiceBarang, "noPoManual" | "sources">, fallbackNoPoList: string[] = []) {
  const sourceNoPoList = invoiceBarangSourceNoPoList(barang.sources);

  if (sourceNoPoList.length > 0) {
    return sourceNoPoList.join(", ");
  }

  const noPoManual = toText(barang.noPoManual).trim();

  if (noPoManual) {
    return noPoManual;
  }

  const normalizedFallbackNoPoList = normalizeNoPoList(fallbackNoPoList);
  return normalizedFallbackNoPoList.length === 1 ? normalizedFallbackNoPoList[0] : "-";
}

export function buildInvoiceBarangRowsFromSuratJalanSelection(
  suratJalanOptions: InvoiceSuratJalanOption[],
  noPo: string | string[],
  selectedNoSuratJalan: string[],
  currentRows: InvoiceBarangFormRow[] = []
) {
  const selectedNoPoSet = new Set(normalizeNoPoList(noPo));
  const selectedSet = new Set(normalizeNoSuratJalanList(selectedNoSuratJalan));

  if (selectedNoPoSet.size === 0) {
    return ensureTrailingEmptyInvoiceBarangRow([createEmptyInvoiceBarangRow()]);
  }

  const selectedNoPoOptions = suratJalanOptions.filter((option) =>
    selectedNoPoSet.has(option.noPo)
  );

  if (selectedNoPoOptions.length === 0) {
    return ensureTrailingEmptyInvoiceBarangRow([createEmptyInvoiceBarangRow()]);
  }

  const hargaSatuanMap = new Map<string, string>();
  const salesOrderHargaSatuanMap = new Map<string, string>();

  const addSalesOrderHargaSatuan = (
    noPoValue: string,
    namaBarangValue: string,
    spesifikasiValue: string,
    unitValue: string,
    hargaSatuanValue: number
  ) => {
    if (!namaBarangValue || !unitValue || hargaSatuanValue <= 0) {
      return;
    }

    const hargaSatuanText = String(hargaSatuanValue);
    const keys = [createInvoiceBarangIdentityKey(namaBarangValue, spesifikasiValue, unitValue, noPoValue)];

    keys.forEach((key) => {
      if (!salesOrderHargaSatuanMap.has(key)) {
        salesOrderHargaSatuanMap.set(key, hargaSatuanText);
      }
    });
  };

  const findSalesOrderHargaSatuan = (
    noPoValue: string,
    namaBarangValue: string,
    spesifikasiValue: string,
    unitValue: string,
    fallbackSpesifikasiValue = ""
  ) => {
    const keys = [
      createInvoiceBarangIdentityKey(namaBarangValue, spesifikasiValue, unitValue, noPoValue),
      createInvoiceBarangIdentityKey(namaBarangValue, fallbackSpesifikasiValue, unitValue, noPoValue),
    ];

    for (const key of keys) {
      const hargaSatuan = salesOrderHargaSatuanMap.get(key);

      if (hargaSatuan) {
        return hargaSatuan;
      }
    }

    return "";
  };

  selectedNoPoOptions.forEach((selectedNoPoOption) => {
    selectedNoPoOption.barang.forEach((barang) => {
      addSalesOrderHargaSatuan(
        selectedNoPoOption.noPo,
        toText(barang.nama).trim(),
        toText(barang.spesifikasi).trim(),
        toText(barang.unit).trim(),
        barang.hargaSatuan
      );
    });
  });

  currentRows.forEach((row) => {
    const namaBarang = toText(row.namaBarang).trim();
    const spesifikasi = toText(row.spesifikasi).trim();
    const unit = toText(row.unit).trim();
    const noPo = invoiceBarangRowNoPoLabel(row);

    if (!namaBarang || !unit) {
      return;
    }

    const identityKey = createInvoiceBarangIdentityKey(namaBarang, spesifikasi, unit, noPo);
    const hargaSatuan = toText(row.hargaSatuan).trim();

    if (parseNumber(hargaSatuan) > 0 && !hargaSatuanMap.has(identityKey)) {
      hargaSatuanMap.set(identityKey, hargaSatuan);
    }
  });

  const barangMap = new Map<string, InvoiceBarangFormRow>();

  selectedNoPoOptions.forEach((selectedNoPoOption) => {
    let hasSelectedSuratJalan = false;

    selectedNoPoOption.noSuratJalan.forEach((suratJalan) => {
      if (!selectedSet.has(suratJalan.noSuratJalan)) {
        return;
      }

      hasSelectedSuratJalan = true;

      suratJalan.barang.forEach((barang) => {
        const namaBarang = toText(barang.nama).trim();
        const spesifikasi = buildSuratJalanInvoiceSpesifikasi(barang.spesifikasi, barang.kodeDepartemen);
        const unit = toText(barang.unit).trim();
        const noPoValue = selectedNoPoOption.noPo;
        const source: InvoiceBarangSource = {
          suratJalanId: suratJalan.suratJalanId,
          noSuratJalan: suratJalan.noSuratJalan,
          noPo: noPoValue,
          barangId: barang.barangId,
          kuantitas: barang.jumlah,
        };
        const identityKey = createInvoiceBarangIdentityKey(namaBarang, spesifikasi, unit, noPoValue);
        const existingItem = barangMap.get(identityKey);
        const salesOrderHargaSatuan = findSalesOrderHargaSatuan(
          noPoValue,
          namaBarang,
          spesifikasi,
          unit,
          toText(barang.spesifikasi).trim()
        );

        if (existingItem) {
          const currentQty = parseNumber(existingItem.kuantitas);
          existingItem.kuantitas = String(currentQty + barang.jumlah);
          existingItem.sources = [...existingItem.sources, source];
          return;
        }

        barangMap.set(identityKey, {
          namaBarang,
          spesifikasi,
          kuantitas: String(barang.jumlah),
          unit,
          hargaSatuan: hargaSatuanMap.get(identityKey) || salesOrderHargaSatuan,
          noPoManual: noPoValue,
          sources: [source],
        });
      });
    });

    if (hasSelectedSuratJalan || selectedNoPoOption.barang.length === 0) {
      return;
    }

    selectedNoPoOption.barang.forEach((barang) => {
      const namaBarang = toText(barang.nama).trim();
      const spesifikasi = toText(barang.spesifikasi).trim();
      const unit = toText(barang.unit).trim();
      const noPoValue = selectedNoPoOption.noPo;
      const identityKey = createInvoiceBarangIdentityKey(namaBarang, spesifikasi, unit, noPoValue);

      if (!namaBarang || !unit) {
        return;
      }

      const existingItem = barangMap.get(identityKey);

      if (existingItem) {
        const currentQty = parseNumber(existingItem.kuantitas);
        existingItem.kuantitas = String(currentQty + barang.jumlah);
        return;
      }

      barangMap.set(identityKey, {
        namaBarang,
        spesifikasi,
        kuantitas: String(barang.jumlah),
        unit,
        hargaSatuan:
          hargaSatuanMap.get(identityKey) ||
          findSalesOrderHargaSatuan(noPoValue, namaBarang, spesifikasi, unit),
        noPoManual: noPoValue,
        sources: [],
      });
    });
  });

  const rows = Array.from(barangMap.values());

  if (rows.length === 0) {
    return ensureTrailingEmptyInvoiceBarangRow([createEmptyInvoiceBarangRow()]);
  }

  return ensureTrailingEmptyInvoiceBarangRow(rows);
}

export function invoiceBarangRowsToList(rows: InvoiceBarangFormRow[]): InvoiceBarang[] {
  return rows
    .map((row) => {
      const namaBarang = row.namaBarang.trim();
      const spesifikasi = row.spesifikasi.trim();
      const kuantitas = parseNumber(row.kuantitas.trim());
      const hargaSatuan = parseNumber(row.hargaSatuan.trim());
      const unit = row.unit.trim();
      const jumlah = roundCurrency(kuantitas * hargaSatuan);
      const sources = normalizeInvoiceBarangSources(row.sources);
      const noPoManual = sources.length > 0 ? invoiceBarangSourceNoPoList(sources).join(", ") : row.noPoManual.trim();

      return {
        namaBarang: namaBarang,
        spesifikasi: spesifikasi,
        kuantitas: kuantitas,
        unit: unit,
        hargaSatuan: hargaSatuan,
        jumlah: jumlah,
        noPoManual,
        sources,
      };
    })
    .filter((item) => item.namaBarang && item.unit);
}

export function calculateInvoiceSummary(barang: InvoiceBarang[], isPpn: boolean, ppnRate: number) {
  const subtotal = roundCurrency(barang.reduce((acc, item) => acc + item.jumlah, 0));
  const ppnAmount = isPpn ? roundCurrency(subtotal * (ppnRate / 100)) : 0;
  const grandTotal = roundCurrency(subtotal + ppnAmount);

  return {
    subtotal: subtotal,
    ppnAmount: ppnAmount,
    grandTotal: grandTotal,
  };
}

export function toInvoiceFormState(item: InvoiceItem): InvoiceFormState {
  return {
    tanggal: toInputDate(item.tanggal),
    noInvoice: item.noInvoice,
    noPo: invoiceNoPoListLabel(item.noPoList),
    noPoList: item.noPoList,
    noSuratJalanText: invoiceNoSuratJalanListToText(item.noSuratJalan),
    idCustomer: item.idCustomer,
    isPpn: item.isPpn,
    isPaid: item.isPaid,
    tanggalBayar: item.isPaid ? toInputDate(item.tanggalBayar) : "",
    ppnRate: String(item.ppnRate),
    barangRows: ensureTrailingEmptyInvoiceBarangRow(
      item.barang.map((barang) => ({
        namaBarang: barang.namaBarang,
        spesifikasi: barang.spesifikasi,
        kuantitas: String(barang.kuantitas),
        unit: barang.unit,
        hargaSatuan: String(barang.hargaSatuan),
        noPoManual: barang.noPoManual,
        sources: barang.sources,
      }))
    ),
  };
}

export function toInvoiceFormStateFromPrefill(prefill: InvoicePrefillPayload): InvoiceFormState {
  const normalizedPpnRate = Number.isFinite(prefill.ppnRate) ? prefill.ppnRate : 11;
  const noPoList = normalizeNoPoList(
    prefill.noPoList && prefill.noPoList.length > 0 ? prefill.noPoList : prefill.noPo
  );
  const barangRows = ensureTrailingEmptyInvoiceBarangRow(
    prefill.barang.map((item) => ({
      namaBarang: item.namaBarang,
      spesifikasi: item.spesifikasi,
      kuantitas: String(item.kuantitas),
      unit: item.unit,
      hargaSatuan: item.hargaSatuan && item.hargaSatuan > 0 ? String(item.hargaSatuan) : "",
      noPoManual: item.noPoManual || invoiceBarangSourceNoPoList(item.sources || []).join(", ") || (noPoList.length === 1 ? noPoList[0] : ""),
      sources: item.sources || [],
    }))
  );

  return {
    tanggal: toInputDate(prefill.tanggal),
    noInvoice: "",
    noPo: invoiceNoPoListLabel(noPoList),
    noPoList,
    noSuratJalanText: invoiceNoSuratJalanListToText(prefill.noSuratJalan),
    idCustomer: prefill.idCustomer,
    isPpn: typeof prefill.isPpn === "boolean" ? prefill.isPpn : true,
    isPaid: false,
    tanggalBayar: "",
    ppnRate: String(normalizedPpnRate),
    barangRows,
  };
}

export function saveInvoicePrefill(payload: InvoicePrefillPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(invoicePrefillStorageKey, JSON.stringify(payload));
}

export function consumeInvoicePrefill() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(invoicePrefillStorageKey);

  if (!rawValue) {
    return null;
  }

  window.sessionStorage.removeItem(invoicePrefillStorageKey);

  try {
    const parsedValue = JSON.parse(rawValue);
    return toInvoicePrefillPayload(parsedValue);
  } catch {
    return null;
  }
}

export function filterInvoiceRows(
  rows: InvoiceItem[],
  filter: InvoiceFilter,
  resolveCustomerLabel?: ResolveCustomerLabel
) {
  const fromDate = parseAppDateRangeStart(filter.tanggalDari);
  const toDate = parseAppDateRangeEnd(filter.tanggalSampai);
  const paymentFromDate = parseAppDateRangeStart(filter.tanggalBayarDari);
  const paymentToDate = parseAppDateRangeEnd(filter.tanggalBayarSampai);

  return rows.filter((row) => {
    const matchNoInvoice = normalize(row.noInvoice).includes(normalize(filter.noInvoice));
    const matchNoPO = normalize(invoiceNoPoListLabel(row.noPoList)).includes(normalize(filter.noPo));
    const matchNoSuratJalan = normalize(invoiceNoSuratJalanListLabel(row.noSuratJalan)).includes(
      normalize(filter.noSuratJalan)
    );
    const namaBarangFilter = normalize(filter.namaBarang);
    const matchNamaBarang =
      !namaBarangFilter ||
      row.barang.some((barang) => normalize(barang.namaBarang).includes(namaBarangFilter));
    const customerLabel = resolveCustomerLabel ? resolveCustomerLabel(row.idCustomer) : row.idCustomer;
    const matchIdCustomer = normalize(customerLabel).includes(normalize(filter.idCustomer));

    const matchPpn =
      !filter.isPpn ||
      (filter.isPpn === "true" && row.isPpn) ||
      (filter.isPpn === "false" && !row.isPpn);
    const matchPaid =
      !filter.isPaid ||
      (filter.isPaid === "true" && row.isPaid) ||
      (filter.isPaid === "false" && !row.isPaid);

    const rowDate = parseAppDate(row.tanggal);
    const matchFromDate = !fromDate || Boolean(rowDate && rowDate >= fromDate);
    const matchToDate = !toDate || Boolean(rowDate && rowDate <= toDate);
    const rowPaymentDate = parseAppDate(row.tanggalBayar);
    const matchPaymentFromDate = !paymentFromDate || Boolean(rowPaymentDate && rowPaymentDate >= paymentFromDate);
    const matchPaymentToDate = !paymentToDate || Boolean(rowPaymentDate && rowPaymentDate <= paymentToDate);

    return (
      matchNoInvoice &&
      matchNoPO &&
      matchNoSuratJalan &&
      matchNamaBarang &&
      matchIdCustomer &&
      matchPpn &&
      matchPaid &&
      matchFromDate &&
      matchToDate &&
      matchPaymentFromDate &&
      matchPaymentToDate
    );
  });
}
