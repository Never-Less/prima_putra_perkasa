function sanitizeSupplier(supplier) {
  return {
    id: supplier._id,
    namaSupplier: String(supplier.namaSupplier || ""),
    hutang: Boolean(supplier.hutang),
    lamaHutang: supplier.hutang ? Number(supplier.lamaHutang || 0) : null,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

module.exports = {
  sanitizeSupplier,
};
