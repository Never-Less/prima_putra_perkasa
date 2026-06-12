import {
  clearAuthSession,
  getStoredAccessToken,
  isAccessTokenExpired,
  redirectToLogin,
  refreshAuthSession,
} from "./auth-session";

export class ApiRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

type ApiRequestOptions = Omit<RequestInit, "headers" | "body"> & {
  accessToken?: string;
  body?: unknown;
  headers?: HeadersInit;
  invalidateCachePaths?: string | string[];
};

type ApiCacheEntry = {
  expiresAt: number;
  payload?: unknown;
  promise?: Promise<unknown>;
};

const defaultGetCacheTtlMs = 60 * 1000;
const apiGetCache = new Map<string, ApiCacheEntry>();
let apiGetCacheVersion = 0;

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
  return normalizeBaseUrl(configured);
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function parseResponseBody(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = payload.message;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return `API request failed (${status})`;
}

function shouldSkipRefresh(path: string) {
  return (
    path.includes("/api/auth/login") ||
    path.includes("/api/auth/refresh") ||
    path.includes("/api/auth/register")
  );
}

function getRequestMethod(options: ApiRequestOptions) {
  return String(options.method || "GET").trim().toUpperCase();
}

function shouldUseClientGetCache(
  path: string,
  options: ApiRequestOptions,
  method: string
) {
  if (typeof window === "undefined") {
    return false;
  }

  if (method !== "GET" || options.body !== undefined || shouldSkipRefresh(path)) {
    return false;
  }

  return options.cache !== "no-store" && options.cache !== "reload";
}

function buildCacheKey(path: string, token: string) {
  return `${token}::${buildUrl(path)}`;
}

function normalizeCachePaths(paths?: string | string[]) {
  if (!paths) {
    return [];
  }

  return (Array.isArray(paths) ? paths : [paths])
    .map((path) => path.trim())
    .filter(Boolean);
}

function getCachedUrlFromKey(key: string) {
  const separatorIndex = key.indexOf("::");

  return separatorIndex >= 0 ? key.slice(separatorIndex + 2) : key;
}

function isCacheUrlMatch(cachedUrl: string, targetUrl: string) {
  return (
    cachedUrl === targetUrl ||
    cachedUrl.startsWith(`${targetUrl}?`) ||
    cachedUrl.startsWith(`${targetUrl}/`)
  );
}

export function invalidateApiGetCache(paths?: string | string[]) {
  apiGetCacheVersion += 1;

  const targetPaths = normalizeCachePaths(paths);

  if (targetPaths.length === 0) {
    apiGetCache.clear();
    return;
  }

  const targetUrls = targetPaths.map(buildUrl);

  Array.from(apiGetCache.keys()).forEach((key) => {
    const cachedUrl = getCachedUrlFromKey(key);

    if (targetUrls.some((targetUrl) => isCacheUrlMatch(cachedUrl, targetUrl))) {
      apiGetCache.delete(key);
    }
  });
}

function readApiGetCache<TResponse>(key: string) {
  const entry = apiGetCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    apiGetCache.delete(key);
    return null;
  }

  if (entry.promise) {
    return entry.promise as Promise<TResponse>;
  }

  return Promise.resolve(entry.payload as TResponse);
}

async function sendRequest(
  path: string,
  options: ApiRequestOptions,
  token: string
) {
  const { accessToken, body, headers, invalidateCachePaths, method, ...restOptions } = options;
  void accessToken;
  void invalidateCachePaths;
  const requestHeaders = new Headers(headers);

  requestHeaders.set("Accept", "application/json");

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...restOptions,
    method: method || "GET",
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  const responsePayload = parseResponseBody(responseText);

  return {
    response,
    responsePayload,
  };
}

export async function requestApi<TResponse>(path: string, options: ApiRequestOptions = {}) {
  const skipRefresh = shouldSkipRefresh(path);
  const hasExplicitAccessToken = typeof options.accessToken === "string";
  const method = getRequestMethod(options);
  let token = options.accessToken || getStoredAccessToken();

  if (!skipRefresh && !hasExplicitAccessToken && token && isAccessTokenExpired(token)) {
    const refreshedToken = await refreshAuthSession();

    if (refreshedToken) {
      token = refreshedToken;
    } else {
      clearAuthSession();
      redirectToLogin();
      throw new ApiRequestError("Session expired", 401, null);
    }
  }

  const shouldUseCache = shouldUseClientGetCache(path, options, method);
  const cacheKey = shouldUseCache ? buildCacheKey(path, token) : "";
  const cacheVersion = apiGetCacheVersion;
  const cachedResponse = cacheKey ? readApiGetCache<TResponse>(cacheKey) : null;

  if (cachedResponse) {
    return cachedResponse;
  }

  const requestPromise = (async () => {
    let { response, responsePayload } = await sendRequest(path, options, token);

    if (
      response.status === 401 &&
      !skipRefresh &&
      !hasExplicitAccessToken &&
      token
    ) {
      const refreshedToken = await refreshAuthSession();

      if (refreshedToken) {
        const retryResult = await sendRequest(path, options, refreshedToken);
        response = retryResult.response;
        responsePayload = retryResult.responsePayload;
      } else {
        clearAuthSession();
        redirectToLogin();
      }
    }

    if (!response.ok) {
      throw new ApiRequestError(
        getErrorMessage(response.status, responsePayload),
        response.status,
        responsePayload
      );
    }

    if (method !== "GET") {
      invalidateApiGetCache(options.invalidateCachePaths);
    }

    if (cacheKey && cacheVersion === apiGetCacheVersion) {
      apiGetCache.set(cacheKey, {
        expiresAt: Date.now() + defaultGetCacheTtlMs,
        payload: responsePayload,
      });
    }

    return responsePayload as TResponse;
  })();

  if (cacheKey) {
    apiGetCache.set(cacheKey, {
      expiresAt: Date.now() + defaultGetCacheTtlMs,
      promise: requestPromise,
    });

    requestPromise.catch(() => {
      const entry = apiGetCache.get(cacheKey);

      if (entry?.promise === requestPromise) {
        apiGetCache.delete(cacheKey);
      }
    });
  }

  return requestPromise;
}
