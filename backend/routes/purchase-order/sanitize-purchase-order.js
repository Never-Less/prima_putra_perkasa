function sanitizePurchaseOrderBarang(barang) {
  if (!Array.isArray(barang)) {
    return [];
  }

  return barang
    .map((item) => {
      const namaBarang = String(item?.namaBarang || "").trim();
      const kuantitas = Number(item?.kuantitas);
      const unit = String(item?.unit || "").trim();
      const hargaSatuan = Number(item?.hargaSatuan);
      const jumlah = Number(item?.jumlah);

      if (!namaBarang || !Number.isFinite(kuantitas) || kuantitas <= 0 || !unit) {
        return null;
      }

      return {
        namaBarang,
        spesifikasi: String(item?.spesifikasi || "").trim(),
        kuantitas,
        unit,
        hargaSatuan: Number.isFinite(hargaSatuan) ? hargaSatuan : 0,
        jumlah: Number.isFinite(jumlah) ? jumlah : 0,
      };
    })
    .filter((item) => Boolean(item));
}

function sanitizePurchaseOrder(purchaseOrder, workflow = null) {
  const paymentTerm = purchaseOrder.paymentTerm || {
    type: "net",
    netDays: 30,
    downPaymentPercent: 0,
    remainingPaymentPercent: 100,
  };

  return {
    id: purchaseOrder._id,
    noPo: purchaseOrder.noPo,
    tanggalPo: purchaseOrder.tanggalPo,
    namaCustomer: purchaseOrder.namaCustomer,
    nominalPo: purchaseOrder.nominalPo,
    barang: sanitizePurchaseOrderBarang(purchaseOrder.barang),
    paymentTerm: {
      type: paymentTerm.type,
      netDays: paymentTerm.netDays,
      downPaymentPercent: paymentTerm.downPaymentPercent,
      remainingPaymentPercent: paymentTerm.remainingPaymentPercent,
    },
    tanggalInvoice: purchaseOrder.tanggalInvoice,
    noInvoice: purchaseOrder.noInvoice,
    revision: Number(purchaseOrder.revision || 0),
    revisionHistory: Array.isArray(purchaseOrder.revisionHistory)
      ? purchaseOrder.revisionHistory.map((row) => ({
          revision: Number(row.revision || 0), reason: String(row.reason || ""),
          revisedAt: row.revisedAt, affectedSuratJalan: Number(row.affectedSuratJalan || 0),
          affectedInvoices: Number(row.affectedInvoices || 0),
        })).reverse()
      : [],
    createdAt: purchaseOrder.createdAt,
    updatedAt: purchaseOrder.updatedAt,
    workflow,
  };
}

module.exports = {
  sanitizePurchaseOrder,
  sanitizePurchaseOrderBarang,
};
