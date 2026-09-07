function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizePriceList(item) {
  return {
    id: String(item?._id || item?.id || ""),
    namaBarang: String(item?.namaBarang || ""),
    hargaJual: Number(item?.hargaJual || 0),
    tanggalJual: toIsoDate(item?.tanggalJual),
    idCustomer: item?.idCustomer ? String(item.idCustomer?._id || item.idCustomer) : "",
    namaCustomer: String(item?.namaCustomer || item?.idCustomer?.nama || ""),
    unit: String(item?.unit || ""),
    deskripsi: String(item?.deskripsi || ""),
    images: Array.isArray(item?.images) ? item.images.map((image) => String(image || "")).filter(Boolean) : [],
    riwayatPembelian: Array.isArray(item?.riwayatPembelian)
      ? item.riwayatPembelian.map((detail) => ({
          id: String(detail?._id || detail?.id || ""),
          sumber: String(detail?.sumber || ""),
          tanggal: toIsoDate(detail?.tanggal),
          hargaBeli: Number(detail?.hargaBeli || 0),
        }))
      : [],
    createdAt: toIsoDate(item?.createdAt),
    updatedAt: toIsoDate(item?.updatedAt),
  };
}

module.exports = { sanitizePriceList };
