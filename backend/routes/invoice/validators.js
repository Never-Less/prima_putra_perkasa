const mongoose = require("mongoose");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();

    if (lowered === "true") {
      return true;
    }

    if (lowered === "false") {
      return false;
    }
  }

  return null;
}

function normalizeBarangSources(sourcesInput) {
  if (!Array.isArray(sourcesInput)) {
    return [];
  }

  const normalized = [];

  for (const source of sourcesInput) {
    const suratJalanId = String(source?.suratJalanId || "").trim();
    const noSuratJalan = String(source?.noSuratJalan || "").trim();
    const noPo = String(source?.noPo || "").trim();
    const barangId = String(source?.barangId || "").trim();
    const kuantitas = parseNumber(source?.kuantitas);

    if (
      !noSuratJalan ||
      !noPo ||
      kuantitas === null ||
      kuantitas <= 0 ||
      suratJalanId.length > 100 ||
      noSuratJalan.length > 100 ||
      noPo.length > 100 ||
      barangId.length > 120
    ) {
      return null;
    }

    normalized.push({
      suratJalanId,
      noSuratJalan,
      noPo,
      barangId,
      kuantitas,
    });
  }

  return normalized;
}

function normalizeBarangList(barangInput) {
  if (!Array.isArray(barangInput) || barangInput.length === 0) {
    return null;
  }

  const normalized = [];

  for (const item of barangInput) {
    const namaBarang = String(item?.namaBarang || "").trim();
    const spesifikasi = String(item?.spesifikasi || "").trim();
    const kuantitas = parseNumber(item?.kuantitas);
    const unit = String(item?.unit || "").trim();
    const hargasatuan = parseNumber(item?.hargaSatuan);
    const jumlah = parseNumber(item?.jumlah);
    const noPoManual = String(item?.noPoManual || "").trim();
    const sources = normalizeBarangSources(item?.sources);

    if (
      !namaBarang ||
      kuantitas === null ||
      kuantitas < 0 ||
      !unit ||
      hargasatuan === null ||
      hargasatuan < 0 ||
      jumlah === null ||
      jumlah < 0 ||
      noPoManual.length > 100 ||
      sources === null
    ) {
      return null;
    }

    normalized.push({
      namaBarang: namaBarang,
      spesifikasi: spesifikasi,
      kuantitas: kuantitas,
      unit: unit,
      hargaSatuan: hargasatuan,
      jumlah: jumlah,
      noPoManual: noPoManual,
      sources: sources,
    });
  }

  return normalized;
}

function normalizeStringList(value, options = {}) {
  const { allowEmpty = false, maxLength = 100, splitOnComma = false } = options;

  const source = Array.isArray(value)
    ? value
    : splitOnComma
      ? String(value || "").split(",")
      : [value];
  const normalized = source
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return allowEmpty ? [] : null;
  }

  for (const item of normalized) {
    if (item.length > maxLength) {
      return null;
    }
  }

  return normalized;
}

function calculateSubtotal(barang) {
  return barang.reduce((total, item) => total + item.jumlah, 0);
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

function calculatePpnAmount(subtotal, isPpn, ppnRate) {
  if (!isPpn) {
    return 0;
  }

  return roundCurrency(subtotal * (ppnRate / 100));
}

function calculateGrandTotal(subtotal, ppnAmount) {
  return roundCurrency(subtotal + ppnAmount);
}

module.exports = {
  calculateGrandTotal,
  calculatePpnAmount,
  calculateSubtotal,
  isValidId,
  normalizeBarangList,
  normalizeStringList,
  parseBoolean,
  parseDate,
  parseNumber,
};
