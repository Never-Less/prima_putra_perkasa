import { requestApi } from "../../_lib/api-client";

export type CustomerItem = {
  id: string;
  nama: string;
  alamat: string;
  atasNama: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFilter = {
  nama: string;
  alamat: string;
  atasNama: string;
};

export type CustomerFormState = {
  nama: string;
  alamat: string;
  atasNama: string;
};

export const defaultCustomerFilter: CustomerFilter = {
  nama: "",
  alamat: "",
  atasNama: "",
};

type CustomerListResponse = {
  customers?: unknown[];
};

export const customerNameOptions: string[] = [];

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function toCustomerItem(value: unknown): CustomerItem | null {
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
    nama: toText(row.nama).trim(),
    alamat: toText(row.alamat).trim(),
    atasNama: toText(row.atasNama).trim(),
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

export async function fetchCustomerRows() {
  const response = await requestApi<CustomerListResponse>("/api/customers");

  if (!response || !Array.isArray(response.customers)) {
    return [];
  }

  return response.customers.map(toCustomerItem).filter((row): row is CustomerItem => Boolean(row));
}

function normalize(value: unknown) {
  return toText(value).trim().toLowerCase();
}

export function filterCustomerRows(rows: CustomerItem[], filter: CustomerFilter) {
  return rows.filter((row) => {
    const matchNama = normalize(row.nama).includes(normalize(filter.nama));
    const matchAlamat = normalize(row.alamat).includes(normalize(filter.alamat));
    const matchAtasNama = normalize(row.atasNama).includes(normalize(filter.atasNama));

    return matchNama && matchAlamat && matchAtasNama;
  });
}

export function toCustomerFormState(item: CustomerItem): CustomerFormState {
  return {
    nama: item.nama,
    alamat: item.alamat,
    atasNama: item.atasNama,
  };
}
