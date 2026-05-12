const { Invoice } = require("../models/Invoice");
const { PurchaseOrder } = require("../models/PurchaseOrder");

function normalizeText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function parseNoPoList(value) {
  const values = Array.isArray(value) ? value : normalizeText(value).split(",");
  const seen = new Set();
  const normalizedValues = [];

  values.forEach((item) => {
    const noPo = normalizeText(item);
    const key = normalizeKey(noPo);

    if (!noPo || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalizedValues.push(noPo);
  });

  return normalizedValues;
}

function toFiniteNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundCurrency(value) {
  return Math.round(toFiniteNumber(value));
}

function getInvoiceNoPoList(invoice) {
  const listFromStructuredField = parseNoPoList(invoice?.noPoList);

  if (listFromStructuredField.length > 0) {
    return listFromStructuredField;
  }

  return parseNoPoList(invoice?.noPo);
}

function isSameNoPo(left, right) {
  return normalizeKey(left) === normalizeKey(right);
}

function calculateBarangSubtotalForNoPo(barang, noPo, invoiceNoPoList) {
  const jumlah = Math.max(0, toFiniteNumber(barang?.jumlah));

  if (jumlah <= 0) {
    return 0;
  }

  const sources = Array.isArray(barang?.sources) ? barang.sources : [];

  if (sources.length > 0) {
    const totalSourceQty = sources.reduce(
      (total, source) => total + Math.max(0, toFiniteNumber(source?.kuantitas)),
      0
    );
    const matchedSourceQty = sources
      .filter((source) => isSameNoPo(source?.noPo, noPo))
      .reduce((total, source) => total + Math.max(0, toFiniteNumber(source?.kuantitas)), 0);

    if (matchedSourceQty <= 0) {
      return 0;
    }

    return totalSourceQty > 0 ? (jumlah * matchedSourceQty) / totalSourceQty : jumlah;
  }

  const manualNoPoList = parseNoPoList(barang?.noPoManual);

  if (manualNoPoList.length > 0) {
    const hasMatchingManualNoPo = manualNoPoList.some((item) => isSameNoPo(item, noPo));

    if (!hasMatchingManualNoPo) {
      return 0;
    }

    return jumlah / manualNoPoList.length;
  }

  if (invoiceNoPoList.length === 1 && isSameNoPo(invoiceNoPoList[0], noPo)) {
    return jumlah;
  }

  return 0;
}

function calculateInvoiceNominalForNoPo(invoice, noPo) {
  const invoiceNoPoList = getInvoiceNoPoList(invoice);
  const isSingleNoPoInvoice =
    invoiceNoPoList.length === 1 && isSameNoPo(invoiceNoPoList[0], noPo);
  const grandTotal = Math.max(0, toFiniteNumber(invoice?.grandTotal));

  if (isSingleNoPoInvoice) {
    return roundCurrency(grandTotal);
  }

  const barang = Array.isArray(invoice?.barang) ? invoice.barang : [];
  const poSubtotal = barang.reduce(
    (total, item) => total + calculateBarangSubtotalForNoPo(item, noPo, invoiceNoPoList),
    0
  );

  if (poSubtotal <= 0) {
    return null;
  }

  const subtotal = Math.max(0, toFiniteNumber(invoice?.subtotal));

  if (subtotal <= 0 || grandTotal <= 0) {
    return roundCurrency(poSubtotal);
  }

  return roundCurrency((poSubtotal * grandTotal) / subtotal);
}

async function syncPurchaseOrderByNoPo(noPoValue) {
  const noPo = normalizeText(noPoValue);

  if (!noPo) {
    return {
      noPo: "",
      matchedPurchaseOrders: 0,
      linkedInvoiceId: null,
    };
  }

  const latestInvoice = await Invoice.findOne({
    $or: [
      { noPo: noPo },
      { noPoList: noPo },
    ],
  })
    .sort({
      tanggal: -1,
      createdAt: -1,
    })
    .select("_id tanggal noPo noPoList barang subtotal grandTotal")
    .lean();

  if (!latestInvoice) {
    const clearResult = await PurchaseOrder.updateMany(
      { noPo: noPo },
      {
        $set: {
          tanggalInvoice: null,
          noInvoice: null,
        },
      }
    );

    return {
      noPo,
      matchedPurchaseOrders: clearResult.matchedCount || 0,
      linkedInvoiceId: null,
    };
  }

  const nominalPo = calculateInvoiceNominalForNoPo(latestInvoice, noPo);
  const updateFields = {
    tanggalInvoice: latestInvoice.tanggal || null,
    noInvoice: latestInvoice._id,
  };

  if (nominalPo !== null) {
    updateFields.nominalPo = nominalPo;
  }

  const updateResult = await PurchaseOrder.updateMany(
    { noPo: noPo },
    {
      $set: updateFields,
    }
  );

  return {
    noPo,
    matchedPurchaseOrders: updateResult.matchedCount || 0,
    linkedInvoiceId: String(latestInvoice._id || "").trim() || null,
  };
}

module.exports = {
  syncPurchaseOrderByNoPo,
};
