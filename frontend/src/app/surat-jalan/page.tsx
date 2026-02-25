"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatTanggal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
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
      setError("Access token wajib diisi karena endpoint Surat Jalan bersifat privat.");
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
        throw new Error(payload.message || "Gagal mengambil data Surat Jalan");
      }

      setRows(Array.isArray(payload.SuratJalan) ? payload.SuratJalan : []);
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        setError(fetchError.message);
      } else {
        setError("Terjadi error saat mengambil data Surat Jalan");
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
              Prima Putra Perkasa
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Aplikasi Surat Jalan
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              Menampilkan tabel Surat Jalan dari backend dengan filter berdasarkan field.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              Beranda
            </Link>
            <Link
              href="/suratJalan"
              className="rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-white hover:bg-slate-700"
            >
              Lihat Surat Jalan
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Koneksi API</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            API Base URL
            <input
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="http://localhost:5000"
            />
          </label>
          <label className="text-sm text-slate-700">
            Access Token (Bearer)
            <input
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Masukkan access token"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Memuat..." : "Muat Data Surat Jalan"}
          </button>
          <span className="text-sm text-slate-600">Total data: {rows.length}</span>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Filter Berdasarkan Field</h2>
          <button
            onClick={() => setFilters(defaultFilters)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Reset Filter
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-700">
            NoSuratJalan
            <input
              value={filters.NoSuratJalan}
              onChange={(event) => setFilters((prev) => ({ ...prev, NoSuratJalan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            NoPO
            <input
              value={filters.NoPO}
              onChange={(event) => setFilters((prev) => ({ ...prev, NoPO: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            IdCustomer
            <input
              value={filters.IdCustomer}
              onChange={(event) => setFilters((prev) => ({ ...prev, IdCustomer: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Kendaraan
            <input
              value={filters.Kendaraan}
              onChange={(event) => setFilters((prev) => ({ ...prev, Kendaraan: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Tipe
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
              <option value="">Semua</option>
              <option value="partial">partial</option>
              <option value="non partial">non partial</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            SudahSelesai
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
              <option value="">Semua</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Tanggal Dari
            <input
              type="date"
              value={filters.TanggalDari}
              onChange={(event) => setFilters((prev) => ({ ...prev, TanggalDari: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Tanggal Sampai
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
          <h2 className="text-lg font-semibold text-slate-900">Tabel Surat Jalan</h2>
          <span className="text-sm text-slate-600">Hasil filter: {filteredRows.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">NoSuratJalan</th>
                <th className="px-3 py-2 font-medium">NoPO</th>
                <th className="px-3 py-2 font-medium">Tanggal</th>
                <th className="px-3 py-2 font-medium">IdCustomer</th>
                <th className="px-3 py-2 font-medium">Barang</th>
                <th className="px-3 py-2 font-medium">Kendaraan</th>
                <th className="px-3 py-2 font-medium">Tipe</th>
                <th className="px-3 py-2 font-medium">SudahSelesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{row.NoSuratJalan}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.NoPO}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatTanggal(row.Tanggal)}</td>
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
                      {row.SudahSelesai ? "true" : "false"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Belum ada data ditampilkan. Klik tombol Muat Data Surat Jalan atau sesuaikan filter.
          </p>
        ) : null}
      </section>
    </main>
  );
}
