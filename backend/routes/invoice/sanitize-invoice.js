function sanitizeInvoice(invoice) {
  return {
    id: invoice._id,
    tanggal: invoice.tanggal,
    noInvoice: invoice.noInvoice,
    noPo: invoice.noPo,
    noSuratJalan: invoice.noSuratJalan,
    idCustomer: invoice.idCustomer,
    barang: invoice.barang,
    isPpn: invoice.isPpn,
    ppnRate: invoice.ppnRate,
    ppnAmount: invoice.ppnAmount,
    subtotal: invoice.subtotal,
    grandTotal: invoice.grandTotal,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

module.exports = {
  sanitizeInvoice,
};
