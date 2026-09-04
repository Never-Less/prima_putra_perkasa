function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function itemKey(name, specification, unit) {
  return [name, specification, unit].map(normalizeText).join("::");
}

function invoiceNoPoList(invoice) {
  const source = Array.isArray(invoice?.noPoList)
    ? invoice.noPoList
    : String(invoice?.noPo || "").split(",");

  return source.map((value) => String(value || "").trim()).filter(Boolean);
}

function indexSalesOrderRelations(suratJalanList, invoiceList) {
  const suratJalanByNoPo = new Map();
  const invoiceByNoPo = new Map();

  suratJalanList.forEach((row) => {
    const key = normalizeText(row?.noPo);
    if (key) suratJalanByNoPo.set(key, [...(suratJalanByNoPo.get(key) || []), row]);
  });

  invoiceList.forEach((row) => {
    invoiceNoPoList(row).forEach((noPo) => {
      const key = normalizeText(noPo);
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
  const salesOrderKey = normalizeText(purchaseOrder?.noPo);
  const suratJalanIds = new Set(
    suratJalanList.map((row) => String(row?._id || row?.id || "").trim()).filter(Boolean)
  );
  const deliveredByItem = new Map();
  const billedByItem = new Map();

  suratJalanList.forEach((suratJalan) => {
    (suratJalan?.barang || []).forEach((item) => {
      const key = itemKey(item?.nama, item?.spesifikasi, item?.unit);
      deliveredByItem.set(key, (deliveredByItem.get(key) || 0) + Number(item?.jumlah || 0));
    });
  });

  invoiceList.forEach((invoice) => {
    const noPoKeys = new Set(invoiceNoPoList(invoice).map(normalizeText));

    (invoice?.barang || []).forEach((item) => {
      const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
      const sources = Array.isArray(item?.sources) ? item.sources : [];
      const linkedSources = sources.filter((source) => {
        const suratJalanId = String(source?.suratJalanId || "").trim();
        return (
          normalizeText(source?.noPo) === salesOrderKey ||
          suratJalanIds.has(suratJalanId)
        );
      });
      let billedQty = linkedSources.reduce(
        (total, source) => total + Number(source?.kuantitas || 0),
        0
      );

      // Invoice lama belum selalu memiliki sumber barang per Surat Jalan.
      if (
        billedQty === 0 &&
        sources.length === 0 &&
        (normalizeText(item?.noPoManual) === salesOrderKey ||
          (noPoKeys.size === 1 && noPoKeys.has(salesOrderKey)))
      ) {
        billedQty = Number(item?.kuantitas || 0);
      }

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
  const salesOrderKey = normalizeText(purchaseOrder?.noPo);
  const suratJalanIds = new Set(
    suratJalanList.map((row) => String(row?._id || row?.id || "").trim()).filter(Boolean)
  );
  const invoiceSalesOrderKeys = new Set(invoiceNoPoList(invoice).map(normalizeText));
  const grandTotal = Number(invoice?.grandTotal || 0);
  const subtotal = Number(invoice?.subtotal || 0);
  const comparableInvoiceAmount = subtotal > 0 ? subtotal : grandTotal;

  if (invoiceSalesOrderKeys.size === 1 && invoiceSalesOrderKeys.has(salesOrderKey)) {
    return comparableInvoiceAmount;
  }

  let allocatedSubtotal = 0;

  (invoice?.barang || []).forEach((item) => {
    const quantity = Number(item?.kuantitas || 0);
    const lineAmount = Number(item?.jumlah || 0);
    const sources = Array.isArray(item?.sources) ? item.sources : [];
    const linkedQuantity = sources.reduce((total, source) => {
      const suratJalanId = String(source?.suratJalanId || "").trim();
      const belongsToSalesOrder =
        normalizeText(source?.noPo) === salesOrderKey ||
        suratJalanIds.has(suratJalanId);

      return belongsToSalesOrder
        ? total + Number(source?.kuantitas || 0)
        : total;
    }, 0);

    if (linkedQuantity > 0 && quantity > 0) {
      allocatedSubtotal += lineAmount * Math.min(linkedQuantity / quantity, 1);
      return;
    }

    if (normalizeText(item?.noPoManual) === salesOrderKey) {
      allocatedSubtotal += lineAmount;
    }
  });

  if (allocatedSubtotal <= 0) return 0;
  return allocatedSubtotal;
}

function buildBillingSummary(purchaseOrder, suratJalanList, invoiceList) {
  const orderAmount = Number(purchaseOrder?.nominalPo || 0);
  const invoicedAmount = invoiceList.reduce(
    (total, invoice) => total + allocatedInvoiceAmount(purchaseOrder, suratJalanList, invoice),
    0
  );
  const tolerance = 1;

  return {
    orderAmount,
    invoicedAmount: Math.round(invoicedAmount),
    remainingAmount: Math.max(Math.round(orderAmount - invoicedAmount), 0),
    isComplete: orderAmount > 0 && invoicedAmount + tolerance >= orderAmount,
  };
}

function isBillingComplete(purchaseOrder, suratJalanList, invoiceList, billingSummary) {
  if (billingSummary.isComplete) return true;

  const salesOrderKey = normalizeText(purchaseOrder?.noPo);
  const suratJalanIds = new Set(
    suratJalanList.map((row) => String(row?._id || row?.id || "").trim()).filter(Boolean)
  );
  const billedByItem = new Map();
  let hasTrackedSources = false;

  invoiceList.forEach((invoice) => {
    (invoice?.barang || []).forEach((item) => {
      const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
      (item?.sources || []).forEach((source) => {
        const belongsToSalesOrder =
          normalizeText(source?.noPo) === salesOrderKey ||
          suratJalanIds.has(String(source?.suratJalanId || "").trim());
        if (!belongsToSalesOrder) return;
        hasTrackedSources = true;
        billedByItem.set(key, (billedByItem.get(key) || 0) + Number(source?.kuantitas || 0));
      });
    });
  });

  // Fallback untuk data lama tanpa nominal SO yang dapat dibandingkan.
  if (
    Number(purchaseOrder?.nominalPo || 0) <= 0 &&
    hasTrackedSources &&
    (purchaseOrder?.barang || []).length > 0
  ) {
    return purchaseOrder.barang.every((item) => {
      const key = itemKey(item?.namaBarang, item?.spesifikasi, item?.unit);
      return (billedByItem.get(key) || 0) >= Number(item?.kuantitas || 0);
    });
  }

  if (Number(purchaseOrder?.nominalPo || 0) > 0) return false;

  const invoicedNumbers = new Set(
    invoiceList.flatMap((invoice) => (invoice?.noSuratJalan || []).map(normalizeText))
  );
  return suratJalanList.every((row) => invoicedNumbers.has(normalizeText(row?.noSuratJalan)));
}

function buildSalesOrderWorkflow(
  purchaseOrder,
  suratJalanList = [],
  invoiceList = [],
  { includeItems = false } = {}
) {
  const delivery = buildDeliverySummary(purchaseOrder, suratJalanList);
  const billing = buildBillingSummary(purchaseOrder, suratJalanList, invoiceList);
  let status = "toDeliver";

  if (invoiceList.length > 0) {
    if (!isBillingComplete(purchaseOrder, suratJalanList, invoiceList, billing)) {
      status = "partlyBilled";
    } else if (invoiceList.every((invoice) => Boolean(invoice?.isPaid))) {
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
      ? { items: buildItemProgress(purchaseOrder, suratJalanList, invoiceList) }
      : {}),
  };
}

module.exports = {
  buildSalesOrderWorkflow,
  indexSalesOrderRelations,
};
