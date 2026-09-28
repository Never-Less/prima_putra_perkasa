const crypto = require("crypto");

const salesOrderWorkflowStatuses = [
  "toDeliver",
  "partlyDelivered",
  "deliveredToBilled",
  "partlyBilled",
  "billed",
  "paid",
];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildSalesOrderWorkflowFingerprint(purchaseOrder, suratJalanList = [], invoiceList = []) {
  const normalizeItem = (item) => ({
    nama: normalizeText(item?.namaBarang || item?.nama),
    spesifikasi: normalizeText(item?.spesifikasi),
    unit: normalizeText(item?.unit),
    kuantitas: Number(item?.kuantitas ?? item?.jumlah ?? 0),
    jumlah: Number(item?.jumlah || 0),
    noPoManual: normalizeText(item?.noPoManual),
    sources: (item?.sources || []).map((source) => ({
      noPo: normalizeText(source?.noPo),
      suratJalanId: String(source?.suratJalanId || ""),
      barangId: String(source?.barangId || ""),
      kuantitas: Number(source?.kuantitas || 0),
    })),
  });
  const normalizeDocument = (document, type) => ({
    id: String(document?._id || document?.id || ""),
    number: normalizeText(type === "invoice" ? document?.noInvoice : document?.noSuratJalan),
    updatedAt: String(document?.updatedAt || ""),
    isPaid: type === "invoice" ? Boolean(document?.isPaid) : undefined,
    barang: (document?.barang || []).map(normalizeItem),
  });
  const payload = {
    noPo: normalizeText(purchaseOrder?.noPo),
    nominalPo: Number(purchaseOrder?.nominalPo || 0),
    barang: (purchaseOrder?.barang || []).map(normalizeItem),
    suratJalan: suratJalanList
      .map((document) => normalizeDocument(document, "suratJalan"))
      .sort((left, right) => `${left.id}:${left.number}`.localeCompare(`${right.id}:${right.number}`)),
    invoices: invoiceList
      .map((document) => normalizeDocument(document, "invoice"))
      .sort((left, right) => `${left.id}:${left.number}`.localeCompare(`${right.id}:${right.number}`)),
  };

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function itemKey(name, specification, unit) {
  return [name, specification, unit].map(normalizeText).join("::");
}

function invoiceItemKey(item, suratJalanList) {
  for (const source of item?.sources || []) {
    const sj = suratJalanList.find((row) => String(row._id || row.id) === String(source.suratJalanId) || normalizeText(row.noSuratJalan) === normalizeText(source.noSuratJalan));
    const original = (sj?.barang || []).find((row, index) =>
      String(row._id || row.id || `legacy:${sj.noSuratJalan}:${index}`) === String(source.barangId)
    );
    if (original) return itemKey(original.nama, original.spesifikasi, original.unit);
  }
  return itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
}

function invoiceNoPoList(invoice) {
  const source = Array.isArray(invoice?.noPoList) && invoice.noPoList.length > 0
    ? invoice.noPoList
    : String(invoice?.noPo || "").split(",");

  return [...new Set([
    ...source,
    ...(invoice?.barang || []).flatMap((item) => [
      item?.noPoManual,
      ...(item?.sources || []).map((row) => row?.noPo),
    ]),
  ].map((value) => String(value || "").trim()).filter(Boolean))];
}

function allocatedItemShare(purchaseOrder, suratJalanList, invoice, item) {
  const salesOrderKey = normalizeText(purchaseOrder?.noPo);
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  if (sources.length > 0) {
    const suratJalanIds = new Set(suratJalanList.map((row) => String(row?._id || row?.id || "")));
    const totalSourceQty = sources.reduce((sum, source) => sum + Math.max(0, Number(source?.kuantitas) || 0), 0);
    const linkedQty = sources.reduce((sum, source) => {
      const sourceNoPo = normalizeText(source?.noPo);
      const belongs = sourceNoPo
        ? sourceNoPo === salesOrderKey
        : suratJalanIds.has(String(source?.suratJalanId || ""));
      return sum + (belongs ? Math.max(0, Number(source?.kuantitas) || 0) : 0);
    }, 0);
    // A merged line's entire value is split across its SO references by source quantity.
    return totalSourceQty > 0 ? linkedQty / totalSourceQty : 0;
  }
  const manualNoPo = normalizeText(item?.noPoManual);
  if (manualNoPo) return manualNoPo === salesOrderKey ? 1 : 0;
  const keys = new Set(invoiceNoPoList(invoice).map(normalizeText));
  return keys.size === 1 && keys.has(salesOrderKey) ? 1 : 0;
}

function allocatedItemQuantity(purchaseOrder, suratJalanList, invoice, item) {
  return Math.max(0, Number(item?.kuantitas) || 0) * allocatedItemShare(purchaseOrder, suratJalanList, invoice, item);
}

function indexSalesOrderRelations(suratJalanList, invoiceList) {
  const suratJalanByNoPo = new Map();
  const invoiceByNoPo = new Map();

  suratJalanList.forEach((row) => {
    const key = normalizeText(row?.noPo);
    if (key) suratJalanByNoPo.set(key, [...(suratJalanByNoPo.get(key) || []), row]);
  });

  invoiceList.forEach((row) => {
    new Set(invoiceNoPoList(row).map(normalizeText)).forEach((key) => {
      if (key) invoiceByNoPo.set(key, [...(invoiceByNoPo.get(key) || []), row]);
    });
  });

  return { suratJalanByNoPo, invoiceByNoPo };
}

function buildDeliverySummary(purchaseOrder, suratJalanList) {
  const deliveredByItem = new Map();

  suratJalanList.forEach((suratJalan) => {
    (suratJalan?.barang || []).forEach((item) => {
      const key = itemKey(item?.nama, item?.spesifikasi, item?.unit);
      deliveredByItem.set(key, (deliveredByItem.get(key) || 0) + Number(item?.jumlah || 0));
    });
  });

  const orderedItems = purchaseOrder?.barang || [];
  const deliveredItems = orderedItems.filter((item) => {
    const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
    const available = deliveredByItem.get(key) || 0;
    const ordered = Number(item?.kuantitas || 0);
    deliveredByItem.set(key, Math.max(available - ordered, 0));
    return available >= ordered;
  }).length;

  return {
    deliveredItems,
    totalItems: orderedItems.length,
    isComplete:
      suratJalanList.length > 0 &&
      orderedItems.length > 0 && deliveredItems === orderedItems.length,
  };
}

function buildItemProgress(purchaseOrder, suratJalanList, invoiceList) {
  const deliveredByItem = new Map();
  const billedByItem = new Map();

  suratJalanList.forEach((suratJalan) => {
    (suratJalan?.barang || []).forEach((item) => {
      const key = itemKey(item?.nama, item?.spesifikasi, item?.unit);
      deliveredByItem.set(key, (deliveredByItem.get(key) || 0) + Number(item?.jumlah || 0));
    });
  });

  invoiceList.forEach((invoice) => {
    (invoice?.barang || []).forEach((item) => {
      const key = invoiceItemKey(item, suratJalanList);
      const billedQty = allocatedItemQuantity(purchaseOrder, suratJalanList, invoice, item);

      if (billedQty > 0) {
        billedByItem.set(key, (billedByItem.get(key) || 0) + billedQty);
      }
    });
  });

  return (purchaseOrder?.barang || []).map((item) => {
    const key = invoiceItemKey(item, suratJalanList);
    const orderedQty = Number(item?.kuantitas || 0);
    const deliveredQty = Math.min(deliveredByItem.get(key) || 0, orderedQty);
    const billedQty = Math.min(billedByItem.get(key) || 0, orderedQty);
    // Identical SO rows share a quantity pool instead of each claiming the same invoice units.
    deliveredByItem.set(key, Math.max((deliveredByItem.get(key) || 0) - deliveredQty, 0));
    billedByItem.set(key, Math.max((billedByItem.get(key) || 0) - billedQty, 0));

    return {
      namaBarang: item?.namaBarang,
      spesifikasi: item?.spesifikasi || "",
      unit: item?.unit,
      orderedQty,
      deliveredQty,
      billedQty,
      remainingDeliveryQty: Math.max(orderedQty - deliveredQty, 0),
      remainingBillingQty: Math.max(orderedQty - billedQty, 0),
    };
  });
}

function allocatedInvoiceAmount(purchaseOrder, suratJalanList, invoice) {
  const invoiceItems = invoice?.barang || [];
  // Legacy records without item details can only be compared by their own subtotal.
  if (!(purchaseOrder?.barang || []).length && invoiceItems.length === 0) {
    const keys = new Set(invoiceNoPoList(invoice).map(normalizeText));
    if (keys.size !== 1 || !keys.has(normalizeText(purchaseOrder?.noPo))) return 0;
    return Number(invoice?.subtotal ?? (Number(invoice?.grandTotal || 0) - Number(invoice?.ppnAmount || 0)));
  }
  // Allocation follows the SO column on each invoice line, independent of item labels
  // and of quantities already billed by another invoice. Keep the actual line value.
  return invoiceItems.reduce((total, item) => {
    const amount = Number(item?.jumlah || 0);
    if (!Number.isFinite(amount)) return total;
    return total + amount * allocatedItemShare(purchaseOrder, suratJalanList, invoice, item);
  }, 0);
}

function buildBillingSummary(purchaseOrder, suratJalanList, invoiceList, items) {
  const orderAmount = Number(purchaseOrder?.nominalPo || 0);
  const invoicedAmount = invoiceList.reduce(
    (total, invoice) => total + allocatedInvoiceAmount(purchaseOrder, suratJalanList, invoice),
    0
  );
  // Complete every ordered quantity; an expensive partial invoice cannot complete an SO.
  let isComplete = items.length > 0
    ? items.every((item) => item.orderedQty > 0 && item.remainingBillingQty <= 1e-8)
    : orderAmount > 0 && invoicedAmount + 1 >= orderAmount;
  if (items.length === 0 && orderAmount <= 0 && suratJalanList.length > 0) {
    const invoicedNumbers = new Set(invoiceList.flatMap((invoice) =>
      (invoice?.noSuratJalan || []).map(normalizeText)
    ));
    isComplete = suratJalanList.every((row) => invoicedNumbers.has(normalizeText(row?.noSuratJalan)));
  }
  return {
    orderAmount,
    invoicedAmount: Number(invoicedAmount.toFixed(2)),
    remainingAmount: Math.max(Number((orderAmount - invoicedAmount).toFixed(2)), 0),
    isComplete,
  };
}

function buildSalesOrderWorkflow(
  purchaseOrder,
  suratJalanList = [],
  invoiceList = [],
  { includeItems = false } = {}
) {
  const delivery = buildDeliverySummary(purchaseOrder, suratJalanList);
  const items = buildItemProgress(purchaseOrder, suratJalanList, invoiceList);
  const billing = buildBillingSummary(purchaseOrder, suratJalanList, invoiceList, items);
  const billingInvoices = invoiceList.filter((invoice) =>
    (invoice?.barang || []).some((item) => allocatedItemShare(purchaseOrder, suratJalanList, invoice, item) > 0) ||
    allocatedInvoiceAmount(purchaseOrder, suratJalanList, invoice) > 0
  );
  let automaticStatus = "toDeliver";

  if (billingInvoices.length > 0) {
    if (!billing.isComplete) {
      automaticStatus = "partlyBilled";
    } else if (billingInvoices.length > 0 && billingInvoices.every((invoice) => Boolean(invoice?.isPaid))) {
      automaticStatus = "paid";
    } else {
      automaticStatus = "billed";
    }
  } else if (suratJalanList.length > 0) {
    automaticStatus = delivery.isComplete ? "deliveredToBilled" : "partlyDelivered";
  }

  const workflowFingerprint = buildSalesOrderWorkflowFingerprint(
    purchaseOrder,
    suratJalanList,
    invoiceList
  );
  const manualStatus = String(purchaseOrder?.workflowStatusManual || "");
  const isManualStatus =
    salesOrderWorkflowStatuses.includes(manualStatus) &&
    Boolean(purchaseOrder?.workflowStatusManualFingerprint) &&
    purchaseOrder.workflowStatusManualFingerprint === workflowFingerprint;
  const status = isManualStatus ? manualStatus : automaticStatus;

  return {
    status,
    automaticStatus,
    isManualStatus,
    deliveryStatus: delivery.isComplete ? "complete" : suratJalanList.length > 0 ? "partial" : "notDelivered",
    billing,
    suratJalan: suratJalanList.map((row) => ({
      id: row?._id || row?.id,
      noSuratJalan: row?.noSuratJalan,
      tanggal: row?.tanggal,
    })),
    invoices: invoiceList.map((row) => ({
      id: row?._id || row?.id,
      noInvoice: row?.noInvoice,
      tanggal: row?.tanggal,
      isPaid: Boolean(row?.isPaid),
      allocatedAmount: Number(allocatedInvoiceAmount(purchaseOrder, suratJalanList, row).toFixed(2)),
    })),
    ...(includeItems
      ? { items }
      : {}),
  };
}

module.exports = {
  buildSalesOrderWorkflowFingerprint,
  buildSalesOrderWorkflow,
  indexSalesOrderRelations,
  salesOrderWorkflowStatuses,
};
