"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiRequestError, requestApi } from "../_lib/api-client";
import { useI18n } from "../_i18n/provider";
import { ThemeToggle } from "../_components/theme-toggle";
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
    <main className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6">
      <section className="ppp-form-view w-full max-w-md border p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("login.title")}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("login.description")}</p>
          </div>
          <ThemeToggle />
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            {t("field.username")}
            <input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="block text-sm text-slate-700 dark:text-slate-200">
            {t("field.password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
          >
            {isLoading ? t("common.loading") : t("login.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
