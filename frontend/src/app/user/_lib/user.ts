import { requestApi } from "../../_lib/api-client";
import {
  buildListQueryString,
  normalizeServerPaginationMeta,
  type PaginationQueryState,
  type ServerListResult,
} from "../../_lib/pagination";

export type UserRole = "admin" | "staff";

export type UserItem = {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type UserFilter = {
  username: string;
  role: "" | UserRole;
};

export type UserFormState = {
  username: string;
  password: string;
  role: UserRole;
};

export type UserListQuery = UserFilter & PaginationQueryState;

type UserListResponse = {
  users?: unknown[];
  pagination?: unknown;
  summary?: {
    totalRows?: unknown;
  };
};

type UserResponse = {
  user?: unknown;
};

export const userRoleOptions: UserRole[] = ["admin", "staff"];

export const defaultUserFilter: UserFilter = {
  username: "",
  role: "",
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

function normalizeRole(value: unknown): UserRole {
  const normalized = toText(value).trim().toLowerCase();

  return normalized === "admin" ? "admin" : "staff";
}

function toUserItem(value: unknown): UserItem | null {
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
    username: toText(row.username).trim(),
    role: normalizeRole(row.role),
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

function toNormalizedUserPayload(form: UserFormState) {
  const password = toText(form.password);

  return {
    username: toText(form.username).trim(),
    password: password.trim() ? password : undefined,
    role: normalizeRole(form.role),
  };
}

export async function fetchUserList(query: UserListQuery): Promise<ServerListResult<UserItem>> {
  const requestPath = `/api/users${buildListQueryString({
    username: query.username,
    role: query.role,
    page: query.page,
    limit: query.limit,
  })}`;
  const response = await requestApi<UserListResponse>(requestPath);
  const items = Array.isArray(response?.users)
    ? response.users.map(toUserItem).filter((item): item is UserItem => Boolean(item))
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

export async function fetchUserById(id: string) {
  const userId = toText(id).trim();

  if (!userId) {
    return null;
  }

  const response = await requestApi<UserResponse>(`/api/users/${userId}`);
  return toUserItem(response?.user);
}

export async function createUser(form: UserFormState) {
  const response = await requestApi<UserResponse>("/api/users", {
    method: "POST",
    body: toNormalizedUserPayload(form),
    invalidateCachePaths: "/api/users",
  });

  return toUserItem(response?.user);
}

export async function updateUser(id: string, form: UserFormState) {
  const response = await requestApi<UserResponse>(`/api/users/${id}`, {
    method: "PUT",
    body: toNormalizedUserPayload(form),
    invalidateCachePaths: "/api/users",
  });

  return toUserItem(response?.user);
}

export async function deleteUser(id: string) {
  await requestApi(`/api/users/${id}`, {
    method: "DELETE",
    invalidateCachePaths: "/api/users",
  });
}

export function toUserFormState(item: UserItem): UserFormState {
  return {
    username: item.username,
    password: "",
    role: item.role,
  };
}
