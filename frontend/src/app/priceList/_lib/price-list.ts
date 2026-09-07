import { requestApi, requestApiBlob } from "../../_lib/api-client";
import { buildListQueryString, normalizeServerPaginationMeta, type ServerListResult } from "../../_lib/pagination";

export type PriceListPurchaseHistory = {
  id: string;
  sumber: string;
  tanggal: string;
  hargaBeli: number;
};

export type PriceListItem = {
  id: string;
  namaBarang: string;
  hargaJual: number;
  tanggalJual: string;
  idCustomer: string;
  namaCustomer: string;
  unit: string;
  deskripsi: string;
  images: string[];
  riwayatPembelian: PriceListPurchaseHistory[];
  createdAt: string;
  updatedAt: string;
};

export type PriceListCustomerOption = { id: string; nama: string };
export type PriceListFilter = {
  namaBarang: string;
  namaCustomer: string;
  unit: string;
  sumber: string;
  hargaJualMin: string;
  hargaJualMax: string;
};

export type PriceListFormState = {
  namaBarang: string;
  hargaJual: string;
  tanggalJual: string;
  idCustomer: string;
  namaCustomer: string;
  unit: string;
  deskripsi: string;
  riwayatPembelian: Array<{ id: string; sumber: string; tanggal: string; hargaBeli: string }>;
};

export const defaultPriceListFilter: PriceListFilter = {
  namaBarang: "",
  namaCustomer: "",
  unit: "",
  sumber: "",
  hargaJualMin: "",
  hargaJualMax: "",
};

export const defaultPriceListForm: PriceListFormState = {
  namaBarang: "",
  hargaJual: "",
  tanggalJual: "",
  idCustomer: "",
  namaCustomer: "",
  unit: "",
  deskripsi: "",
  riwayatPembelian: [],
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function dateInput(value: unknown) {
  return text(value).slice(0, 10);
}

function toItem(value: unknown): PriceListItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id || row._id).trim();
  if (!id) return null;
  return {
    id,
    namaBarang: text(row.namaBarang),
    hargaJual: Number(row.hargaJual || 0),
    tanggalJual: text(row.tanggalJual),
    idCustomer: text(row.idCustomer),
    namaCustomer: text(row.namaCustomer),
    unit: text(row.unit),
    deskripsi: text(row.deskripsi),
    images: (Array.isArray(row.images) ? row.images : []).map(text).filter(Boolean),
    riwayatPembelian: (Array.isArray(row.riwayatPembelian) ? row.riwayatPembelian : []).map((value) => {
      const detail = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        id: text(detail.id || detail._id),
        sumber: text(detail.sumber),
        tanggal: text(detail.tanggal),
        hargaBeli: Number(detail.hargaBeli || 0),
      };
    }),
    createdAt: text(row.createdAt),
    updatedAt: text(row.updatedAt),
  };
}

function payload(form: PriceListFormState) {
  return {
    ...form,
    hargaJual: Number(form.hargaJual),
    riwayatPembelian: form.riwayatPembelian
      .filter((row) => row.sumber.trim() || row.tanggal || row.hargaBeli.trim())
      .map((row) => ({ sumber: row.sumber.trim(), tanggal: row.tanggal, hargaBeli: Number(row.hargaBeli) })),
  };
}

export function toPriceListForm(item: PriceListItem): PriceListFormState {
  return {
    namaBarang: item.namaBarang,
    hargaJual: String(item.hargaJual),
    tanggalJual: dateInput(item.tanggalJual),
    idCustomer: item.idCustomer,
    namaCustomer: item.namaCustomer,
    unit: item.unit,
    deskripsi: item.deskripsi,
    riwayatPembelian: item.riwayatPembelian.map((row) => ({
      id: row.id,
      sumber: row.sumber,
      tanggal: dateInput(row.tanggal),
      hargaBeli: String(row.hargaBeli),
    })),
  };
}

export async function fetchPriceList(filter: PriceListFilter, page: number, limit: number): Promise<ServerListResult<PriceListItem>> {
  const query = buildListQueryString({ ...filter, page, limit });
  const response = await requestApi<{ priceList?: unknown[]; pagination?: unknown; summary?: { totalRows?: unknown } }>(
    `/api/price-list${query}`,
    { cache: "no-store" }
  );
  const items = (response.priceList || []).map(toItem).filter((item): item is PriceListItem => Boolean(item));
  return {
    items,
    pagination: normalizeServerPaginationMeta(response.pagination, { page, limit }),
    totalRows: Number(response.summary?.totalRows ?? items.length),
  };
}

export async function fetchPriceListOptions() {
  const response = await requestApi<{ customers?: unknown[] }>("/api/price-list/options");
  return (response.customers || []).map((value) => {
    const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return { id: text(row.id || row._id), nama: text(row.nama) };
  }).filter((row) => row.nama);
}

export async function createPriceListItem(form: PriceListFormState) {
  const response = await requestApi<{ priceListItem?: unknown }>("/api/price-list", {
    method: "POST",
    body: payload(form),
    invalidateCachePaths: "/api/price-list",
  });
  return toItem(response.priceListItem);
}

export async function createPriceListItemsBulk(forms: PriceListFormState[]) {
  return requestApi<{ insertedCount?: number }>("/api/price-list/bulk", {
    method: "POST",
    body: { items: forms.map(payload) },
    invalidateCachePaths: "/api/price-list",
  });
}

export async function updatePriceListItem(id: string, form: PriceListFormState) {
  const response = await requestApi<{ priceListItem?: unknown }>(`/api/price-list/${id}`, {
    method: "PUT",
    body: payload(form),
    invalidateCachePaths: "/api/price-list",
  });
  return toItem(response.priceListItem);
}

export async function deletePriceListItem(id: string) {
  await requestApi(`/api/price-list/${id}`, {
    method: "DELETE",
    invalidateCachePaths: "/api/price-list",
  });
}

export async function uploadPriceListImages(id: string, files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append("images", file));
  const response = await requestApi<{ priceListItem?: unknown }>(`/api/price-list/${id}/images`, {
    method: "POST",
    body,
    invalidateCachePaths: "/api/price-list",
  });
  return toItem(response.priceListItem);
}

export async function deletePriceListImage(id: string, filename: string) {
  const response = await requestApi<{ priceListItem?: unknown }>(
    `/api/price-list/${id}/images/${encodeURIComponent(filename)}`,
    { method: "DELETE", invalidateCachePaths: "/api/price-list" }
  );
  return toItem(response.priceListItem);
}

export function fetchPriceListImage(filename: string) {
  return requestApiBlob(`/api/price-list/images/${encodeURIComponent(filename)}`);
}
