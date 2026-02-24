function sanitizeSuratJalan(suratJalan) {
  return {
    id: suratJalan._id,
    NoSuratJalan: suratJalan.NoSuratJalan,
    NoPO: suratJalan.NoPO,
    Tanggal: suratJalan.Tanggal,
    IdCustomer: suratJalan.IdCustomer,
    Barang: suratJalan.Barang,
    Kendaraan: suratJalan.Kendaraan,
    Tipe: suratJalan.Tipe,
    SudahSelesai: suratJalan.SudahSelesai,
    createdAt: suratJalan.createdAt,
    updatedAt: suratJalan.updatedAt,
  };
}

module.exports = {
  sanitizeSuratJalan,
};
