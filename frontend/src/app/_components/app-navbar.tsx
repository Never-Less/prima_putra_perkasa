"use client";

import {
  BarChart3,
  Building2,
  CircleDollarSign,
  Factory,
  Home,
  Languages,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  Truck,
  UserCog,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useIsAdminAccess } from "../_hooks/use-current-user";
import { requestUnsavedChangesConfirmation } from "../_hooks/use-unsaved-changes-warning";
import { useI18n } from "../_i18n/provider";
import { type Locale } from "../_i18n/messages";
import { requestApi } from "../_lib/api-client";
import { clearAuthSession, getStoredRefreshToken } from "../_lib/auth-session";
import { ThemeToggle } from "./theme-toggle";
import { ReleaseNotesNotificationCenter } from "./release-notes-notification-center";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationGroups({
  groups,
  pathname,
  onNavigate,
  ariaLabel,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  ariaLabel: string;
}) {
  return (
    <nav className="flex flex-col gap-5" aria-label={ariaLabel}>
      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`nav-group-${group.label.replaceAll(" ", "-")}`}>
          <h2
            id={`nav-group-${group.label.replaceAll(" ", "-")}`}
            className="mb-1.5 px-3 text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500"
          >
            {group.label}
          </h2>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/55 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  {isActive ? <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-blue-600" /> : null}
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const isAdminAccess = useIsAdminAccess();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navGroups = useMemo<NavGroup[]>(
    () => [
      {
        label: t("nav.group.overview"),
        items: [
          { href: "/", label: t("nav.home"), icon: Home },
          { href: "/dashboardPenjualan", label: t("nav.salesDashboard"), icon: BarChart3 },
          { href: "/salesOrderDashboard", label: t("nav.salesOrderDashboard"), icon: LayoutDashboard },
        ],
      },
      {
        label: t("nav.group.sales"),
        items: [
          { href: "/salesOrder", label: t("nav.purchaseOrder"), icon: ShoppingCart },
          { href: "/priceList", label: t("nav.priceList"), icon: PackageSearch },
          { href: "/suratJalan", label: t("nav.suratJalan"), icon: Truck },
          { href: "/invoice", label: t("nav.invoice"), icon: ReceiptText },
        ],
      },
      {
        label: t("nav.group.purchasing"),
        items: [
          { href: "/pembelian", label: t("nav.pembelian"), icon: PackageSearch },
          {
            href: "/rekapTagihanPembayaranPabrik",
            label: t("nav.rekapTagihanPembayaranPabrik"),
            icon: Factory,
          },
        ],
      },
      {
        label: t("nav.group.finance"),
        items: [
          ...(isAdminAccess
            ? [{ href: "/dashboardFinance", label: t("nav.financeDashboard"), icon: Landmark }]
            : []),
          { href: "/kasBank", label: t("nav.cashLedger"), icon: WalletCards },
          { href: "/pembayaranAllCustomer", label: t("nav.pembayaranAllCustomer"), icon: WalletCards },
          { href: "/tagihanBelumDibayar", label: t("nav.tagihanBelumDibayar"), icon: CircleDollarSign },
          ...(isAdminAccess
            ? [{ href: "/laporanKeuangan", label: t("nav.laporanKeuangan"), icon: BarChart3 }]
            : []),
        ],
      },
      {
        label: t("nav.group.master"),
        items: [
          { href: "/customer", label: t("nav.customer"), icon: UsersRound },
          { href: "/supplier", label: t("nav.supplier"), icon: Building2 },
          ...(isAdminAccess ? [{ href: "/user", label: t("nav.user"), icon: UserCog }] : []),
        ],
      },
    ],
    [isAdminAccess, t]
  );

  const activeNavItem = useMemo(
    () => navGroups.flatMap((group) => group.items).find((item) => isActivePath(pathname, item.href)),
    [navGroups, pathname]
  );

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

    if (!(await requestUnsavedChangesConfirmation(t("common.unsavedChangesWarning")))) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const refreshToken = getStoredRefreshToken();

      if (refreshToken) {
        await requestApi("/api/auth/logout", {
          method: "POST",
          body: { refreshToken },
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

  const navigationFooter = (
    <div className="space-y-2">
      <ThemeToggle fullWidth={true} />
      <label className="relative block">
        <span className="sr-only">{t("nav.language")}</span>
        <Languages
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          aria-label={t("nav.language")}
          className="erp-field w-full appearance-none pl-9"
        >
          <option value="id">{t("nav.language.id")}</option>
          <option value="en">{t("nav.language.en")}</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        className="erp-button erp-button-danger w-full justify-start"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
        <span>{isLoggingOut ? t("common.loading") : t("nav.logout")}</span>
      </button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:hidden">
        <div className="min-w-0">
          <Link href="/" className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
            {t("brand.name")}
          </Link>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {activeNavItem?.label || t("nav.sidebar.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <ReleaseNotesNotificationCenter />
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-expanded={isMobileMenuOpen}
          aria-label={t("nav.menu")}
          title={t("nav.menu")}
          className="erp-icon-button"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/45 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(19rem,calc(100vw-1.5rem))] flex-col border-r border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                  <Building2 aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <Link href="/" className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                    {t("brand.name")}
                  </Link>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{t("nav.sidebar.subtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={t("common.close")}
                title={t("common.close")}
                className="erp-icon-button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavigationGroups
                groups={navGroups}
                pathname={pathname}
                onNavigate={() => setIsMobileMenuOpen(false)}
                ariaLabel={t("nav.mobileLabel")}
              />
            </div>
            <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">{navigationFooter}</div>
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
            <Building2 aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <Link href="/" className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
              {t("brand.name")}
            </Link>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{t("nav.sidebar.subtitle")}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavigationGroups groups={navGroups} pathname={pathname} ariaLabel={t("nav.desktopLabel")} />
        </div>
        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-800">{navigationFooter}</div>
      </aside>
      <div className="fixed right-5 top-4 z-50 hidden lg:block"><ReleaseNotesNotificationCenter /></div>
    </>
  );
}
