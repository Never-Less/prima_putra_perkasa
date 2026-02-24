function sanitizeInvoice(invoice) {
  return {
    id: invoice._id,
    Tanggal: invoice.Tanggal,
    NoInvoice: invoice.NoInvoice,
    NoPO: invoice.NoPO,
    NoSuratJalan: invoice.NoSuratJalan,
    IdCustomer: invoice.IdCustomer,
    Barang: invoice.Barang,
    IsPpn: invoice.IsPpn,
    PpnRate: invoice.PpnRate,
    PpnAmount: invoice.PpnAmount,
    Subtotal: invoice.Subtotal,
    GrandTotal: invoice.GrandTotal,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

module.exports = {
  sanitizeInvoice,
};
