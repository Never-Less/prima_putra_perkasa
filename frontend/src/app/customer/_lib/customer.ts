import { requestApi } from "../../_lib/api-client";

export type CustomerItem = {
  id: string;
  nama: string;
  alamat: string;
  npwp: string;
  atasNama: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFilter = {
  nama: string;
  alamat: string;
  npwp: string;
  atasNama: string;
};

export type CustomerFormState = {
  nama: string;
  alamat: string;
  npwp: string;
  atasNama: string;
};

export const defaultCustomerFilter: CustomerFilter = {
  nama: "",
  alamat: "",
  npwp: "",
  atasNama: "",
};

type CustomerListResponse = {
  customers?: unknown[];
};

type CustomerResponse = {
  customer?: unknown;
};

type AuthMeResponse = {
  user?: unknown;
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
    npwp: toText(row.npwp).trim(),
    atasNama: toText(row.atasNama).trim(),
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

function toNormalizedCustomerPayload(form: CustomerFormState) {
  return {
    nama: toText(form.nama).trim(),
    alamat: toText(form.alamat).trim(),
    npwp: toText(form.npwp).trim(),
    atasNama: toText(form.atasNama).trim(),
  };
}

export async function fetchCustomerRows() {
  const response = await requestApi<CustomerListResponse>("/api/customers");

  if (!response || !Array.isArray(response.customers)) {
    return [];
  }

  return response.customers.map(toCustomerItem).filter((row): row is CustomerItem => Boolean(row));
}

export async function fetchCustomerById(id: string) {
  const customerId = toText(id).trim();

  if (!customerId) {
    return null;
  }

  const response = await requestApi<CustomerResponse>(`/api/customers/${customerId}`);
  return toCustomerItem(response?.customer);
}

export async function createCustomer(form: CustomerFormState) {
  const payload = toNormalizedCustomerPayload(form);
  const response = await requestApi<CustomerResponse>("/api/customers", {
    method: "POST",
    body: payload,
  });

  return toCustomerItem(response?.customer);
}

export async function updateCustomer(id: string, form: CustomerFormState) {
  const payload = toNormalizedCustomerPayload(form);
  const response = await requestApi<CustomerResponse>(`/api/customers/${id}`, {
    method: "PUT",
    body: payload,
  });

  return toCustomerItem(response?.customer);
}

export async function deleteCustomer(id: string) {
  await requestApi(`/api/customers/${id}`, {
    method: "DELETE",
  });
}

export async function fetchCurrentUserRole() {
  const response = await requestApi<AuthMeResponse>("/api/auth/me");

  if (!response || typeof response !== "object") {
    return "";
  }

  const user = response.user as Record<string, unknown> | undefined;
  return toText(user?.role).trim().toLowerCase();
}

function normalize(value: unknown) {
  return toText(value).trim().toLowerCase();
}

export function filterCustomerRows(rows: CustomerItem[], filter: CustomerFilter) {
  return rows.filter((row) => {
    const matchNama = normalize(row.nama).includes(normalize(filter.nama));
    const matchAlamat = normalize(row.alamat).includes(normalize(filter.alamat));
    const matchNpwp = normalize(row.npwp).includes(normalize(filter.npwp));
    const matchAtasNama = normalize(row.atasNama).includes(normalize(filter.atasNama));

    return matchNama && matchAlamat && matchNpwp && matchAtasNama;
  });
}

export function toCustomerFormState(item: CustomerItem): CustomerFormState {
  return {
    nama: item.nama,
    alamat: item.alamat,
    npwp: item.npwp,
    atasNama: item.atasNama,
  };
}
