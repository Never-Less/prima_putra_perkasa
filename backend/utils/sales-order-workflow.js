function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function itemKey(name, specification, unit) {
  return [name, specification, unit].map(normalizeText).join("::");
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

function allocatedItemQuantity(purchaseOrder, suratJalanList, invoice, item) {
  const salesOrderKey = normalizeText(purchaseOrder?.noPo);
  const quantity = Math.max(0, Number(item?.kuantitas) || 0);
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
    // Never allocate more than the actual invoice quantity across its sources.
    return totalSourceQty > 0 ? linkedQty * Math.min(quantity / totalSourceQty, 1) : 0;
  }
  const manualNoPo = normalizeText(item?.noPoManual);
  if (manualNoPo) return manualNoPo === salesOrderKey ? quantity : 0;
  const keys = new Set(invoiceNoPoList(invoice).map(normalizeText));
  return keys.size === 1 && keys.has(salesOrderKey) ? quantity : 0;
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
    return (deliveredByItem.get(key) || 0) >= Number(item?.kuantitas || 0);
  }).length;

  return {
    deliveredItems,
    totalItems: orderedItems.length,
    isComplete:
      suratJalanList.length > 0 &&
      (orderedItems.length > 0
        ? deliveredItems === orderedItems.length
        : suratJalanList.some((row) => row?.tipe === "non partial")),
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
      const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
      const billedQty = allocatedItemQuantity(purchaseOrder, suratJalanList, invoice, item);

      if (billedQty > 0) {
        billedByItem.set(key, (billedByItem.get(key) || 0) + billedQty);
      }
    });
  });

  return (purchaseOrder?.barang || []).map((item) => {
    const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
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

function allocatedInvoiceAmount(purchaseOrder, suratJalanList, invoice, remainingQuantities) {
  const orderedKeys = new Set((purchaseOrder?.barang || []).map((item) =>
    itemKey(item?.namaBarang, item?.spesifikasi, item?.unit)
  ));
  const invoiceItems = invoice?.barang || [];
  // Legacy records without item details can only be compared by their own subtotal.
  if (orderedKeys.size === 0 && invoiceItems.length === 0) {
    const keys = new Set(invoiceNoPoList(invoice).map(normalizeText));
    if (keys.size !== 1 || !keys.has(normalizeText(purchaseOrder?.noPo))) return 0;
    return Number(invoice?.subtotal ?? (Number(invoice?.grandTotal || 0) - Number(invoice?.ppnAmount || 0)));
  }
  return invoiceItems.reduce((total, item) => {
    const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
    if (orderedKeys.size > 0 && !orderedKeys.has(key)) return total;
    const quantity = Number(item?.kuantitas || 0);
    if (quantity <= 0) return total;
    const availableQuantity = allocatedItemQuantity(purchaseOrder, suratJalanList, invoice, item);
    const linkedQuantity = orderedKeys.size > 0
      ? Math.min(availableQuantity, remainingQuantities.get(key) || 0)
      : availableQuantity;
    if (orderedKeys.size > 0) remainingQuantities.set(key, (remainingQuantities.get(key) || 0) - linkedQuantity);
    return total + Number(item?.jumlah || 0) * linkedQuantity / quantity;
  }, 0);
}

function buildBillingSummary(purchaseOrder, suratJalanList, invoiceList, items) {
  const orderAmount = Number(purchaseOrder?.nominalPo || 0);
  const remainingQuantities = new Map();
  (purchaseOrder?.barang || []).forEach((item) => {
    const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
    remainingQuantities.set(key, (remainingQuantities.get(key) || 0) + Number(item?.kuantitas || 0));
  });
  const invoicedAmount = invoiceList.reduce(
    (total, invoice) => total + allocatedInvoiceAmount(purchaseOrder, suratJalanList, invoice, remainingQuantities),
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
    invoicedAmount: Math.round(invoicedAmount),
    remainingAmount: Math.max(Math.round(orderAmount - invoicedAmount), 0),
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
  const orderedKeys = new Set((purchaseOrder?.barang || []).map((item) =>
    itemKey(item?.namaBarang, item?.spesifikasi, item?.unit)
  ));
  const billingInvoices = orderedKeys.size === 0 ? invoiceList : invoiceList.filter((invoice) =>
    (invoice?.barang || []).some((item) =>
      orderedKeys.has(itemKey(item?.namaBarang, item?.spesifikasi, item?.unit)) &&
      allocatedItemQuantity(purchaseOrder, suratJalanList, invoice, item) > 0
    )
  );
  let status = "toDeliver";

  if (invoiceList.length > 0) {
    if (!billing.isComplete) {
      status = "partlyBilled";
    } else if (billingInvoices.length > 0 && billingInvoices.every((invoice) => Boolean(invoice?.isPaid))) {
      status = "paid";
    } else {
      status = "billed";
    }
  } else if (suratJalanList.length > 0) {
    status = delivery.isComplete ? "deliveredToBilled" : "partlyDelivered";
  }

  return {
    status,
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
    })),
    ...(includeItems
      ? { items }
      : {}),
  };
}

module.exports = {
  buildSalesOrderWorkflow,
  indexSalesOrderRelations,
};
