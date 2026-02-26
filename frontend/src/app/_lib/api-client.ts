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
};

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

async function sendRequest(
  path: string,
  options: ApiRequestOptions,
  token: string
) {
  const { accessToken, body, headers, method, ...restOptions } = options;
  void accessToken;
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

  return responsePayload as TResponse;
}
