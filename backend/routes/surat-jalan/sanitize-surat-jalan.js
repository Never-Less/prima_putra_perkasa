function sanitizeSuratJalan(suratJalan) {
  return {
    id: suratJalan._id,
    noSuratJalan: suratJalan.noSuratJalan,
    noPo: suratJalan.noPo,
    tanggal: suratJalan.tanggal,
    idCustomer: suratJalan.idCustomer,
    barang: suratJalan.barang,
    kendaraan: suratJalan.kendaraan,
    tipe: suratJalan.tipe,
    sudahSelesai: suratJalan.sudahSelesai,
    createdAt: suratJalan.createdAt,
    updatedAt: suratJalan.updatedAt,
  };
}

module.exports = {
  sanitizeSuratJalan,
};
