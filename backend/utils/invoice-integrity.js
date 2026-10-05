const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");
const { Invoice } = require("../models/Invoice");
const { decodeHtmlEntities } = require("./html-entities");

const textKey = (value) => decodeHtmlEntities(value).trim().toLowerCase().replace(/\s+/g, " ");
const itemKey = (row) => [row.namaBarang || row.nama, row.spesifikasi, row.unit].map(textKey).join("::");
const add = (map, key, qty) => map.set(key, (map.get(key) || 0) + Number(qty || 0));
const orderKey = (noPo, item) => `${textKey(noPo)}|${itemKey(item)}`;
const deliveryKey = (number, item) => `${textKey(number)}|${itemKey(item)}`;
const formatQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? String(Number(quantity.toFixed(6))) : String(value ?? "-");
};
const rowLocation = (rowIndex, row) => {
  const itemName = String(row?.namaBarang || row?.nama || "Barang").trim() || "Barang";
  return `Baris ${rowIndex + 1} (${itemName})`;
};
function trackRowLocation(map, key, rowIndex, row) {
  const current = map.get(key) || { rowNumbers: [], itemName: "" };
  const rowNumber = rowIndex + 1;

  if (!current.rowNumbers.includes(rowNumber)) {
    current.rowNumbers.push(rowNumber);
  }

  current.itemName = current.itemName || String(row?.namaBarang || row?.nama || "Barang").trim() || "Barang";
  map.set(key, current);
}
function trackedRowLocation(map, key) {
  const location = map.get(key);

  if (!location) {
    return "Barang Invoice";
  }

  return `Baris ${location.rowNumbers.join(", ")} (${location.itemName})`;
}
function sourceItem(sj, source, row) {
  return (sj?.barang || []).find((entry, index) => {
    if (source.barangId) return String(entry._id || entry.id || `legacy:${sj.noSuratJalan}:${index}`) === source.barangId;
    return matchesSourceItem(entry, row);
  });
}
function matchesSourceItem(entry, row) {
  const displaySpecification = [entry.spesifikasi, entry.kodeDepartemen].filter(Boolean).join(" - ");
  return textKey(entry.nama) === textKey(row.namaBarang) && textKey(entry.unit) === textKey(row.unit) &&
    [textKey(entry.spesifikasi), textKey(displaySpecification)].includes(textKey(row.spesifikasi));
}
const references = (invoice) => [...new Set([
  ...(invoice.noPoList?.length ? invoice.noPoList : String(invoice.noPo || "").split(",")),
  ...(invoice.barang || []).flatMap((row) => [row.noPoManual, ...(row.sources || []).map((source) => source.noPo)]),
].map(textKey).filter(Boolean))];

function invoiceRelationQuery(noPo) {
  return { $or: [{ noPo }, { noPoList: noPo }, { "barang.sources.noPo": noPo }, { "barang.noPoManual": noPo }] };
}
function deliveryInvoiceQuery(suratJalan) {
  return { $or: [
    { noSuratJalan: suratJalan.noSuratJalan },
    { "barang.sources.noSuratJalan": suratJalan.noSuratJalan },
    { "barang.sources.suratJalanId": String(suratJalan._id) },
  ] };
}

function mergeUsage(target, source) {
  for (const [key, quantity] of source) {
    add(target, key, quantity);
  }
}

function collectInvoiceUsage(invoice, deliveries) {
  const requested = new Map();
  const requestedDelivery = new Map();
  const requestedSources = new Map();

  for (const row of invoice?.barang || []) {
    const qty = Number(row.kuantitas || 0);

    if (row.sources?.length) {
      const total = row.sources.reduce((sum, source) => sum + Number(source.kuantitas || 0), 0);

      for (const source of row.sources) {
        const allocated = total > 0 ? qty * Number(source.kuantitas || 0) / total : qty;
        const sj = deliveries.find((entry) => textKey(entry.noSuratJalan) === textKey(source.noSuratJalan));
        const canonical = sourceItem(sj, source, row) || row;
        add(requested, orderKey(source.noPo, canonical), allocated);
        add(requestedDelivery, deliveryKey(source.noSuratJalan, canonical), allocated);

        if (source.barangId && sj) {
          add(requestedSources, `${sj._id}|${source.barangId}`, allocated);
        }
      }

      continue;
    }

    const refs = textKey(row.noPoManual) ? [textKey(row.noPoManual)] : references(invoice);
    const legacyDeliveries = deliveries.filter((sj) =>
      (invoice.noSuratJalan || []).some((number) => textKey(number) === textKey(sj.noSuratJalan))
    );

    refs.forEach((noPo) => {
      const canonical = legacyDeliveries
        .filter((sj) => textKey(sj.noPo) === noPo)
        .map((sj) => sourceItem(sj, {}, row))
        .find(Boolean) || row;
      add(requested, orderKey(noPo, canonical), qty);
    });
    (invoice.noSuratJalan || []).forEach((number) => {
      const sj = legacyDeliveries.find((entry) => textKey(entry.noSuratJalan) === textKey(number));
      add(requestedDelivery, deliveryKey(number, sourceItem(sj, {}, row) || row), qty);
    });
  }

  return { requested, requestedDelivery, requestedSources };
}

