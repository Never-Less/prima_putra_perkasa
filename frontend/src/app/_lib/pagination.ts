export type PaginationResult<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  from: number;
  to: number;
};

export type PaginationQueryState = {
  page: number;
  limit: number;
};

export type ServerPaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type ServerListResult<T> = {
  items: T[];
  pagination: ServerPaginationMeta;
  totalRows: number;
};

type RawPaginationParams = {
  page?: string | number | null;
  limit?: string | number | null;
};

type RawReturnPaginationParams = {
  returnPage?: string | number | null;
  returnLimit?: string | number | null;
};

type SearchParamsReader = {
  get(name: string): string | null;
};

export function normalizeStringFilterQueryState<TFilter extends Record<string, string>>(
  searchParams: SearchParamsReader,
  defaults: TFilter
): TFilter {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, String(searchParams.get(key) || "").trim()])
  ) as TFilter;
}

function normalizePositiveInteger(value: string | number | null | undefined, fallback: number) {
  const parsedValue = Number(value);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return Math.floor(parsedValue);
  }

  return fallback;
}

export function normalizePaginationQueryState(
  params: RawPaginationParams | null | undefined,
  fallback: PaginationQueryState
): PaginationQueryState {
  return {
    page: normalizePositiveInteger(params?.page, fallback.page),
    limit: normalizePositiveInteger(params?.limit, fallback.limit),
  };
}

export function normalizeReturnPaginationQueryState(
  params: RawReturnPaginationParams | null | undefined,
  fallback: PaginationQueryState
): PaginationQueryState {
  return normalizePaginationQueryState(
    {
      page: params?.returnPage,
      limit: params?.returnLimit,
    },
    fallback
  );
}

export function buildListRouteWithPagination(
  basePath: string,
  pagination: PaginationQueryState,
  listState: Record<string, string | number | undefined | null> = {}
) {
  const queryString = buildListQueryString({
    ...listState,
    page: pagination.page,
    limit: pagination.limit,
  });

  return `${basePath}${queryString}`;
}

export function buildFormRouteWithReturnPagination(
  basePath: string,
  id: string | undefined | null,
  pagination: PaginationQueryState,
  listState: Record<string, string | number | undefined | null> = {}
) {
  const queryString = buildListQueryString({
    ...listState,
    id,
    returnPage: pagination.page,
    returnLimit: pagination.limit,
  });

  return `${basePath}${queryString}`;
}

export function normalizeServerPaginationMeta(
  value: unknown,
  fallback: PaginationQueryState
): ServerPaginationMeta {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const page = Number(source.page);
  const limit = Number(source.limit);
  const totalItems = Number(source.totalItems);
  const totalPages = Number(source.totalPages);

  return {
    page: Number.isFinite(page) && page > 0 ? page : fallback.page,
    limit: Number.isFinite(limit) && limit > 0 ? limit : fallback.limit,
    totalItems: Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : 0,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
}

export function buildListQueryString(params: Record<string, string | number | undefined | null>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const text = String(value).trim();

    if (!text) {
      return;
    }

    searchParams.set(key, text);
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function paginateItems<T>(
  items: T[],
  currentPage: number,
  pageSize: number
): PaginationResult<T> {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize) || 1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const safePage = Math.min(Math.max(1, Math.floor(currentPage) || 1), totalPages);

  if (totalItems === 0) {
    return {
      items: [],
      currentPage: safePage,
      totalPages,
      totalItems,
      pageSize: normalizedPageSize,
      from: 0,
      to: 0,
    };
  }

  const startIndex = (safePage - 1) * normalizedPageSize;
  const endIndex = Math.min(startIndex + normalizedPageSize, totalItems);

  return {
    items: items.slice(startIndex, endIndex),
    currentPage: safePage,
    totalPages,
    totalItems,
    pageSize: normalizedPageSize,
    from: startIndex + 1,
    to: endIndex,
  };
}
