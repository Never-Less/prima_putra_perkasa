function sanitizeCustomer(customer) {
  return {
    id: customer._id,
    nama: String(customer.nama || ""),
    alamat: String(customer.alamat || ""),
    atasNama: String(customer.atasNama || ""),
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

module.exports = {
  sanitizeCustomer,
};
