import { requestApi } from "../../_lib/api-client";
import { formatAppDate, parseAppDate, parseAppDateRangeEnd, parseAppDateRangeStart, toInputDateValue } from "../../_lib/date";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

export type InvoiceBarang = {
  namaBarang: string;
  spesifikasi: string;
  kuantitas: number;
  unit: string;
  hargaSatuan: number;
  jumlah: number;
};

type Locale = "id" | "en";

export type InvoiceItem = {
  id: string;
  tanggal: string;
  noInvoice: string;
  noPo: string;
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
};

export type InvoiceFormState = {
  tanggal: string;
  noInvoice: string;
  noPo: string;
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
};

export type InvoicePrefillPayload = {
  tanggal: string;
  noPo: string;
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
  nama: string;
  spesifikasi: string;
  jumlah: number;
  unit: string;
};

export type InvoiceSuratJalanRowOption = {
  noSuratJalan: string;
  barang: InvoiceSuratJalanBarangOption[];
};

export type InvoiceSuratJalanOption = {
  noPo: string;
  idCustomer: string;
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
  idCustomer: "",
  isPpn: "",
  isPaid: "",
  tanggalBayarDari: "",
  tanggalBayarSampai: "",
  tanggalDari: "",
  tanggalSampai: "",
};

const invoicePrefillStorageKey = "ppp_invoice_prefill";

