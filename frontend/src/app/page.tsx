"use client";

import Link from "next/link";
import { useIsAdminAccess } from "./_hooks/use-current-user";
import { ThemeToggle } from "./_components/theme-toggle";
import { useI18n } from "./_i18n/provider";

export default function HomePage() {
  const { t } = useI18n();
  const isAdminAccess = useIsAdminAccess();

  const routes = [
    ...(isAdminAccess
      ? [
          {
            href: "/user",
            title: t("home.route.user.title"),
            description: t("home.route.user.description"),
            cta: t("home.route.user.cta"),
          },
        ]
      : []),
    {
      href: "/customer",
      title: t("home.route.customer.title"),
      description: t("home.route.customer.description"),
      cta: t("home.route.customer.cta"),
    },
    {
      href: "/suratJalan",
      title: t("home.route.suratJalan.title"),
      description: t("home.route.suratJalan.description"),
      cta: t("home.route.suratJalan.cta"),
    },
    {
      href: "/invoice",
      title: t("home.route.invoice.title"),
      description: t("home.route.invoice.description"),
      cta: t("home.route.invoice.cta"),
    },
    {
      href: "/purchaseOrder",
      title: t("home.route.purchaseOrder.title"),
      description: t("home.route.purchaseOrder.description"),
      cta: t("home.route.purchaseOrder.cta"),
    },
    {
      href: "/pembelian",
      title: t("home.route.pembelian.title"),
      description: t("home.route.pembelian.description"),
      cta: t("home.route.pembelian.cta"),
    },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {t("brand.name")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">{t("home.title")}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              {t("home.description")}
            </p>
          </div>
          <ThemeToggle className="sm:self-start" />
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-5"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{route.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{route.description}</p>
            <p className="mt-4 text-sm font-medium text-slate-800 dark:text-sky-300">{route.cta}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
