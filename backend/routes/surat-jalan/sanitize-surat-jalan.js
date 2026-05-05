function sanitizeSuratJalan(suratJalan) {
  return {
    id: suratJalan._id,
    noSuratJalan: suratJalan.noSuratJalan,
    noPo: suratJalan.noPo,
    kodeDepartemen: suratJalan.kodeDepartemen,
    tanggal: suratJalan.tanggal,
    idCustomer: suratJalan.idCustomer,
    barang: suratJalan.barang,
    kendaraan: suratJalan.kendaraan,
    tipe: suratJalan.tipe,
    createdAt: suratJalan.createdAt,
    updatedAt: suratJalan.updatedAt,
  };
}

module.exports = {
  sanitizeSuratJalan,
};
