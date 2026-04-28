import { requestApi } from "../../_lib/api-client";

export type RincianBiayaItem = {
  namaBiaya: string;
  jumlah: number;
};

export type LaporanKeuanganItem = {
  id: string;
  bulan: string;
  rincianBiaya: RincianBiayaItem[];
  totalBiayaOperasional: number;
  createdAt: string;
  updatedAt: string;
};

export type LaporanKeuanganFormState = {
  bulan: string;
  rincianBiaya: RincianBiayaItem[];
};

type LaporanKeuanganResponse = {
  laporanKeuangan?: unknown;
};

type AppLocale = "id" | "en";

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function toNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function toRincianBiayaItem(value: unknown): RincianBiayaItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const namaBiaya = toText(row.namaBiaya).trim();

  if (!namaBiaya) {
    return null;
  }

  return {
    namaBiaya,
    jumlah: Math.max(0, toNumber(row.jumlah)),
  };
}

function toLaporanKeuanganItem(value: unknown): LaporanKeuanganItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = toText(row.id || row._id).trim();
  const bulan = toText(row.bulan).trim();

  if (!id || !bulan) {
    return null;
  }

  const rincianBiaya = Array.isArray(row.rincianBiaya)
    ? row.rincianBiaya
        .map(toRincianBiayaItem)
        .filter((item): item is RincianBiayaItem => Boolean(item))
    : [];

  return {
    id,
    bulan,
    rincianBiaya,
    totalBiayaOperasional: Math.max(0, toNumber(row.totalBiayaOperasional)),
    createdAt: toText(row.createdAt).trim(),
    updatedAt: toText(row.updatedAt).trim(),
  };
}

export function getCurrentMonthValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function getMonthDateRange(value: string) {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return {
      tanggalDari: "",
      tanggalSampai: "",
    };
  }

  const tanggalDari = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month, 0).getDate();
  const tanggalSampai = `${year}-${String(month).padStart(2, "0")}-${String(lastDate).padStart(2, "0")}`;

  return {
    tanggalDari,
    tanggalSampai,
  };
}

export function formatLaporanKeuanganMonth(value: string, locale: AppLocale) {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return value || "-";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function formatLaporanKeuanganCurrency(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export async function fetchLaporanKeuangan(bulan: string) {
  const response = await requestApi<LaporanKeuanganResponse>(
    `/api/laporan-keuangan?bulan=${encodeURIComponent(bulan)}`
  );

  return toLaporanKeuanganItem(response?.laporanKeuangan);
}

export async function saveLaporanKeuangan(form: LaporanKeuanganFormState) {
  const response = await requestApi<LaporanKeuanganResponse>("/api/laporan-keuangan", {
    method: "POST",
    body: form,
  });

  return toLaporanKeuanganItem(response?.laporanKeuangan);
}
