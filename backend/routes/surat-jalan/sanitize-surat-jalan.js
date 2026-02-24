function sanitizeSuratJalan(suratJalan) {
  return {
    id: suratJalan._id,
    NoSuratJalan: suratJalan.NoSuratJalan,
    NoPO: suratJalan.NoPO,
    tanggal: suratJalan.tanggal,
    IdCustomer: suratJalan.IdCustomer,
    barang: suratJalan.barang,
    kendaraan: suratJalan.kendaraan,
    tipe: suratJalan.tipe,
    SudahSelesai: suratJalan.SudahSelesai,
    createdAt: suratJalan.createdAt,
    updatedAt: suratJalan.updatedAt,
  };
}

module.exports = {
  sanitizeSuratJalan,
};
