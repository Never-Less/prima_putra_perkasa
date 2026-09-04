"use client";

import {
  ArrowRight,
  BarChart3,
  Building2,
  Factory,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  Truck,
  UserCog,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useIsAdminAccess } from "./_hooks/use-current-user";
import { useI18n } from "./_i18n/provider";
import {
  fetchReadyInvoicePoGroups,
  type ReadyInvoicePoGroup,
} from "./_lib/surat-jalan-invoice-status";

export default function HomePage() {
  const { t } = useI18n();
  const isAdminAccess = useIsAdminAccess();
  const [readyInvoicePoGroups, setReadyInvoicePoGroups] = useState<
    ReadyInvoicePoGroup[]
  >([]);

  useEffect(() => {
    let isCancelled = false;

    async function loadReadyInvoiceRows() {
      try {
        const groups = await fetchReadyInvoicePoGroups();

        if (!isCancelled) {
          setReadyInvoicePoGroups(groups);
        }
      } catch {
        if (!isCancelled) {
          setReadyInvoicePoGroups([]);
        }
      }
    }

    void loadReadyInvoiceRows();

    return () => {
      isCancelled = true;
    };
  }, []);

  const readyInvoicePoPreview = useMemo(() => {
    return readyInvoicePoGroups
      .slice(0, 3)
      .map((group) => group.noPo)
      .filter(Boolean)
      .join(", ");
  }, [readyInvoicePoGroups]);
  const readyInvoiceSuratJalanCount = useMemo(() => {
    return readyInvoicePoGroups.reduce(
      (total, group) => total + group.suratJalanRows.length,
      0,
    );
  }, [readyInvoicePoGroups]);

  const routes = [
    ...(isAdminAccess
      ? [
          {
            href: "/user",
            title: t("home.route.user.title"),
            description: t("home.route.user.description"),
            cta: t("home.route.user.cta"),
            icon: UserCog,
          },
          {
            href: "/laporanKeuangan",
            title: t("home.route.laporanKeuangan.title"),
            description: t("home.route.laporanKeuangan.description"),
            cta: t("home.route.laporanKeuangan.cta"),
            icon: BarChart3,
          },
        ]
      : []),
    {
      href: "/pembayaranAllCustomer",
      title: t("home.route.pembayaranAllCustomer.title"),
      description: t("home.route.pembayaranAllCustomer.description"),
      cta: t("home.route.pembayaranAllCustomer.cta"),
      icon: WalletCards,
    },
    {
      href: "/rekapTagihanPembayaranPabrik",
      title: t("home.route.rekapTagihanPembayaranPabrik.title"),
      description: t("home.route.rekapTagihanPembayaranPabrik.description"),
      cta: t("home.route.rekapTagihanPembayaranPabrik.cta"),
      icon: Factory,
    },
    {
      href: "/customer",
      title: t("home.route.customer.title"),
      description: t("home.route.customer.description"),
      cta: t("home.route.customer.cta"),
      icon: UsersRound,
    },
    {
      href: "/supplier",
      title: t("home.route.supplier.title"),
      description: t("home.route.supplier.description"),
      cta: t("home.route.supplier.cta"),
      icon: Building2,
    },
    {
      href: "/suratJalan",
      title: t("home.route.suratJalan.title"),
      description: t("home.route.suratJalan.description"),
      cta: t("home.route.suratJalan.cta"),
      icon: Truck,
    },
    {
      href: "/invoice",
      title: t("home.route.invoice.title"),
      description: t("home.route.invoice.description"),
      cta: t("home.route.invoice.cta"),
      icon: ReceiptText,
    },
    {
      href: "/salesOrder",
      title: t("home.route.purchaseOrder.title"),
      description: t("home.route.purchaseOrder.description"),
      cta: t("home.route.purchaseOrder.cta"),
      icon: ShoppingCart,
    },
    {
      href: "/priceList",
      title: t("home.route.priceList.title"),
      description: t("home.route.priceList.description"),
      cta: t("home.route.priceList.cta"),
      icon: PackageSearch,
    },
    {
      href: "/pembelian",
      title: t("home.route.pembelian.title"),
      description: t("home.route.pembelian.description"),
      cta: t("home.route.pembelian.cta"),
      icon: PackageSearch,
    },
  ];

  return (
    <main className="erp-page mx-auto min-h-screen max-w-[96rem]">
      <header>
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{t("brand.name")}</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50 sm:text-2xl">{t("home.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t("home.description")}</p>
      </header>

      <section className="erp-panel mt-5 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{t("nav.sidebar.subtitle")}</h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {routes.map((route) => {
            const Icon = route.icon;

            return (
              <Link
                key={route.href}
                href={route.href}
                className="group grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-blue-950/50 dark:group-hover:text-blue-300">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{route.title}</span>
                  <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{route.description}</span>
                </span>
                <span className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <span className="hidden sm:inline">{route.cta}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {readyInvoicePoGroups.length > 0 ? (
        <section className="mt-5 rounded-lg border border-amber-200 border-l-4 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                {t("home.invoiceReminder.title", {
                  count: readyInvoicePoGroups.length,
                })}
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                {t("home.invoiceReminder.description", {
                  count: readyInvoiceSuratJalanCount,
                  items: readyInvoicePoPreview || "-",
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/invoice"
                className="erp-button border-amber-700 bg-amber-700 text-white hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
              >
                {t("home.invoiceReminder.invoiceCta")}
              </Link>
              <Link
                href="/suratJalan"
                className="erp-button border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/50"
              >
                {t("home.invoiceReminder.suratJalanCta")}
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