export const sampleInvoiceRows: InvoiceItem[] = [
  {
    id: "inv-260301",
    tanggal: "2026-03-01",
    noInvoice: "INV-260301",
    noPo: "PO-90011",
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
      },
      {
        namaBarang: "Pasir Halus",
        spesifikasi: "",
        kuantitas: 40,
        unit: "m3",
        hargaSatuan: 300000,
        jumlah: 12000000,
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
    noPo: "PO-90012",
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
    noPo: "PO-90013",
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
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  const singleValue = String(value || "").trim();

  return singleValue ? [singleValue] : [];
}

function toInvoiceSuratJalanBarangOption(value: unknown): InvoiceSuratJalanBarangOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const nama = toText(item.nama).trim();
  const spesifikasi = toText(item.spesifikasi).trim();
  const jumlah = parseNumberFromUnknown(item.jumlah);
  const unit = toText(item.unit).trim();

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

function toInvoiceSuratJalanRowOption(value: unknown): InvoiceSuratJalanRowOption | null {
  if (typeof value === "string") {
    const noSuratJalan = value.trim();

    if (!noSuratJalan) {
      return null;
    }

    return {
      noSuratJalan,
      barang: [],
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
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

  if (!noPo || noSuratJalan.length === 0) {
    return null;
  }

  return {
    noPo,
    idCustomer,
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

  return {
    id: id,
    tanggal: toText(row.tanggal).trim(),
    noInvoice: toText(row.noInvoice).trim(),
    noPo: toText(row.noPo).trim(),
    noSuratJalan: normalizeNoSuratJalanList(row.noSuratJalan),
    idCustomer: parseCustomerId(row.idCustomer),
    barang: barang,
    isPpn: Boolean(row.isPpn),
    isPaid: Boolean(row.isPaid),
    tanggalBayar: toText(row.tanggalBayar).trim() || null,
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

  if (!namaBarang || kuantitas <= 0) {
    return null;
  }

  return {
    namaBarang,
    spesifikasi,
    kuantitas,
    unit,
  };
}

function toInvoicePrefillPayload(value: unknown): InvoicePrefillPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const noPo = toText(payload.noPo).trim();
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

  if (!noPo || noSuratJalan.length === 0 || barang.length === 0) {
    return null;
  }

  return {
    tanggal,
    noPo,
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
  const ppnRateValue = parseNumber(form.ppnRate || "0");

  return {
    tanggal: toText(form.tanggal).trim(),
    noInvoice: toText(form.noInvoice).trim(),
    noPo: toText(form.noPo).trim(),
    noSuratJalan: noSuratJalan,
    idCustomer: toText(form.idCustomer).trim(),
    barang: barang,
    isPpn: form.isPpn,
    isPaid: form.isPaid,
    tanggalBayar: toText(form.tanggalBayar).trim() || null,
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
  });

  return toInvoiceItem(response?.invoice);
}

export async function updateInvoice(id: string, form: InvoiceFormState) {
  const payload = toNormalizedInvoicePayload(form);
  const response = await requestApi<InvoiceResponse>(`/api/invoices/${id}`, {
    method: "PUT",
    body: payload,
  });

  return toInvoiceItem(response?.invoice);
}

export async function deleteInvoice(id: string) {
  await requestApi(`/api/invoices/${id}`, {
    method: "DELETE",
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
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function invoiceNoSuratJalanListLabel(noSuratJalan: string[]) {
  const normalized = normalizeNoSuratJalanList(noSuratJalan);

  if (normalized.length === 0) {
    return "-";
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
  };
}

export function isInvoiceBarangRowFilled(row: InvoiceBarangFormRow) {
  return Boolean(
    row.namaBarang.trim() ||
      row.spesifikasi.trim() ||
      row.kuantitas.trim() ||
      row.unit.trim() ||
      row.hargaSatuan.trim()
  );
}

export function ensureTrailingEmptyInvoiceBarangRow(rows: InvoiceBarangFormRow[]) {
  const normalizedRows = rows.map((row) => ({
    namaBarang: String(row.namaBarang || ""),
    spesifikasi: String(row.spesifikasi || ""),
    kuantitas: String(row.kuantitas || ""),
    unit: String(row.unit || ""),
    hargaSatuan: String(row.hargaSatuan || ""),
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

function createInvoiceBarangIdentityKey(namaBarang: string, spesifikasi: string, unit: string) {
  return `${normalizeInvoiceBarangIdentityPart(namaBarang)}::${normalizeInvoiceBarangIdentityPart(
    spesifikasi
  )}::${normalizeInvoiceBarangIdentityPart(unit)}`;
}

export function buildInvoiceBarangRowsFromSuratJalanSelection(
  suratJalanOptions: InvoiceSuratJalanOption[],
  noPo: string,
  selectedNoSuratJalan: string[],
  currentRows: InvoiceBarangFormRow[] = []
) {
  const normalizedNoPo = toText(noPo).trim();
  const selectedSet = new Set(normalizeNoSuratJalanList(selectedNoSuratJalan));

  if (!normalizedNoPo || selectedSet.size === 0) {
    return ensureTrailingEmptyInvoiceBarangRow([createEmptyInvoiceBarangRow()]);
  }

  const selectedNoPoOption = suratJalanOptions.find((option) => option.noPo === normalizedNoPo);

  if (!selectedNoPoOption) {
    return ensureTrailingEmptyInvoiceBarangRow([createEmptyInvoiceBarangRow()]);
  }

  const hargaSatuanMap = new Map<string, string>();

  currentRows.forEach((row) => {
    const namaBarang = toText(row.namaBarang).trim();
    const spesifikasi = toText(row.spesifikasi).trim();
    const unit = toText(row.unit).trim();

    if (!namaBarang || !unit) {
      return;
    }

    const identityKey = createInvoiceBarangIdentityKey(namaBarang, spesifikasi, unit);

    if (!hargaSatuanMap.has(identityKey)) {
      hargaSatuanMap.set(identityKey, toText(row.hargaSatuan).trim());
    }
  });

  const barangMap = new Map<string, InvoiceBarangFormRow>();

  selectedNoPoOption.noSuratJalan.forEach((suratJalan) => {
    if (!selectedSet.has(suratJalan.noSuratJalan)) {
      return;
    }

    suratJalan.barang.forEach((barang) => {
      const namaBarang = toText(barang.nama).trim();
      const spesifikasi = toText(barang.spesifikasi).trim();
      const unit = toText(barang.unit).trim();
      const identityKey = createInvoiceBarangIdentityKey(namaBarang, spesifikasi, unit);
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
        hargaSatuan: hargaSatuanMap.get(identityKey) || "",
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

      return {
        namaBarang: namaBarang,
        spesifikasi: spesifikasi,
        kuantitas: kuantitas,
        unit: unit,
        hargaSatuan: hargaSatuan,
        jumlah: jumlah,
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
    noPo: item.noPo,
    noSuratJalanText: invoiceNoSuratJalanListToText(item.noSuratJalan),
    idCustomer: item.idCustomer,
    isPpn: item.isPpn,
    isPaid: item.isPaid,
    tanggalBayar: toInputDate(item.tanggalBayar),
    ppnRate: String(item.ppnRate),
    barangRows: ensureTrailingEmptyInvoiceBarangRow(
      item.barang.map((barang) => ({
        namaBarang: barang.namaBarang,
        spesifikasi: barang.spesifikasi,
        kuantitas: String(barang.kuantitas),
        unit: barang.unit,
        hargaSatuan: String(barang.hargaSatuan),
      }))
    ),
  };
}

export function toInvoiceFormStateFromPrefill(prefill: InvoicePrefillPayload): InvoiceFormState {
  const normalizedPpnRate = Number.isFinite(prefill.ppnRate) ? prefill.ppnRate : 11;
  const barangRows = ensureTrailingEmptyInvoiceBarangRow(
    prefill.barang.map((item) => ({
      namaBarang: item.namaBarang,
      spesifikasi: item.spesifikasi,
      kuantitas: String(item.kuantitas),
      unit: item.unit,
      hargaSatuan: "",
    }))
  );

  return {
    tanggal: toInputDate(prefill.tanggal),
    noInvoice: "",
    noPo: prefill.noPo,
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
    const matchNoPO = normalize(row.noPo).includes(normalize(filter.noPo));
    const matchNoSuratJalan = normalize(invoiceNoSuratJalanListLabel(row.noSuratJalan)).includes(
      normalize(filter.noSuratJalan)
    );
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
