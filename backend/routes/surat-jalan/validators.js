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

function normalizeBarangList(barangInput, options = {}) {
  const defaultKodeDepartemen = String(options.defaultKodeDepartemen || "").trim();

  if (!Array.isArray(barangInput) || barangInput.length === 0) {
    return null;
  }

  const normalized = [];

  for (const item of barangInput) {
    const nama = String(item?.nama || "").trim();
    const spesifikasiText = String(item?.spesifikasi || "").trim();
    const kodeDepartemen = String(item?.kodeDepartemen || defaultKodeDepartemen).trim();
    const jumlah = Number(item?.jumlah);
    const unit = String(item?.unit || "").trim();

    if (!nama || !Number.isFinite(jumlah) || jumlah <= 0 || !unit) {
      return null;
    }

    normalized.push({
      nama: nama,
      spesifikasi: spesifikasiText || null,
      kodeDepartemen,
      jumlah: jumlah,
      unit: unit,
    });
  }

  return normalized;
}

module.exports = {
  isValidId,
  normalizeBarangList,
  parseBoolean,
  parseDate,
};
