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
    .select("_id tanggal grandTotal")
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

  const updateResult = await PurchaseOrder.updateMany(
    { noPo: noPo },
    {
        $set: {
        tanggalInvoice: latestInvoice.tanggal || null,
        noInvoice: latestInvoice._id,
        nominalPo:
          typeof latestInvoice.grandTotal === "number" && Number.isFinite(latestInvoice.grandTotal)
            ? latestInvoice.grandTotal
            : 0,
      },
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
