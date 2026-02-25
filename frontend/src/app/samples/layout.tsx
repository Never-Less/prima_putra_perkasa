"use client";

import Link from "next/link";
import { useI18n } from "../_i18n/provider";

export default function SamplesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("brand.name")}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{t("nav.suratJalan")}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/suratJalan"
              className="rounded-lg bg-slate-900 px-3 py-2 text-white"
            >
              {t("nav.suratJalan")}
            </Link>
          </div>
        </div>
      </header>

      {children}
    </main>
  );
}
