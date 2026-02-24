function sanitizeCustomer(customer) {
  return {
    id: customer._id,
    Nama: customer.Nama,
    Alamat: customer.Alamat,
    AtasNama: customer.AtasNama,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

module.exports = {
  sanitizeCustomer,
};
