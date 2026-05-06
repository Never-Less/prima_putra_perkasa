function sanitizePembelian(pembelian) {
  return {
    id: pembelian._id,
    tanggalNota: pembelian.tanggalNota,
    namaSupplier: pembelian.namaSupplier,
    noNota: pembelian.noNota,
    idInvoice: pembelian.idInvoice,
    hutang: pembelian.hutang,
    ppn: pembelian.ppn,
    lamaHutang: pembelian.lamaHutang,
    nilaiNota: pembelian.nilaiNota,
    tanggalJatuhTempo: pembelian.tanggalJatuhTempo,
    tanggalBayar: pembelian.tanggalBayar,
    createdAt: pembelian.createdAt,
    updatedAt: pembelian.updatedAt,
  };
}

module.exports = {
  sanitizePembelian,
};
