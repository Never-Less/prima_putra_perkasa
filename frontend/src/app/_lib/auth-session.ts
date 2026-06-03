type AuthSessionPayload = {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
};

type RefreshResponsePayload = {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
};

type StoredAuthUser = {
  id?: unknown;
  role?: unknown;
};

const accessTokenStorageKeys = ["accessToken", "access_token"];
const refreshTokenStorageKeys = ["refreshToken", "refresh_token"];
const authUserStorageKey = "authUser";
const exportAllowedRoles = ["admin", "staff"];
const authSessionEventName = "ppp-auth-session-change";

let refreshRequestPromise: Promise<string | null> | null = null;

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
  return normalizeBaseUrl(configured);
}

function buildApiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function readFirstStorageValue(keys: string[]) {
  if (typeof window === "undefined") {
    return "";
  }

  for (const key of keys) {
    const value = window.localStorage.getItem(key);

    if (value) {
      return value.trim();
    }
  }

  return "";
}

function writeStorageValue(keys: string[], value: string) {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of keys) {
    window.localStorage.setItem(key, value);
  }
}

function removeStorageValues(keys: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of keys) {
    window.localStorage.removeItem(key);
  }
}

function parseResponseBody(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function notifyAuthSessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(authSessionEventName));
}

function normalizeRole(value: unknown) {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

function isLoginPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function decodeJwtPayload(token: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payloadBase64 + "=".repeat((4 - (payloadBase64.length % 4)) % 4);
    const decodedPayload = window.atob(paddedPayload);

    return JSON.parse(decodedPayload) as { exp?: number };
  } catch {
    return null;
  }
}

async function performRefreshRequest() {
  const currentRefreshToken = getStoredRefreshToken();

  if (!currentRefreshToken) {
    clearAuthSession();
    return null;
  }

  try {
    const response = await fetch(buildApiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: currentRefreshToken,
      }),
    });

    const responseText = await response.text();
    const payload = parseResponseBody(responseText) as RefreshResponsePayload | null;

    if (!response.ok) {
      clearAuthSession();
      return null;
    }

    const nextAccessToken = String(payload?.accessToken || "").trim();
    const nextRefreshToken = String(payload?.refreshToken || "").trim();

    if (!nextAccessToken || !nextRefreshToken) {
      clearAuthSession();
      return null;
    }

    saveAuthSession({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      user: payload?.user,
    });

    return nextAccessToken;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getStoredAccessToken() {
  return readFirstStorageValue(accessTokenStorageKeys);
}

export function getStoredRefreshToken() {
  return readFirstStorageValue(refreshTokenStorageKeys);
}

export function saveAuthSession(payload: AuthSessionPayload) {
  const accessToken = String(payload.accessToken || "").trim();
  const refreshToken = String(payload.refreshToken || "").trim();

  if (!accessToken || !refreshToken || typeof window === "undefined") {
    return;
  }

  writeStorageValue(accessTokenStorageKeys, accessToken);
  writeStorageValue(refreshTokenStorageKeys, refreshToken);

  if (payload.user !== undefined) {
    window.localStorage.setItem(authUserStorageKey, JSON.stringify(payload.user));
  }

  notifyAuthSessionChange();
}

export function clearAuthSession() {
  removeStorageValues(accessTokenStorageKeys);
  removeStorageValues(refreshTokenStorageKeys);

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(authUserStorageKey);
  }

  notifyAuthSessionChange();
}

export function getStoredAuthUser(): StoredAuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(authUserStorageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const payload = JSON.parse(rawValue) as StoredAuthUser | null;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getStoredUserRole() {
  return normalizeRole(getStoredAuthUser()?.role);
}

export function getStoredUserId() {
  const user = getStoredAuthUser();

  if (!user) {
    return "";
  }

  if (typeof user.id === "string") {
    return user.id.trim();
  }

  if (user.id === null || user.id === undefined) {
    return "";
  }

  return String(user.id).trim();
}

export function canRoleExport(role: unknown) {
  return exportAllowedRoles.includes(normalizeRole(role));
}

export function canCurrentUserExport() {
  return canRoleExport(getStoredUserRole());
}

export function isCurrentUserAdmin() {
  return getStoredUserRole() === "admin";
}

export function subscribeAuthSession(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      accessTokenStorageKeys.includes(event.key) ||
      refreshTokenStorageKeys.includes(event.key) ||
      event.key === authUserStorageKey
    ) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(authSessionEventName, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(authSessionEventName, callback);
  };
}

export function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (isLoginPath(window.location.pathname)) {
    return;
  }

  window.location.replace("/login");
}

export function isAccessTokenExpired(token: string, skewSeconds = 30) {
  const payload = decodeJwtPayload(token);
  const expUnix = payload?.exp;

  if (!expUnix) {
    return true;
  }

  const nowUnix = Date.now() / 1000;
  return expUnix <= nowUnix + skewSeconds;
}

export async function refreshAuthSession() {
  if (!refreshRequestPromise) {
    refreshRequestPromise = performRefreshRequest().finally(() => {
      refreshRequestPromise = null;
    });
  }

  return refreshRequestPromise;
}
