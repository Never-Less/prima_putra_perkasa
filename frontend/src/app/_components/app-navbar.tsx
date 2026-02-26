"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "../_i18n/provider";
import { type Locale } from "../_i18n/messages";
import { requestApi } from "../_lib/api-client";
import { clearAuthSession, getStoredRefreshToken } from "../_lib/auth-session";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/customer", label: t("nav.customer") },
    { href: "/suratJalan", label: t("nav.suratJalan") },
    { href: "/invoice", label: t("nav.invoice") },
    { href: "/pembelian", label: t("nav.pembelian") },
  ];

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const refreshToken = getStoredRefreshToken();

      if (refreshToken) {
        await requestApi("/api/auth/logout", {
          method: "POST",
          body: {
            refreshToken: refreshToken,
          },
        });
      }
    } catch {
      // Session cleanup tetap dijalankan walaupun revoke token gagal.
    } finally {
      clearAuthSession();
      router.replace("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-sm lg:hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/" className="mr-auto text-sm font-semibold tracking-wide text-slate-900">
            {t("brand.name")}
          </Link>

          <label className="text-xs text-slate-600">
            {t("nav.language")}
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
            >
              <option value="id">{t("nav.language.id")}</option>
              <option value="en">{t("nav.language.en")}</option>
            </select>
          </label>

          <nav className="flex flex-wrap gap-2 text-xs" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? t("common.loading") : t("nav.logout")}
          </button>
        </div>
      </header>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200/70 lg:bg-white/90 lg:backdrop-blur-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/" className="text-sm font-semibold tracking-wide text-slate-900">
            {t("brand.name")}
          </Link>
          <p className="mt-1 text-xs text-slate-500">{t("nav.sidebar.subtitle")}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-4 text-sm" aria-label="Desktop sidebar navigation">
          {navItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-4 py-4">
          <label className="text-xs font-medium text-slate-600">
            {t("nav.language")}
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            >
              <option value="id">{t("nav.language.id")}</option>
              <option value="en">{t("nav.language.en")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="mt-3 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? t("common.loading") : t("nav.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
