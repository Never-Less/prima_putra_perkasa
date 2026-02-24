function sanitizePembelian(pembelian) {
  return {
    id: pembelian._id,
    TanggalNota: pembelian.TanggalNota,
    NamaSupplier: pembelian.NamaSupplier,
    NoNpwp: pembelian.NoNpwp,
    IdInvoice: pembelian.IdInvoice,
    Hutang: pembelian.Hutang,
    Ppn: pembelian.Ppn,
    LamaHutang: pembelian.LamaHutang,
    NilaiNota: pembelian.NilaiNota,
    TanggalJatuhTempo: pembelian.TanggalJatuhTempo,
    TanggalBayar: pembelian.TanggalBayar,
    createdAt: pembelian.createdAt,
    updatedAt: pembelian.updatedAt,
  };
}

module.exports = {
  sanitizePembelian,
};
