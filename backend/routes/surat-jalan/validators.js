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

function normalizeBarangList(barangInput) {
  if (!Array.isArray(barangInput) || barangInput.length === 0) {
    return null;
  }

  const normalized = [];

  for (const item of barangInput) {
    const nama = String(item?.Nama || "").trim();
    const jumlah = Number(item?.Jumlah);

    if (!nama || !Number.isFinite(jumlah) || jumlah <= 0) {
      return null;
    }

    normalized.push({
      Nama: nama,
      Jumlah: jumlah,
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
