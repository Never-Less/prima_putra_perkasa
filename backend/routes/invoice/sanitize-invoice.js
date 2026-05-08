function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

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

function sanitizeInvoice(invoice) {
  const noPoList = getInvoiceNoPoList(invoice);

  return {
    id: invoice._id,
    tanggal: invoice.tanggal,
    noInvoice: invoice.noInvoice,
    noPo: noPoList.length > 0 ? noPoList.join(", ") : invoice.noPo,
    noPoList,
    noSuratJalan: invoice.noSuratJalan,
    idCustomer: invoice.idCustomer,
    barang: invoice.barang,
    isPpn: invoice.isPpn,
    isPaid: invoice.isPaid,
    tanggalBayar: invoice.tanggalBayar,
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
