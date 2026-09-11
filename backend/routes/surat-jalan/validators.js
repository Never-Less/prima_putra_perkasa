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

function barangRowLocation(rowIndex, nama) {
  return nama ? `Baris ${rowIndex + 1} (${nama})` : `Baris ${rowIndex + 1}`;
}

function fieldValue(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "kosong";
}

function parseBarangList(barangInput, options = {}) {
  const defaultKodeDepartemen = String(options.defaultKodeDepartemen || "").trim();

  if (!Array.isArray(barangInput) || barangInput.length === 0) {
    return {
      barang: null,
      error: "Isi minimal satu barang Surat Jalan sebelum menyimpan.",
    };
  }

  const normalized = [];
  const usedOrderNumbers = new Map();

  for (const [rowIndex, item] of barangInput.entries()) {
    const nama = String(item?.nama || "").trim();
    const spesifikasiText = String(item?.spesifikasi || "").trim();
    const kodeDepartemen = String(item?.kodeDepartemen || defaultKodeDepartemen).trim();
    const jumlah = Number(item?.jumlah);
    const unit = String(item?.unit || "").trim();
    const urutanText = String(item?.urutan ?? "").trim();
    const urutan = urutanText ? Number(urutanText) : rowIndex + 1;

    const location = barangRowLocation(rowIndex, nama);

    if (!Number.isInteger(urutan) || urutan <= 0) return { barang: null, error: `${location}: nomor urutan harus berupa bilangan bulat lebih besar dari 0 (nilai: ${fieldValue(item?.urutan)}).` };
    if (usedOrderNumbers.has(urutan)) return { barang: null, error: `${location}: nomor urutan ${urutan} sudah digunakan pada baris ${usedOrderNumbers.get(urutan)}.` };
    if (!nama) return { barang: null, error: `${location}: nama barang wajib diisi.` };
    if (!Number.isFinite(jumlah)) return { barang: null, error: `${location}: jumlah kirim tidak valid (nilai: ${fieldValue(item?.jumlah)}).` };
    if (jumlah <= 0) return { barang: null, error: `${location}: jumlah kirim harus lebih besar dari 0 (nilai: ${jumlah}).` };
    if (!unit) return { barang: null, error: `${location}: unit wajib diisi.` };

    usedOrderNumbers.set(urutan, rowIndex + 1);
    normalized.push({
      urutan,
      nama: nama,
      spesifikasi: spesifikasiText || null,
      kodeDepartemen,
      jumlah: jumlah,
      unit: unit,
    });
  }

  return {
    barang: normalized
      .sort((left, right) => left.urutan - right.urutan)
      .map((item, index) => ({ ...item, urutan: index + 1 })),
    error: null,
  };
}

function normalizeBarangList(barangInput, options = {}) {
  return parseBarangList(barangInput, options).barang;
}

module.exports = {
  isValidId,
  normalizeBarangList,
  parseBarangList,
  parseBoolean,
  parseDate,
};
