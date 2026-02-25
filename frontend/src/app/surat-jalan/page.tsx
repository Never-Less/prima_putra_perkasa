"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "../_i18n/provider";

type SuratJalanBarang = {
  Nama: string;
  Jumlah: number;
};

type SuratJalanItem = {
  id: string;
  NoSuratJalan: string;
  NoPO: string;
  Tanggal: string;
  IdCustomer: string;
  Barang: SuratJalanBarang[];
  Kendaraan: string;
  Tipe: "partial" | "non partial";
  SudahSelesai: boolean;
};

type SuratJalanResponse = {
  SuratJalan?: SuratJalanItem[];
  message?: string;
};

type FilterState = {
  NoSuratJalan: string;
  NoPO: string;
  IdCustomer: string;
  Kendaraan: string;
  Tipe: "" | "partial" | "non partial";
  SudahSelesai: "" | "true" | "false";
  TanggalDari: string;
  TanggalSampai: string;
};

const defaultFilters: FilterState = {
  NoSuratJalan: "",
  NoPO: "",
  IdCustomer: "",
  Kendaraan: "",
  Tipe: "",
  SudahSelesai: "",
  TanggalDari: "",
  TanggalSampai: "",
};

const defaultApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
type Locale = "id" | "en";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatTanggal(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const dateLocale = locale === "en" ? "en-US" : "id-ID";

  return date.toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function barangLabel(items: SuratJalanBarang[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return "-";
  }

  return items.map((item) => `${item.Nama} (${item.Jumlah})`).join(", ");
}

export default function SuratJalanPage() {
  const { locale, t } = useI18n();
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultApiBaseUrl);
  const [accessToken, setAccessToken] = useState("");
  const [rows, setRows] = useState<SuratJalanItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredRows = useMemo(() => {
    const fromDate = filters.TanggalDari ? new Date(filters.TanggalDari) : null;
    const toDate = filters.TanggalSampai ? new Date(filters.TanggalSampai) : null;

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    return rows.filter((row) => {
      const noSuratJalanMatch = normalize(row.NoSuratJalan).includes(normalize(filters.NoSuratJalan));
      const noPOMatch = normalize(row.NoPO).includes(normalize(filters.NoPO));
      const idCustomerMatch = normalize(row.IdCustomer).includes(normalize(filters.IdCustomer));
      const kendaraanMatch = normalize(row.Kendaraan).includes(normalize(filters.Kendaraan));

      const tipeMatch = !filters.Tipe || row.Tipe === filters.Tipe;
      const selesaiMatch =
        !filters.SudahSelesai ||
        (filters.SudahSelesai === "true" && row.SudahSelesai) ||
        (filters.SudahSelesai === "false" && !row.SudahSelesai);

      const rowDate = new Date(row.Tanggal);
      const hasValidDate = !Number.isNaN(rowDate.getTime());

      const fromDateMatch = !fromDate || (hasValidDate && rowDate >= fromDate);
      const toDateMatch = !toDate || (hasValidDate && rowDate <= toDate);

      return (
        noSuratJalanMatch &&
        noPOMatch &&
        idCustomerMatch &&
        kendaraanMatch &&
        tipeMatch &&
        selesaiMatch &&
        fromDateMatch &&
        toDateMatch
      );
    });
  }, [filters, rows]);

  async function loadData() {
    setError("");

    if (!accessToken.trim()) {
      setError(t("suratJalanApi.error.tokenRequired"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/surat-jalan`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
        },
        cache: "no-store",
      });

      const payload = (await response.json()) as SuratJalanResponse;

      if (!response.ok) {
        throw new Error(payload.message || t("suratJalanApi.error.fetchFailed"));
      }

      setRows(Array.isArray(payload.SuratJalan) ? payload.SuratJalan : []);
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        setError(fetchError.message);
      } else {
        setError(t("suratJalanApi.error.unknown"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("brand.name")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              {t("nav.suratJalan")}
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              {t("suratJalanApi.header.description")}
            </p>
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
              className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-white hover:bg-slate-700"
            >
              {t("suratJalanApi.nav.viewSuratJalan")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t("suratJalanApi.connection.title")}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            {t("suratJalanApi.connection.apiBaseUrl")}
            <input
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="http://localhost:5000"
            />
          </label>
          <label className="text-sm text-slate-700">
            {t("suratJalanApi.connection.accessToken")}
            <input
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={t("suratJalanApi.connection.accessTokenPlaceholder")}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? t("common.loading") : t("suratJalanApi.connection.loadButton")}
          </button>
          <span className="text-sm text-slate-600">{t("common.totalData", { count: rows.length })}</span>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{t("common.filterByField")}</h2>
          <button
            onClick={() => setFilters(defaultFilters)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {t("common.resetFilter")}
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            {t("field.NoSuratJalan")}
            <input
              value={filters.NoSuratJalan}
              onChange={(event) => setFilters((prev) => ({ ...prev, NoSuratJalan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.NoPO")}
            <input
              value={filters.NoPO}
              onChange={(event) => setFilters((prev) => ({ ...prev, NoPO: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.IdCustomer")}
            <input
              value={filters.IdCustomer}
              onChange={(event) => setFilters((prev) => ({ ...prev, IdCustomer: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.Kendaraan")}
            <input
              value={filters.Kendaraan}
              onChange={(event) => setFilters((prev) => ({ ...prev, Kendaraan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.Tipe")}
            <select
              value={filters.Tipe}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  Tipe: event.target.value as FilterState["Tipe"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="partial">partial</option>
              <option value="non partial">non partial</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            {t("field.SudahSelesai")}
            <select
              value={filters.SudahSelesai}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  SudahSelesai: event.target.value as FilterState["SudahSelesai"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.true")}</option>
              <option value="false">{t("common.false")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            {t("field.TanggalDari")}
            <input
              type="date"
              value={filters.TanggalDari}
              onChange={(event) => setFilters((prev) => ({ ...prev, TanggalDari: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            {t("field.TanggalSampai")}
            <input
              type="date"
              value={filters.TanggalSampai}
              onChange={(event) => setFilters((prev) => ({ ...prev, TanggalSampai: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{t("suratJalan.table.title")}</h2>
          <span className="text-sm text-slate-600">{t("common.filterResult", { count: filteredRows.length })}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">{t("field.NoSuratJalan")}</th>
                <th className="px-3 py-2 font-medium">{t("field.NoPO")}</th>
                <th className="px-3 py-2 font-medium">{t("field.Tanggal")}</th>
                <th className="px-3 py-2 font-medium">{t("field.IdCustomer")}</th>
                <th className="px-3 py-2 font-medium">{t("field.Barang")}</th>
                <th className="px-3 py-2 font-medium">{t("field.Kendaraan")}</th>
                <th className="px-3 py-2 font-medium">{t("field.Tipe")}</th>
                <th className="px-3 py-2 font-medium">{t("field.SudahSelesai")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.NoSuratJalan}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.NoPO}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatTanggal(row.Tanggal, locale)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.IdCustomer}</td>
                  <td className="px-3 py-2 text-slate-600">{barangLabel(row.Barang)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.Kendaraan}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.Tipe}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        row.SudahSelesai ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.SudahSelesai ? t("common.true") : t("common.false")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            {t("suratJalanApi.emptyState")}
          </p>
        ) : null}
      </section>
    </main>
  );
}
