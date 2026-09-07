function sanitizeSupplier(supplier) {
  return {
    id: supplier._id,
    namaSupplier: String(supplier.namaSupplier || ""),
    hutang: Boolean(supplier.hutang),
    lamaHutang: supplier.hutang ? Number(supplier.lamaHutang || 0) : null,
    alamat: String(supplier.alamat || ""),
    npwp: String(supplier.npwp || ""),
    picName: String(supplier.picName || ""),
    phone: String(supplier.phone || ""),
    email: String(supplier.email || ""),
    productCategories: Array.isArray(supplier.productCategories) ? supplier.productCategories.map(String) : [],
    notes: String(supplier.notes || ""),
    documentLinks: Array.isArray(supplier.documentLinks)
      ? supplier.documentLinks.map((row) => ({ label: String(row.label || ""), url: String(row.url || "") }))
      : [],
    isActive: supplier.isActive !== false,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

module.exports = {
  sanitizeSupplier,
};
