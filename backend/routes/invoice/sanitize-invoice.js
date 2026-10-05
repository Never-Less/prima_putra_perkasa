function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

const { calculateDueDate } = require("../../utils/payment-term");

function normalizeNoPoList(value) {
  const source = Array.isArray(value) ? value : normalizeText(value).split(",");
  const seen = new Set();
  const normalized = [];

  for (const item of source) {
    const noPo = normalizeText(item);
    const key = noPo.toLowerCase();

    if (!noPo || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(noPo);
  }

  return normalized;
}

function getInvoiceNoPoList(invoice) {
  const listFromStructuredField = normalizeNoPoList(invoice?.noPoList);

  if (listFromStructuredField.length > 0) {
    return listFromStructuredField;
  }

  return normalizeNoPoList(invoice?.noPo);
}

function sanitizeBarangList(barangInput) {
  if (!Array.isArray(barangInput)) {
    return [];
  }

  return barangInput.map((barang, index) => ({
    urutan: Number.isInteger(Number(barang?.urutan)) && Number(barang.urutan) > 0 ? Number(barang.urutan) : index + 1,
    namaBarang: barang?.namaBarang,
    spesifikasi: barang?.spesifikasi || "",
    kuantitas: barang?.kuantitas,
    unit: barang?.unit,
    hargaSatuan: barang?.hargaSatuan,
    jumlah: barang?.jumlah,
    noPoManual: normalizeText(barang?.noPoManual),
    sources: Array.isArray(barang?.sources)
      ? barang.sources.map((source) => ({
          suratJalanId: normalizeText(source?.suratJalanId),
          noSuratJalan: normalizeText(source?.noSuratJalan),
          noPo: normalizeText(source?.noPo),
          barangId: normalizeText(source?.barangId),
          kuantitas: source?.kuantitas,
        }))
      : [],
  })).sort((left, right) => left.urutan - right.urutan);
}

function sanitizeInvoice(invoice) {
  const noPoList = getInvoiceNoPoList(invoice);
  const paymentTerm = invoice.paymentTerm || {
    type: "net",
    netDays: 30,
    downPaymentPercent: 0,
    remainingPaymentPercent: 100,
  };

  return {
    id: invoice._id,
    tanggal: invoice.tanggal,
    noInvoice: invoice.noInvoice,
    noPo: noPoList.length > 0 ? noPoList.join(", ") : invoice.noPo,
    noPoList,
    noSuratJalan: invoice.noSuratJalan,
    idCustomer: invoice.idCustomer,
    barang: sanitizeBarangList(invoice.barang),
    isPpn: invoice.isPpn,
    isPaid: invoice.isPaid,
    tanggalBayar: invoice.tanggalBayar,
    paymentTerm: {
      type: paymentTerm.type,
      netDays: paymentTerm.netDays,
      downPaymentPercent: paymentTerm.downPaymentPercent,
      remainingPaymentPercent: paymentTerm.remainingPaymentPercent,
    },
    dueDate: invoice.dueDate || calculateDueDate(invoice.tanggal, paymentTerm),
    ppnRate: invoice.ppnRate,
    ppnAmount: invoice.ppnAmount,
    subtotal: invoice.subtotal,
    grandTotal: invoice.grandTotal,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

module.exports = {
  getInvoiceNoPoList,
  sanitizeInvoice,
};
