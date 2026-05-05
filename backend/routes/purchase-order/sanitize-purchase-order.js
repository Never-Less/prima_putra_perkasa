function sanitizePurchaseOrder(purchaseOrder) {
  return {
    id: purchaseOrder._id,
    noPo: purchaseOrder.noPo,
    tanggalPo: purchaseOrder.tanggalPo,
    namaCustomer: purchaseOrder.namaCustomer,
    nominalPo: purchaseOrder.nominalPo,
    isPaid: purchaseOrder.isPaid,
    tanggalBayar: purchaseOrder.tanggalBayar,
    tanggalInvoice: purchaseOrder.tanggalInvoice,
    noInvoice: purchaseOrder.noInvoice,
    createdAt: purchaseOrder.createdAt,
    updatedAt: purchaseOrder.updatedAt,
  };
}

module.exports = {
  sanitizePurchaseOrder,
};
