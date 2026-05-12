function normalizeBarangList(barangInput, fallbackKodeDepartemen = "") {
  const fallbackKode = String(fallbackKodeDepartemen || "").trim();

  if (!Array.isArray(barangInput)) {
    return [];
  }

  return barangInput.map((barang) => ({
    id: barang?._id,
    nama: barang?.nama,
    spesifikasi: barang?.spesifikasi,
    kodeDepartemen: String(barang?.kodeDepartemen || fallbackKode).trim(),
    jumlah: barang?.jumlah,
    unit: barang?.unit,
  }));
}

function summarizeKodeDepartemen(barangInput, fallbackKodeDepartemen = "") {
  const codes = normalizeBarangList(barangInput, fallbackKodeDepartemen)
    .map((barang) => String(barang.kodeDepartemen || "").trim())
    .filter(Boolean);

  return Array.from(new Set(codes)).join(", ");
}

function sanitizeSuratJalan(suratJalan) {
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
    tipe: suratJalan.tipe,
    createdAt: suratJalan.createdAt,
    updatedAt: suratJalan.updatedAt,
  };
}

module.exports = {
  sanitizeSuratJalan,
};
