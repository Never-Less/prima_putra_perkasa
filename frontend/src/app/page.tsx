"use client";

import Link from "next/link";
import { useI18n } from "./_i18n/provider";

export default function HomePage() {
  const { t } = useI18n();

  const routes = [
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
      href: "/pembelian",
      title: t("home.route.pembelian.title"),
      description: t("home.route.pembelian.description"),
      cta: t("home.route.pembelian.cta"),
    },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {t("brand.name")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{t("home.title")}</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          {t("home.description")}
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-slate-900">{route.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{route.description}</p>
            <p className="mt-4 text-sm font-medium text-slate-800">{route.cta}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
