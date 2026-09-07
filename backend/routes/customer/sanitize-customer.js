function sanitizeCustomer(customer) {
  const defaultPaymentTerm = customer.defaultPaymentTerm || {
    type: "net",
    netDays: 30,
    downPaymentPercent: 0,
    remainingPaymentPercent: 100,
  };

  return {
    id: customer._id,
    nama: String(customer.nama || ""),
    alamat: String(customer.alamat || ""),
    npwp: String(customer.npwp || ""),
    atasNama: String(customer.atasNama || ""),
    defaultPaymentTerm: {
      type: defaultPaymentTerm.type,
      netDays: defaultPaymentTerm.netDays,
      downPaymentPercent: defaultPaymentTerm.downPaymentPercent,
      remainingPaymentPercent: defaultPaymentTerm.remainingPaymentPercent,
    },
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

module.exports = {
  sanitizeCustomer,
};
