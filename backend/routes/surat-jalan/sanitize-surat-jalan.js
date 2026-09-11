function normalizeBarangList(barangInput, fallbackKodeDepartemen = "") {
  const fallbackKode = String(fallbackKodeDepartemen || "").trim();

  if (!Array.isArray(barangInput)) {
    return [];
  }

  return barangInput.map((barang, index) => ({
    id: barang?._id,
    urutan: Number.isInteger(Number(barang?.urutan)) && Number(barang.urutan) > 0 ? Number(barang.urutan) : index + 1,
    nama: barang?.nama,
    spesifikasi: barang?.spesifikasi,
    kodeDepartemen: String(barang?.kodeDepartemen || fallbackKode).trim(),
    jumlah: barang?.jumlah,
    unit: barang?.unit,
  })).sort((left, right) => left.urutan - right.urutan);
}

function summarizeKodeDepartemen(barangInput, fallbackKodeDepartemen = "") {
  const codes = normalizeBarangList(barangInput, fallbackKodeDepartemen)
    .map((barang) => String(barang.kodeDepartemen || "").trim())
    .filter(Boolean);

  return Array.from(new Set(codes)).join(", ");
}

function sanitizeSuratJalan(suratJalan, deliveryStatus = null) {
  const barang = normalizeBarangList(suratJalan.barang, suratJalan.kodeDepartemen);

  return {
    id: suratJalan._id,
    noSuratJalan: suratJalan.noSuratJalan,
    noPo: suratJalan.noPo,
    kodeDepartemen: summarizeKodeDepartemen(barang, suratJalan.kodeDepartemen),
    tanggal: suratJalan.tanggal,
    idCustomer: suratJalan.idCustomer,
    barang,
    kendaraan: suratJalan.kendaraan,
    createdAt: suratJalan.createdAt,
    updatedAt: suratJalan.updatedAt,
    deliveryStatus,
  };
}

module.exports = {
  sanitizeSuratJalan,
};
