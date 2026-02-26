"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError, requestApi } from "../_lib/api-client";
import { useI18n } from "../_i18n/provider";
import {
  getStoredAccessToken,
  isAccessTokenExpired,
  refreshAuthSession,
  saveAuthSession,
} from "../_lib/auth-session";

type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function redirectIfAlreadyAuthenticated() {
      const accessToken = getStoredAccessToken();

      if (!accessToken) {
        return;
      }

      if (!isAccessTokenExpired(accessToken)) {
        if (mounted) {
          router.replace("/");
        }
        return;
      }

      const refreshedAccessToken = await refreshAuthSession();

      if (refreshedAccessToken && mounted) {
        router.replace("/");
      }
    }

    void redirectIfAlreadyAuthenticated();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setErrorMessage(t("login.error.default"));
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const payload = await requestApi<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: {
          username: normalizedUsername,
          password,
        },
      });

      if (!payload?.accessToken) {
        throw new Error("accessToken is missing");
      }

      saveAuthSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        user: payload.user,
      });
      router.replace("/");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message || t("login.error.default"));
      } else {
        setErrorMessage(t("login.error.default"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-sky-200 bg-sky-50/40 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t("login.title")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("login.description")}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm text-slate-700">
            {t("field.username")}
            <input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm text-slate-700">
            {t("field.password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? t("common.loading") : t("login.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
