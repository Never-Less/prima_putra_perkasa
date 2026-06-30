function sanitizePembelian(pembelian) {
  const supplierId = pembelian.idSupplier;

  return {
    id: pembelian._id,
    tanggalNota: pembelian.tanggalNota,
    namaSupplier: pembelian.namaSupplier,
    idSupplier: supplierId && supplierId._id ? supplierId._id : supplierId,
    noNota: pembelian.noNota,
    note: pembelian.note,
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
