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
      error: "rincianBiaya harus array",
      rincianBiaya: [],
    };
  }

  if (value.length === 0) {
    return {
      error: "minimal satu rincianBiaya wajib diisi",
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
        error: "namaBiaya wajib diisi",
        rincianBiaya: [],
      };
    }

    if (jumlah === null) {
      return {
        error: "jumlah harus angka >= 0",
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
