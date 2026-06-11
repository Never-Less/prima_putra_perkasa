import { requestApi } from "../../_lib/api-client";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

export type SupplierItem = {
  id: string;
  namaSupplier: string;
  hutang: boolean;
  lamaHutang: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SupplierFilter = {
  namaSupplier: string;
  hutang: "" | "true" | "false";
  lamaHutangMin: string;
  lamaHutangMax: string;
};

export type SupplierFormState = {
  namaSupplier: string;
  hutang: boolean;
  lamaHutang: string;
};

export type SupplierListQuery = SupplierFilter & PaginationQueryState;

type SupplierListResponse = {
  suppliers?: unknown[];
  pagination?: unknown;
  summary?: {
    totalRows?: unknown;
  };
};

type SupplierResponse = {
  supplier?: unknown;
};

export const defaultSupplierFilter: SupplierFilter = {
  namaSupplier: "",
  hutang: "",
  lamaHutangMin: "",
  lamaHutangMax: "",
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

function toNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return toNumber(value);
}

function toSupplierItem(value: unknown): SupplierItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();

  if (!id) {
    return null;
  }

  const hutang = Boolean(row.hutang);

  return {
    id,
    namaSupplier: toText(row.namaSupplier).trim(),
    hutang,
    lamaHutang: hutang ? toNullableNumber(row.lamaHutang) : null,
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

function toNormalizedSupplierPayload(form: SupplierFormState) {
  const hutang = Boolean(form.hutang);
  const lamaHutang = Number(form.lamaHutang || 0);

  return {
    namaSupplier: toText(form.namaSupplier).trim(),
    hutang,
    lamaHutang: hutang && Number.isFinite(lamaHutang) ? lamaHutang : null,
  };
}

export async function fetchSupplierRows() {
  const response = await requestApi<SupplierListResponse>("/api/suppliers");

  if (!response || !Array.isArray(response.suppliers)) {
    return [];
  }

  return response.suppliers
    .map(toSupplierItem)
    .filter((row): row is SupplierItem => Boolean(row));
}

export async function fetchSupplierList(
  query: SupplierListQuery
): Promise<ServerListResult<SupplierItem>> {
  const requestPath = `/api/suppliers${buildListQueryString({
    namaSupplier: query.namaSupplier,
    hutang: query.hutang,
    lamaHutangMin: query.lamaHutangMin,
    lamaHutangMax: query.lamaHutangMax,
    page: query.page,
    limit: query.limit,
  })}`;
  const response = await requestApi<SupplierListResponse>(requestPath);
  const items = Array.isArray(response?.suppliers)
    ? response.suppliers
        .map(toSupplierItem)
        .filter((row): row is SupplierItem => Boolean(row))
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

export async function fetchSupplierById(id: string) {
  const supplierId = toText(id).trim();

  if (!supplierId) {
    return null;
  }

  const response = await requestApi<SupplierResponse>(`/api/suppliers/${supplierId}`);
  return toSupplierItem(response?.supplier);
}

export async function createSupplier(form: SupplierFormState) {
  const payload = toNormalizedSupplierPayload(form);
  const response = await requestApi<SupplierResponse>("/api/suppliers", {
    method: "POST",
    body: payload,
  });

  return toSupplierItem(response?.supplier);
}

export async function updateSupplier(id: string, form: SupplierFormState) {
  const payload = toNormalizedSupplierPayload(form);
  const response = await requestApi<SupplierResponse>(`/api/suppliers/${id}`, {
    method: "PUT",
    body: payload,
  });

  return toSupplierItem(response?.supplier);
}

export async function deleteSupplier(id: string) {
  await requestApi(`/api/suppliers/${id}`, {
    method: "DELETE",
  });
}

export function toSupplierFormState(item: SupplierItem): SupplierFormState {
  return {
    namaSupplier: item.namaSupplier,
    hutang: item.hutang,
    lamaHutang: item.hutang && item.lamaHutang ? String(item.lamaHutang) : "",
  };
}
