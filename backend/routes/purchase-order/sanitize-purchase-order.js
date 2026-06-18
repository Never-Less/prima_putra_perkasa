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

function sanitizePurchaseOrder(purchaseOrder) {
  return {
    id: purchaseOrder._id,
    noPo: purchaseOrder.noPo,
    tanggalPo: purchaseOrder.tanggalPo,
    namaCustomer: purchaseOrder.namaCustomer,
    nominalPo: purchaseOrder.nominalPo,
    barang: sanitizePurchaseOrderBarang(purchaseOrder.barang),
    tanggalInvoice: purchaseOrder.tanggalInvoice,
    noInvoice: purchaseOrder.noInvoice,
    createdAt: purchaseOrder.createdAt,
    updatedAt: purchaseOrder.updatedAt,
  };
}

module.exports = {
  sanitizePurchaseOrder,
  sanitizePurchaseOrderBarang,
};