async function validateInvoiceIntegrity(invoice, excludeInvoiceId = null) {
  const duplicate = await Invoice.findOne({
    noInvoice: invoice.noInvoice,
    ...(excludeInvoiceId ? { _id: { $ne: excludeInvoiceId } } : {}),
  }).collation({ locale: "en", strength: 2 }).lean();
  if (duplicate) return "Nomor Invoice sudah digunakan.";
  const noPoList = [...new Set((invoice.noPoList || []).map(textKey))];
  const selectedNumbers = [...new Set((invoice.noSuratJalan || []).map(textKey))];
  const orders = await PurchaseOrder.find({ noPo: { $in: noPoList } }).collation({ locale: "en", strength: 2 }).lean();
  for (const noPo of noPoList) {
    const matching = orders.filter((row) => textKey(row.noPo) === noPo);
    if (!matching.length) return `Sales Order ${noPo} tidak ditemukan.`;
    if (matching.some((row) => String(row.namaCustomer) !== String(invoice.idCustomer))) {
      return "Customer Invoice harus sama dengan customer pada seluruh Sales Order yang dipilih.";
    }
  }
  const deliveries = await SuratJalan.find({ $or: [{ noPo: { $in: noPoList } }, { noSuratJalan: { $in: selectedNumbers } }] }).collation({ locale: "en", strength: 2 }).lean();
  for (const number of selectedNumbers) {
    const delivery = deliveries.find((row) => textKey(row.noSuratJalan) === number);
    if (!delivery || !noPoList.includes(textKey(delivery.noPo)) || String(delivery.idCustomer) !== String(invoice.idCustomer)) {
      return "Surat Jalan harus terhubung ke Sales Order dan customer Invoice yang dipilih.";
    }
  }

  const ordered = new Map();
  orders.forEach((so) => (so.barang || []).forEach((row) => add(ordered, orderKey(so.noPo, row), row.kuantitas)));
  const shipped = new Map();
  deliveries.forEach((sj) => (sj.barang || []).forEach((row) => add(shipped, deliveryKey(sj.noSuratJalan, row), row.jumlah)));
  const requested = new Map();
  const requestedDelivery = new Map();
  const requestedSources = new Map();
  const sourceLimits = new Map();
  const requestedRows = new Map();
  const requestedDeliveryRows = new Map();
  const requestedSourceRows = new Map();

  for (const [rowIndex, row] of (invoice.barang || []).entries()) {
    const qty = Number(row.kuantitas);
    const location = rowLocation(rowIndex, row);
    if (!Number.isFinite(qty) || qty <= 0) {
      return `${location}: kuantitas Invoice harus lebih besar dari 0 (nilai: ${formatQuantity(row.kuantitas)}).`;
    }
    if (row.sources?.length) {
      const sourceTotal = row.sources.reduce((total, source) => total + Number(source.kuantitas), 0);
      if (Math.abs(sourceTotal - qty) > 0.000001) {
        return `${location}: kuantitas Invoice ${formatQuantity(qty)} tidak sama dengan total kuantitas sumber Surat Jalan ${formatQuantity(sourceTotal)}.`;
      }
      for (const source of row.sources) {
        const sj = deliveries.find((entry) => textKey(entry.noSuratJalan) === textKey(source.noSuratJalan));
        if (!sj || !selectedNumbers.includes(textKey(source.noSuratJalan)) || textKey(sj.noPo) !== textKey(source.noPo) || (source.suratJalanId && String(sj._id) !== source.suratJalanId)) {
          return `${location}: sumber Surat Jalan ${source.noSuratJalan || "-"} tidak sesuai dengan Sales Order yang dipilih.`;
        }
        const sourceRow = sourceItem(sj, source, row);
        if (!sourceRow || !matchesSourceItem(sourceRow, row)) {
          return `${location}: barang sumber tidak ditemukan pada Surat Jalan ${source.noSuratJalan || "-"}.`;
        }
        if (source.barangId) {
          const key = `${sj._id}|${source.barangId}`;
          sourceLimits.set(key, Number(sourceRow.jumlah));
          add(requestedSources, key, source.kuantitas);
          trackRowLocation(requestedSourceRows, key, rowIndex, row);
        }
        const requestedKey = orderKey(source.noPo, sourceRow);
        const requestedDeliveryKey = deliveryKey(source.noSuratJalan, sourceRow);
        add(requested, requestedKey, source.kuantitas);
        add(requestedDelivery, requestedDeliveryKey, source.kuantitas);
        trackRowLocation(requestedRows, requestedKey, rowIndex, row);
        trackRowLocation(requestedDeliveryRows, requestedDeliveryKey, rowIndex, row);
      }
    } else {
      const noPo = textKey(row.noPoManual) || (noPoList.length === 1 ? noPoList[0] : "");
      if (!noPoList.includes(noPo)) return `${location}: sumber Sales Order belum jelas.`;
      // Legacy/header-only SJ invoices must still consume their delivery allowance.
      const matches = deliveries.filter((sj) => selectedNumbers.includes(textKey(sj.noSuratJalan)) && textKey(sj.noPo) === noPo && sourceItem(sj, {}, row));
      if (selectedNumbers.length && matches.length !== 1) {
        return `${location}: ditemukan ${matches.length} sumber Surat Jalan yang cocok; pastikan barang berasal dari tepat satu Surat Jalan.`;
      }
      const canonical = matches.length === 1 ? sourceItem(matches[0], {}, row) : row;
      if (matches.length === 1) {
        const requestedDeliveryKey = deliveryKey(matches[0].noSuratJalan, canonical);
        add(requestedDelivery, requestedDeliveryKey, qty);
        trackRowLocation(requestedDeliveryRows, requestedDeliveryKey, rowIndex, row);
      }
      const requestedKey = orderKey(noPo, canonical);
      add(requested, requestedKey, qty);
      trackRowLocation(requestedRows, requestedKey, rowIndex, row);
    }
  }

  const newOrderKeys = [...requested.keys()];
  const newDeliveryKeys = [...requestedDelivery.keys()];

  const [previous, existingInvoice] = await Promise.all([
    Invoice.find({
      ...(excludeInvoiceId ? { _id: { $ne: excludeInvoiceId } } : {}),
      $or: [
        { noPoList: { $in: noPoList } }, { noPo: { $in: noPoList } },
        { "barang.noPoManual": { $in: noPoList } }, { "barang.sources.noPo": { $in: noPoList } },
        { noSuratJalan: { $in: selectedNumbers } },
      ],
    }).collation({ locale: "en", strength: 2 }).lean(),
    excludeInvoiceId ? Invoice.findById(excludeInvoiceId).lean() : null,
  ]);
  const historicalRequested = new Map();
  const historicalRequestedDelivery = new Map();
  const historicalRequestedSources = new Map();

  for (const existing of previous) {
    const usage = collectInvoiceUsage(existing, deliveries);
    mergeUsage(requested, usage.requested);
    mergeUsage(requestedDelivery, usage.requestedDelivery);
    mergeUsage(requestedSources, usage.requestedSources);
    mergeUsage(historicalRequested, usage.requested);
    mergeUsage(historicalRequestedDelivery, usage.requestedDelivery);
    mergeUsage(historicalRequestedSources, usage.requestedSources);
  }

  if (existingInvoice) {
    const existingUsage = collectInvoiceUsage(existingInvoice, deliveries);
    mergeUsage(historicalRequested, existingUsage.requested);
    mergeUsage(historicalRequestedDelivery, existingUsage.requestedDelivery);
    mergeUsage(historicalRequestedSources, existingUsage.requestedSources);
  }

  for (const key of newOrderKeys) {
    const historicalLimit = historicalRequested.get(key) || 0;
    const location = trackedRowLocation(requestedRows, key);
    if (!ordered.has(key) && historicalLimit <= 0) {
      return `${location}: barang tidak ditemukan pada Sales Order yang dipilih.`;
    }
    const allowedQuantity = Math.max(ordered.get(key) || 0, historicalLimit);
    if (requested.get(key) > allowedQuantity + 0.000001) {
      return `${location}: total kuantitas tagihan ${formatQuantity(requested.get(key))} melebihi batas Sales Order ${formatQuantity(allowedQuantity)}. Periksa Invoice yang sudah dibuat.`;
    }
  }
  for (const key of newDeliveryKeys) {
    const qty = requestedDelivery.get(key);
    const historicalLimit = historicalRequestedDelivery.get(key) || 0;
    const location = trackedRowLocation(requestedDeliveryRows, key);
    if (!shipped.has(key) && historicalLimit <= 0) {
      return `${location}: barang tidak ditemukan pada Surat Jalan yang dipilih.`;
    }
    const allowedQuantity = Math.max(shipped.get(key) || 0, historicalLimit);
    if (qty > allowedQuantity + 0.000001) {
      return `${location}: total kuantitas tagihan ${formatQuantity(qty)} melebihi batas Surat Jalan ${formatQuantity(allowedQuantity)}. Periksa Invoice yang sudah dibuat.`;
    }
  }
  for (const [key, limit] of sourceLimits) {
    const allowedQuantity = Math.max(limit, historicalRequestedSources.get(key) || 0);
    if (requestedSources.get(key) > allowedQuantity + 0.000001) {
      const location = trackedRowLocation(requestedSourceRows, key);
      return `${location}: kuantitas sumber ${formatQuantity(requestedSources.get(key))} melebihi batas yang dapat ditagih ${formatQuantity(allowedQuantity)}.`;
    }
  }
  return null;
}

module.exports = { validateInvoiceIntegrity, invoiceRelationQuery, deliveryInvoiceQuery };
