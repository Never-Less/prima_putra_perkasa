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
    whatsapp: String(supplier.whatsapp || ""),
    productBrands: Array.isArray(supplier.productBrands) ? supplier.productBrands.map(String) : [],
    onboarding: {
      status: supplier.onboarding?.status || "notGenerated",
      generatedAt: supplier.onboarding?.generatedAt || null,
      expiresAt: supplier.onboarding?.expiresAt || null,
      sentAt: supplier.onboarding?.sentAt || null,
      submittedAt: supplier.onboarding?.submittedAt || null,
      completedAt: supplier.onboarding?.completedAt || null,
      pendingData: supplier.onboarding?.pendingData || null,
    },
    email: String(supplier.email || ""),
    productCategories: Array.isArray(supplier.productCategories) ? supplier.productCategories.map(String) : [],
    notes: String(supplier.notes || ""),
    documents: (supplier.documents || []).map((row) => ({ id: String(row.id), name: String(row.name), size: Number(row.size) })),
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
