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

function normalizeBarangList(barangInput) {
  if (barangInput === undefined || barangInput === null) {
    return [];
  }

  if (!Array.isArray(barangInput)) {
    return null;
  }

  const normalized = [];

  for (const item of barangInput) {
    const namaBarang = String(item?.namaBarang || "").trim();
    const spesifikasi = String(item?.spesifikasi || "").trim();
    const kuantitas = parseNumber(item?.kuantitas);
    const unit = String(item?.unit || "").trim();
    const hargaSatuan = parseNumber(item?.hargaSatuan);
    const jumlahInput = parseNumber(item?.jumlah);
    const jumlah =
      jumlahInput !== null
        ? jumlahInput
        : kuantitas !== null && hargaSatuan !== null
          ? Math.round(kuantitas * hargaSatuan)
          : null;
    const isEmptyRow =
      !namaBarang &&
      !spesifikasi &&
      kuantitas === null &&
      !unit &&
      hargaSatuan === null &&
      jumlahInput === null;

    if (isEmptyRow) {
      continue;
    }

    if (
      !namaBarang ||
      kuantitas === null ||
      kuantitas <= 0 ||
      !unit ||
      hargaSatuan === null ||
      hargaSatuan < 0 ||
      jumlah === null ||
      jumlah < 0
    ) {
      return null;
    }

    normalized.push({
      namaBarang,
      spesifikasi,
      kuantitas,
      unit,
      hargaSatuan,
      jumlah,
    });
  }

  return normalized;
}

function calculateBarangSubtotal(barang) {
  if (!Array.isArray(barang)) {
    return 0;
  }

  return barang.reduce((total, item) => total + Math.max(0, Number(item?.jumlah) || 0), 0);
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

module.exports = {
  calculateBarangSubtotal,
  isValidId,
  normalizeBarangList,
  parseBoolean,
  parseDate,
  parseNumber,
};
