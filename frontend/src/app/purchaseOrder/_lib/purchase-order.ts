import { requestApi } from "../../_lib/api-client";
import { formatAppDate, toInputDateValue } from "../../_lib/date";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

type Locale = "id" | "en";

export type PurchaseOrderItem = {
  id: string;
  noPo: string;
  tanggalPo: string;
  namaCustomer: string;
  nominalPo: number;
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

function parseNumberFromUnknown(value: unknown, fallback = 0) {
  const parsed = Number(value);

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
    nama: toText(row.nama).trim() || id,
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

function toNormalizedPurchaseOrderPayload(form: PurchaseOrderFormState) {
  const tanggalInvoice = toText(form.tanggalInvoice).trim();
  const noInvoice = toText(form.noInvoice).trim();

  return {
    noPo: toText(form.noPo).trim(),
    tanggalPo: toText(form.tanggalPo).trim(),
    namaCustomer: toText(form.namaCustomer).trim(),
    nominalPo: parseNumberFromUnknown(form.nominalPo),
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
  });

  return toPurchaseOrderItem(response?.purchaseOrder);
}

export async function updatePurchaseOrder(id: string, form: PurchaseOrderFormState) {
  const response = await requestApi<PurchaseOrderResponse>(`/api/purchase-orders/${id}`, {
    method: "PUT",
    body: toNormalizedPurchaseOrderPayload(form),
  });

  return toPurchaseOrderItem(response?.purchaseOrder);
}

export async function deletePurchaseOrder(id: string) {
  await requestApi(`/api/purchase-orders/${id}`, {
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

export function toInputDate(value: string | null) {
  return toInputDateValue(value);
}

export function toPurchaseOrderFormState(item: PurchaseOrderItem): PurchaseOrderFormState {
  return {
    noPo: item.noPo,
    tanggalPo: toInputDate(item.tanggalPo),
    namaCustomer: item.namaCustomer,
    nominalPo: String(item.nominalPo),
    tanggalInvoice: toInputDate(item.tanggalInvoice),
    noInvoice: item.noInvoice,
  };
}
