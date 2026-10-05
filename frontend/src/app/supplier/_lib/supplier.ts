import { type SupplierOnboarding } from "./supplier-onboarding";
import { supplierRequestBody, splitSupplierTags, type SupplierDocument } from "./supplier-documents";
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
  alamat: string;
  npwp: string;
  picName: string;
  phone: string;
  whatsapp: string;
  email: string;
  productCategories: string[];
  productBrands: string[];
  onboarding: SupplierOnboarding;
  notes: string;
  documentLinks: Array<{ label: string; url: string }>;
  documents: SupplierDocument[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierFilter = {
  namaSupplier: string;
  hutang: "" | "true" | "false";
  lamaHutangMin: string;
  lamaHutangMax: string;
  onboardingStatus: string;
};

export type SupplierFormState = {
  namaSupplier: string;
  hutang: boolean;
  lamaHutang: string;
  alamat: string;
  npwp: string;
  picName: string;
  phone: string;
  whatsapp: string;
  email: string;
  productCategories: string;
  productBrands: string;
  notes: string;
  documentLinksText: string;
  documentLinks?: Array<{ label: string; url: string }>;
  documentFiles?: File[];
  isActive: boolean;
};

export type SupplierListQuery = SupplierFilter & PaginationQueryState & { sort?: string };

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
  onboardingStatus: "",
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
    alamat: toText(row.alamat).trim(), npwp: toText(row.npwp).trim(),
    picName: toText(row.picName).trim(), phone: toText(row.phone).trim(), email: toText(row.email).trim(),
    productCategories: Array.isArray(row.productCategories) ? row.productCategories.map(toText).filter(Boolean) : [],
    whatsapp: toText(row.whatsapp).trim(),
    productBrands: Array.isArray(row.productBrands) ? row.productBrands.map(toText).filter(Boolean) : [],
    onboarding: row.onboarding && typeof row.onboarding === "object" ? row.onboarding as SupplierOnboarding : { status: "notGenerated" },
    notes: toText(row.notes).trim(),
    documents: Array.isArray(row.documents) ? row.documents as SupplierDocument[] : [],
    documentLinks: Array.isArray(row.documentLinks) ? row.documentLinks.map((item) => { const link = item as Record<string, unknown>; return { label: toText(link.label), url: toText(link.url) }; }).filter((item) => item.label && item.url) : [],
    isActive: row.isActive !== false,
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
    alamat: form.alamat.trim(), npwp: form.npwp.trim(), picName: form.picName.trim(),
    whatsapp: form.whatsapp.trim(),
    productBrands: splitSupplierTags(form.productBrands),
    phone: form.phone.trim(), email: form.email.trim(), notes: form.notes.trim(), isActive: form.isActive,
    productCategories: splitSupplierTags(form.productCategories),
    documentLinks: form.documentLinks?.map((link) => ({ label: link.label.trim(), url: link.url.trim() })) ?? form.documentLinksText.split("\n").map((line) => { const separator = line.indexOf("|"); return separator < 0 ? null : { label: line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() }; }).filter((row): row is { label: string; url: string } => Boolean(row?.label && /^https?:\/\//i.test(row.url))),
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
    onboardingStatus: query.onboardingStatus,
    sort: query.sort,
    namaSupplier: query.namaSupplier,
    hutang: query.hutang,
    lamaHutangMin: query.lamaHutangMin,
    lamaHutangMax: query.lamaHutangMax,
    page: query.page,
    limit: query.limit,
  })}`;
  const response = await requestApi<SupplierListResponse>(requestPath, { cache: "no-store" });
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

  const response = await requestApi<SupplierResponse>(`/api/suppliers/${supplierId}`, { cache: "no-store" });
  return toSupplierItem(response?.supplier);
}

export async function createSupplier(form: SupplierFormState) {
  const payload = toNormalizedSupplierPayload(form);
  const response = await requestApi<SupplierResponse>("/api/suppliers", {
    method: "POST",
    body: supplierRequestBody(payload, form.documentFiles),
    invalidateCachePaths: "/api/suppliers",
  });

  return toSupplierItem(response?.supplier);
}

export async function updateSupplier(id: string, form: SupplierFormState) {
  const payload = toNormalizedSupplierPayload(form);
  const response = await requestApi<SupplierResponse>(`/api/suppliers/${id}`, {
    method: "PUT",
    body: supplierRequestBody(payload, form.documentFiles),
    invalidateCachePaths: "/api/suppliers",
  });

  return toSupplierItem(response?.supplier);
}

export async function deleteSupplier(id: string) {
  await requestApi(`/api/suppliers/${id}`, {
    method: "DELETE",
    invalidateCachePaths: "/api/suppliers",
  });
}

export function toSupplierFormState(item: SupplierItem): SupplierFormState {
  return {
    namaSupplier: item.namaSupplier,
    hutang: item.hutang,
    lamaHutang: item.hutang && item.lamaHutang ? String(item.lamaHutang) : "",
    alamat: item.alamat, npwp: item.npwp, picName: item.picName, phone: item.phone,
    whatsapp: item.whatsapp, productBrands: item.productBrands.length ? `${item.productBrands.join(",")},` : "",
    email: item.email, productCategories: item.productCategories.length ? `${item.productCategories.join(",")},` : "", notes: item.notes,
    documentLinksText: item.documentLinks.map((row) => `${row.label}|${row.url}`).join("\n"),
    documentLinks: item.documentLinks,
    documentFiles: [],
    isActive: item.isActive,
  };
}
