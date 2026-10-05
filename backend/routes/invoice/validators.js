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

function barangRowLocation(rowIndex, namaBarang) {
  return namaBarang ? `Baris ${rowIndex + 1} (${namaBarang})` : `Baris ${rowIndex + 1}`;
}

function fieldValue(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "kosong";
}

function parseBarangList(barangInput) {
  if (!Array.isArray(barangInput) || barangInput.length === 0) {
    return {
      barang: null,
      error: "Isi minimal satu barang Invoice sebelum menyimpan.",
    };
  }

  const normalized = [];
  const usedOrderNumbers = new Map();

  for (const [rowIndex, item] of barangInput.entries()) {
    const namaBarang = String(item?.namaBarang || "").trim();
    const spesifikasi = String(item?.spesifikasi || "").trim();
    const kuantitas = parseNumber(item?.kuantitas);
    const unit = String(item?.unit || "").trim();
    const hargasatuan = parseNumber(item?.hargaSatuan);
    const jumlah = kuantitas !== null && hargasatuan !== null
      ? roundCurrency(kuantitas * hargasatuan) : null;
    const noPoManual = String(item?.noPoManual || "").trim();
    const sources = normalizeBarangSources(item?.sources);
    const urutanText = String(item?.urutan ?? "").trim();
    const urutan = urutanText ? parseNumber(urutanText) : rowIndex + 1;
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
    if (hargasatuan === null) return { barang: null, error: `${location}: harga satuan tidak valid (nilai: ${fieldValue(item?.hargaSatuan)}).` };
    if (hargasatuan < 0) return { barang: null, error: `${location}: harga satuan tidak boleh negatif (nilai: ${hargasatuan}).` };
    if (jumlah === null || !Number.isFinite(jumlah)) return { barang: null, error: `${location}: harga total tidak dapat dihitung.` };
    if (jumlah < 0) return { barang: null, error: `${location}: harga total tidak boleh negatif (nilai: ${jumlah}).` };
    if (noPoManual.length > 100) return { barang: null, error: `${location}: No. SO barang maksimal 100 karakter.` };
    if (sources === null) return { barang: null, error: `${location}: sumber Surat Jalan tidak valid.` };

    usedOrderNumbers.set(urutan, rowIndex + 1);
    normalized.push({
      urutan,
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
  parseBarangList,
  parseBoolean,
  parseDate,
  parseNumber,
};
