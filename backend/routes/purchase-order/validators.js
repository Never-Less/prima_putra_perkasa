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

function barangRowLocation(rowIndex, namaBarang) {
  return namaBarang ? `Baris ${rowIndex + 1} (${namaBarang})` : `Baris ${rowIndex + 1}`;
}

function fieldValue(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "kosong";
}

function parseBarangList(barangInput) {
  if (barangInput === undefined || barangInput === null) {
    return { barang: [], error: null };
  }

  if (!Array.isArray(barangInput)) {
    return { barang: null, error: "Data barang Sales Order harus berupa daftar." };
  }

  const normalized = [];
  const usedOrderNumbers = new Map();

  for (const [rowIndex, item] of barangInput.entries()) {
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
    const urutanText = String(item?.urutan ?? "").trim();
    const urutan = urutanText ? parseNumber(urutanText) : rowIndex + 1;
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

    const location = barangRowLocation(rowIndex, namaBarang);

    if (urutan === null || !Number.isInteger(urutan) || urutan <= 0) {
      return { barang: null, error: `${location}: nomor urutan harus berupa bilangan bulat lebih besar dari 0 (nilai: ${fieldValue(item?.urutan)}).` };
    }
    if (usedOrderNumbers.has(urutan)) {
      return { barang: null, error: `${location}: nomor urutan ${urutan} sudah digunakan pada baris ${usedOrderNumbers.get(urutan)}.` };
    }
    if (!namaBarang) return { barang: null, error: `${location}: nama barang wajib diisi.` };
    if (kuantitas === null) return { barang: null, error: `${location}: kuantitas tidak valid (nilai: ${fieldValue(item?.kuantitas)}).` };
    if (kuantitas <= 0) return { barang: null, error: `${location}: kuantitas harus lebih besar dari 0 (nilai: ${kuantitas}).` };
    if (!unit) return { barang: null, error: `${location}: unit wajib diisi.` };
    if (hargaSatuan === null) return { barang: null, error: `${location}: harga satuan tidak valid (nilai: ${fieldValue(item?.hargaSatuan)}).` };
    if (hargaSatuan < 0) return { barang: null, error: `${location}: harga satuan tidak boleh negatif (nilai: ${hargaSatuan}).` };
    if (jumlah === null) return { barang: null, error: `${location}: harga total tidak dapat dihitung.` };
    if (jumlah < 0) return { barang: null, error: `${location}: harga total tidak boleh negatif (nilai: ${jumlah}).` };

    usedOrderNumbers.set(urutan, rowIndex + 1);
    normalized.push({
      urutan,
      namaBarang,
      spesifikasi,
      kuantitas,
      unit,
      hargaSatuan,
      jumlah,
    });
  }

  return {
    barang: normalized
      .sort((left, right) => left.urutan - right.urutan)
      .map((item, index) => ({ ...item, urutan: index + 1 })),
    error: null,
  };
}

function normalizeBarangList(barangInput) {
  return parseBarangList(barangInput).barang;
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
  parseBarangList,
  parseBoolean,
  parseDate,
  parseNumber,
};
