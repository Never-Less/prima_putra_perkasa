const { BULAN_PATTERN } = require("../../models/LaporanKeuangan");

function normalizeBulan(value) {
  const text = String(value || "").trim();

  return BULAN_PATTERN.test(text) ? text : "";
}

function parseJumlah(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
}

function normalizeRincianBiaya(value) {
  if (!Array.isArray(value)) {
    return {
      error: "Rincian biaya tidak dapat dibaca. Coba muat ulang halaman lalu isi kembali.",
      rincianBiaya: [],
    };
  }

  if (value.length === 0) {
    return {
      error: "Isi minimal satu rincian biaya.",
      rincianBiaya: [],
    };
  }

  const rincianBiaya = [];

  for (const row of value) {
    const source = row && typeof row === "object" ? row : {};
    const namaBiaya = String(source.namaBiaya || "").trim();
    const jumlah = parseJumlah(source.jumlah);

    if (!namaBiaya) {
      return {
        error: "Isi nama biaya terlebih dahulu.",
        rincianBiaya: [],
      };
    }

    if (jumlah === null) {
      return {
        error: "Isi jumlah dengan angka 0 atau lebih.",
        rincianBiaya: [],
      };
    }

    rincianBiaya.push({
      namaBiaya,
      jumlah,
    });
  }

  return {
    error: "",
    rincianBiaya,
  };
}

module.exports = {
  normalizeBulan,
  normalizeRincianBiaya,
};
