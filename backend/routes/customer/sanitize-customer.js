function sanitizeCustomer(customer) {
  return {
    id: customer._id,
    nama: customer.nama,
    alamat: customer.alamat,
    atasNama: customer.atasNama,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

module.exports = {
  sanitizeCustomer,
};
