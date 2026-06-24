import { requestApi } from "../../_lib/api-client";
import { formatAppDate, toInputDateValue } from "../../_lib/date";
import { decodeHtmlEntities } from "../../_lib/html-entities";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

type Locale = "id" | "en";

export type PurchaseOrderBarang = {
  namaBarang: string;
  spesifikasi: string;
  kuantitas: number;
  unit: string;
  hargaSatuan: number;
  jumlah: number;
};

export type PurchaseOrderBarangFormRow = {
  namaBarang: string;
  spesifikasi: string;
  kuantitas: string;
  unit: string;
  hargaSatuan: string;
};

export type PurchaseOrderItem = {
  id: string;
  noPo: string;
  tanggalPo: string;
  namaCustomer: string;
  nominalPo: number;
  barang: PurchaseOrderBarang[];
  tanggalInvoice: string | null;
  noInvoice: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderCustomerOption = {
  id: string;
  nama: string;
};

export type PurchaseOrderInvoiceOption = {
  id: string;
  noInvoice: string;
};

export type PurchaseOrderFilter = {
  noPo: string;
  namaCustomer: string;
  noInvoice: string;
  tanggalPoDari: string;
  tanggalPoSampai: string;
  tanggalInvoiceDari: string;
  tanggalInvoiceSampai: string;
  nominalPoMin: string;
  nominalPoMax: string;
};

export type PurchaseOrderFormState = {
  noPo: string;
  tanggalPo: string;
  namaCustomer: string;
  nominalPo: string;
  barangRows: PurchaseOrderBarangFormRow[];
  tanggalInvoice: string;
  noInvoice: string;
};

export type PurchaseOrderListQuery = PurchaseOrderFilter & PaginationQueryState;

type PurchaseOrderListResponse = {
  purchaseOrders?: unknown[];
  pagination?: unknown;
  summary?: {
    totalRows?: unknown;
  };
};

type PurchaseOrderResponse = {
  purchaseOrder?: unknown;
};

type PurchaseOrderOptionsResponse = {
  customerOptions?: unknown[];
  invoiceOptions?: unknown[];
};

const purchaseOrderMutationCachePaths = [
  "/api/purchase-orders",
  "/api/surat-jalan",
  "/api/invoices",
];

function buildPurchaseOrderListQueryString(
  query: Partial<PurchaseOrderListQuery>,
  options: { includePagination?: boolean } = {}
) {
  const { includePagination = true } = options;

  return buildListQueryString({
    noPo: query.noPo,
    namaCustomer: query.namaCustomer,
    noInvoice: query.noInvoice,
    tanggalPoDari: query.tanggalPoDari,
    tanggalPoSampai: query.tanggalPoSampai,
    tanggalInvoiceDari: query.tanggalInvoiceDari,
    tanggalInvoiceSampai: query.tanggalInvoiceSampai,
    nominalPoMin: query.nominalPoMin,
    nominalPoMax: query.nominalPoMax,
    page: includePagination ? query.page : undefined,
    limit: includePagination ? query.limit : undefined,
  });
}

export const defaultPurchaseOrderFilter: PurchaseOrderFilter = {
  noPo: "",
  namaCustomer: "",
  noInvoice: "",
  tanggalPoDari: "",
  tanggalPoSampai: "",
  tanggalInvoiceDari: "",
  tanggalInvoiceSampai: "",
  nominalPoMin: "",
  nominalPoMax: "",
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

function toDecodedText(value: unknown) {
  return decodeHtmlEntities(toText(value));
}

function normalizeNumericText(value: string) {
  const text = value.replace(/rp\.?/gi, "").replace(/\s+/g, "").trim();

  if (!text) {
    return "";
  }

  const idThousandsPattern = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;
  const enThousandsPattern = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;
  const decimalCommaPattern = /^-?\d+,\d+$/;

  if (idThousandsPattern.test(text)) {
    return text.replace(/\./g, "").replace(",", ".");
  }

  if (enThousandsPattern.test(text)) {
    return text.replace(/,/g, "");
  }

  if (decimalCommaPattern.test(text)) {
    return text.replace(",", ".");
  }

  return text.replace(/[^\d.-]/g, "");
}

function parseNumberFromUnknown(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "string" ? Number(normalizeNumericText(value)) : Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function parseReferenceId(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return toText(row.id || row._id).trim();
  }

  return toText(value).trim();
}

function toPurchaseOrderItem(value: unknown): PurchaseOrderItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();

  if (!id) {
    return null;
  }

  return {
    id,
    noPo: toText(row.noPo).trim(),
    tanggalPo: toText(row.tanggalPo).trim(),
    namaCustomer: parseReferenceId(row.namaCustomer),
    nominalPo: parseNumberFromUnknown(row.nominalPo),
    barang: Array.isArray(row.barang)
      ? row.barang
          .map(toPurchaseOrderBarang)
          .filter((item): item is PurchaseOrderBarang => Boolean(item))
      : [],
    tanggalInvoice: toText(row.tanggalInvoice || row.tanggalKirim).trim() || null,
    noInvoice: parseReferenceId(row.noInvoice),
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

function toPurchaseOrderCustomerOption(value: unknown): PurchaseOrderCustomerOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();

  if (!id) {
    return null;
  }

  return {
    id,
    nama: toDecodedText(row.nama).trim() || id,
  };
}

function toPurchaseOrderInvoiceOption(value: unknown): PurchaseOrderInvoiceOption | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();

  if (!id) {
    return null;
  }

  return {
    id,
    noInvoice: toText(row.noInvoice).trim() || id,
  };
}

function toPurchaseOrderBarang(value: unknown): PurchaseOrderBarang | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const namaBarang = toDecodedText(row.namaBarang).trim();
  const spesifikasi = toDecodedText(row.spesifikasi).trim();
  const kuantitas = parseNumberFromUnknown(row.kuantitas);
  const unit = toDecodedText(row.unit).trim();
  const hargaSatuan = parseNumberFromUnknown(row.hargaSatuan);
  const jumlah = parseNumberFromUnknown(row.jumlah, kuantitas * hargaSatuan);

  if (!namaBarang || kuantitas <= 0 || !unit || hargaSatuan < 0 || jumlah < 0) {
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

function toNormalizedPurchaseOrderPayload(form: PurchaseOrderFormState) {
  const tanggalInvoice = toText(form.tanggalInvoice).trim();
  const noInvoice = toText(form.noInvoice).trim();
  const barang = purchaseOrderBarangRowsToList(form.barangRows);
  const barangTotal = calculatePurchaseOrderBarangTotal(barang);
  const nominalPo = parseNumberFromUnknown(form.nominalPo);

  return {
    noPo: toText(form.noPo).trim(),
    tanggalPo: toText(form.tanggalPo).trim(),
    namaCustomer: toText(form.namaCustomer).trim(),
    nominalPo: barang.length > 0 ? barangTotal : nominalPo,
    barang,
    tanggalInvoice: tanggalInvoice || null,
    noInvoice: noInvoice || null,
  };
}

export async function fetchPurchaseOrderList(
  query: PurchaseOrderListQuery
): Promise<ServerListResult<PurchaseOrderItem>> {
  const requestPath = `/api/purchase-orders${buildPurchaseOrderListQueryString(query)}`;
  const response = await requestApi<PurchaseOrderListResponse>(requestPath);
  const items = Array.isArray(response?.purchaseOrders)
    ? response.purchaseOrders
        .map(toPurchaseOrderItem)
        .filter((item): item is PurchaseOrderItem => Boolean(item))
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

export async function fetchPurchaseOrderExportRows(query: PurchaseOrderFilter) {
  const requestPath = `/api/purchase-orders${buildPurchaseOrderListQueryString(query, {
    includePagination: false,
  })}`;
  const response = await requestApi<PurchaseOrderListResponse>(requestPath);

  return Array.isArray(response?.purchaseOrders)
    ? response.purchaseOrders
        .map(toPurchaseOrderItem)
        .filter((item): item is PurchaseOrderItem => Boolean(item))
    : [];
}

export async function fetchPurchaseOrderById(id: string) {
  const purchaseOrderId = toText(id).trim();

  if (!purchaseOrderId) {
    return null;
  }

  const response = await requestApi<PurchaseOrderResponse>(`/api/purchase-orders/${purchaseOrderId}`);
  return toPurchaseOrderItem(response?.purchaseOrder);
}

export async function fetchPurchaseOrderOptions() {
  const response = await requestApi<PurchaseOrderOptionsResponse>("/api/purchase-orders/options");

  return {
    customerOptions: Array.isArray(response?.customerOptions)
      ? response.customerOptions
          .map(toPurchaseOrderCustomerOption)
          .filter((item): item is PurchaseOrderCustomerOption => Boolean(item))
      : [],
    invoiceOptions: Array.isArray(response?.invoiceOptions)
      ? response.invoiceOptions
          .map(toPurchaseOrderInvoiceOption)
          .filter((item): item is PurchaseOrderInvoiceOption => Boolean(item))
      : [],
  };
}

export async function createPurchaseOrder(form: PurchaseOrderFormState) {
  const response = await requestApi<PurchaseOrderResponse>("/api/purchase-orders", {
    method: "POST",
    body: toNormalizedPurchaseOrderPayload(form),
    invalidateCachePaths: purchaseOrderMutationCachePaths,
  });

  return toPurchaseOrderItem(response?.purchaseOrder);
}

export async function updatePurchaseOrder(id: string, form: PurchaseOrderFormState) {
  const response = await requestApi<PurchaseOrderResponse>(`/api/purchase-orders/${id}`, {
    method: "PUT",
    body: toNormalizedPurchaseOrderPayload(form),
    invalidateCachePaths: purchaseOrderMutationCachePaths,
  });

  return toPurchaseOrderItem(response?.purchaseOrder);
}

export async function deletePurchaseOrder(id: string) {
  await requestApi(`/api/purchase-orders/${id}`, {
    method: "DELETE",
    invalidateCachePaths: purchaseOrderMutationCachePaths,
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

export function createEmptyPurchaseOrderBarangRow(): PurchaseOrderBarangFormRow {
  return {
    namaBarang: "",
    spesifikasi: "",
    kuantitas: "",
    unit: "",
    hargaSatuan: "",
  };
}

export function isPurchaseOrderBarangRowFilled(row: PurchaseOrderBarangFormRow) {
  return Boolean(
    row.namaBarang.trim() ||
      row.spesifikasi.trim() ||
      row.kuantitas.trim() ||
      row.unit.trim() ||
      row.hargaSatuan.trim()
  );
}

export function ensureTrailingEmptyPurchaseOrderBarangRow(
  rows: PurchaseOrderBarangFormRow[]
) {
  const normalizedRows = rows.map((row) => ({
    namaBarang: String(row.namaBarang || ""),
    spesifikasi: String(row.spesifikasi || ""),
    kuantitas: String(row.kuantitas || ""),
    unit: String(row.unit || ""),
    hargaSatuan: String(row.hargaSatuan || ""),
  }));

  if (normalizedRows.length === 0) {
    return [createEmptyPurchaseOrderBarangRow()];
  }

  while (
    normalizedRows.length > 1 &&
    !isPurchaseOrderBarangRowFilled(normalizedRows[normalizedRows.length - 1]) &&
    !isPurchaseOrderBarangRowFilled(normalizedRows[normalizedRows.length - 2])
  ) {
    normalizedRows.pop();
  }

  const lastRow = normalizedRows[normalizedRows.length - 1];

  if (isPurchaseOrderBarangRowFilled(lastRow)) {
    return [...normalizedRows, createEmptyPurchaseOrderBarangRow()];
  }

  return normalizedRows;
}

export function purchaseOrderBarangRowsToList(rows: PurchaseOrderBarangFormRow[]) {
  return rows
    .map((row) => {
      const namaBarang = toDecodedText(row.namaBarang).trim();
      const spesifikasi = toDecodedText(row.spesifikasi).trim();
      const kuantitas = parseNumberFromUnknown(row.kuantitas);
      const unit = toDecodedText(row.unit).trim();
      const hargaSatuan = parseNumberFromUnknown(row.hargaSatuan);
      const jumlah = Math.round(kuantitas * hargaSatuan);

      return {
        namaBarang,
        spesifikasi,
        kuantitas,
        unit,
        hargaSatuan,
        jumlah,
      };
    })
    .filter((item) => item.namaBarang && item.kuantitas > 0 && item.unit);
}

export function calculatePurchaseOrderBarangTotal(barang: PurchaseOrderBarang[]) {
  return barang.reduce((total, item) => total + item.jumlah, 0);
}

export function toPurchaseOrderFormState(item: PurchaseOrderItem): PurchaseOrderFormState {
  return {
    noPo: item.noPo,
    tanggalPo: toInputDate(item.tanggalPo),
    namaCustomer: item.namaCustomer,
    nominalPo: String(item.nominalPo),
    barangRows: ensureTrailingEmptyPurchaseOrderBarangRow(
      item.barang.map((barang) => ({
        namaBarang: barang.namaBarang,
        spesifikasi: barang.spesifikasi,
        kuantitas: String(barang.kuantitas),
        unit: barang.unit,
        hargaSatuan: String(barang.hargaSatuan),
      }))
    ),
    tanggalInvoice: toInputDate(item.tanggalInvoice),
    noInvoice: item.noInvoice,
  };
}
