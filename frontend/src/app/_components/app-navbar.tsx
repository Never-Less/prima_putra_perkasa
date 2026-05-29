"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useIsAdminAccess } from "../_hooks/use-current-user";
import { useI18n } from "../_i18n/provider";
import { type Locale } from "../_i18n/messages";
import { requestApi } from "../_lib/api-client";
import { clearAuthSession, getStoredRefreshToken } from "../_lib/auth-session";
import { ThemeToggle } from "./theme-toggle";

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
  const isAdminAccess = useIsAdminAccess();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = useMemo(
    () =>
      [
        { href: "/", label: t("nav.home") },
        isAdminAccess ? { href: "/user", label: t("nav.user") } : null,
        { href: "/customer", label: t("nav.customer") },
        { href: "/purchaseOrder", label: t("nav.purchaseOrder") },
        { href: "/suratJalan", label: t("nav.suratJalan") },
        { href: "/invoice", label: t("nav.invoice") },
        { href: "/pembelian", label: t("nav.pembelian") },
        { href: "/supplier", label: t("nav.supplier") },
        isAdminAccess ? { href: "/pembayaranAllCustomer", label: t("nav.pembayaranAllCustomer") } : null,
        isAdminAccess ? { href: "/laporanKeuangan", label: t("nav.laporanKeuangan") } : null,
      ].filter((item): item is { href: string; label: string } => Boolean(item)),
    [isAdminAccess, t]
  );
  const activeNavItem = useMemo(() => {
    return navItems.find((item) => isActivePath(pathname, item.href));
  }, [navItems, pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

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
      setIsMobileMenuOpen(false);
      clearAuthSession();
      router.replace("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/90 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/90 lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <Link href="/" className="block truncate text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
              {t("brand.name")}
            </Link>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {activeNavItem?.label || t("nav.sidebar.subtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-expanded={isMobileMenuOpen}
            aria-label={t("nav.menu")}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-800 shadow-sm transition hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
            <span>{t("nav.menu")}</span>
          </button>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] bg-slate-900/45 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col border-r border-sky-100 bg-sky-50/95 p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-4 dark:border-slate-800">
              <div className="min-w-0">
                <Link href="/" className="block truncate text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
                  {t("brand.name")}
                </Link>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("nav.sidebar.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={t("common.close")}
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-800 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {t("common.close")}
              </button>
            </div>

            <nav className="mt-4 flex flex-1 flex-col gap-2" aria-label="Mobile navigation drawer">
              {navItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-sky-500 text-white shadow-sm dark:bg-sky-500 dark:text-slate-950"
                        : "border border-sky-100 bg-white text-slate-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-sky-100 pt-4 dark:border-slate-800">
              <ThemeToggle fullWidth={true} />
              <label className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("nav.language")}
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as Locale)}
                  className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="id">{t("nav.language.id")}</option>
                  <option value="en">{t("nav.language.en")}</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="mt-3 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                {isLoggingOut ? t("common.loading") : t("nav.logout")}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sky-100/80 lg:bg-white/90 lg:backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/90">
        <div className="border-b border-sky-100 px-5 py-4 dark:border-slate-800">
          <Link href="/" className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
            {t("brand.name")}
          </Link>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("nav.sidebar.subtitle")}</p>
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
                    ? "bg-sky-500 text-white dark:bg-sky-500 dark:text-slate-950"
                    : "border border-sky-100 bg-white text-slate-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sky-100 px-4 py-4 dark:border-slate-800">
          <ThemeToggle fullWidth={true} />
          <label className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
            {t("nav.language")}
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="mt-1 w-full rounded-md border border-sky-200 bg-white px-2 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="id">{t("nav.language.id")}</option>
              <option value="en">{t("nav.language.en")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="mt-3 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            {isLoggingOut ? t("common.loading") : t("nav.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
