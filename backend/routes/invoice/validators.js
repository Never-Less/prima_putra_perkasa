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

function normalizeBarangList(barangInput) {
  if (!Array.isArray(barangInput) || barangInput.length === 0) {
    return null;
  }

  const normalized = [];

  for (const item of barangInput) {
    const kuantitas = parseNumber(item?.Kuantitas);
    const unit = String(item?.Unit || "").trim();
    const hargasatuan = parseNumber(item?.HargaSatuan);
    const jumlah = parseNumber(item?.Jumlah);

    if (
      kuantitas === null ||
      kuantitas < 0 ||
      !unit ||
      hargasatuan === null ||
      hargasatuan < 0 ||
      jumlah === null ||
      jumlah < 0
    ) {
      return null;
    }

    normalized.push({
      Kuantitas: kuantitas,
      Unit: unit,
      HargaSatuan: hargasatuan,
      Jumlah: jumlah,
    });
  }

  return normalized;
}

function normalizeStringList(value, options = {}) {
  const { maxLength = 100 } = options;

  const source = Array.isArray(value) ? value : [value];
  const normalized = source
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  for (const item of normalized) {
    if (item.length > maxLength) {
      return null;
    }
  }

  return normalized;
}

function calculateSubtotal(barang) {
  return barang.reduce((total, item) => total + item.Jumlah, 0);
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
