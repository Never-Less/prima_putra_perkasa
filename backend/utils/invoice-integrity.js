const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");
const { Invoice } = require("../models/Invoice");

const textKey = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const itemKey = (row) => [row.namaBarang || row.nama, row.spesifikasi, row.unit].map(textKey).join("::");
const add = (map, key, qty) => map.set(key, (map.get(key) || 0) + Number(qty || 0));
const orderKey = (noPo, item) => `${textKey(noPo)}|${itemKey(item)}`;
const deliveryKey = (number, item) => `${textKey(number)}|${itemKey(item)}`;
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

  for (const row of invoice.barang || []) {
    const qty = Number(row.kuantitas);
    if (!Number.isFinite(qty) || qty <= 0) return "Qty barang Invoice harus lebih besar dari 0.";
    if (row.sources?.length) {
      const sourceTotal = row.sources.reduce((total, source) => total + Number(source.kuantitas), 0);
      if (Math.abs(sourceTotal - qty) > 0.000001) return "Total qty sumber Surat Jalan harus sama dengan qty barang Invoice.";
      for (const source of row.sources) {
        const sj = deliveries.find((entry) => textKey(entry.noSuratJalan) === textKey(source.noSuratJalan));
        if (!sj || !selectedNumbers.includes(textKey(source.noSuratJalan)) || textKey(sj.noPo) !== textKey(source.noPo) || (source.suratJalanId && String(sj._id) !== source.suratJalanId)) {
          return "Sumber barang Invoice tidak sesuai dengan Surat Jalan yang dipilih.";
        }
        const sourceRow = sourceItem(sj, source, row);
        if (!sourceRow || !matchesSourceItem(sourceRow, row)) return "Barang sumber Invoice tidak ditemukan pada Surat Jalan.";
        if (source.barangId) {
          const key = `${sj._id}|${source.barangId}`;
          sourceLimits.set(key, Number(sourceRow.jumlah));
          add(requestedSources, key, source.kuantitas);
          if (requestedSources.get(key) > Number(sourceRow.jumlah) + 0.000001) return "Qty sumber Invoice melebihi qty barang Surat Jalan.";
        }
        add(requested, orderKey(source.noPo, sourceRow), source.kuantitas);
        add(requestedDelivery, deliveryKey(source.noSuratJalan, sourceRow), source.kuantitas);
      }
    } else {
      const noPo = textKey(row.noPoManual) || (noPoList.length === 1 ? noPoList[0] : "");
      if (!noPoList.includes(noPo)) return "Setiap barang Invoice harus memiliki sumber Sales Order yang jelas.";
      // Legacy/header-only SJ invoices must still consume their delivery allowance.
      const matches = deliveries.filter((sj) => selectedNumbers.includes(textKey(sj.noSuratJalan)) && textKey(sj.noPo) === noPo && sourceItem(sj, {}, row));
      if (selectedNumbers.length && matches.length !== 1) return "Pilih sumber Surat Jalan per barang sebelum menyimpan Invoice.";
      const canonical = matches.length === 1 ? sourceItem(matches[0], {}, row) : row;
      if (matches.length === 1) add(requestedDelivery, deliveryKey(matches[0].noSuratJalan, canonical), qty);
      add(requested, orderKey(noPo, canonical), qty);
    }
  }

  for (const key of requestedDelivery.keys()) {
    if (!shipped.has(key)) return "Barang Invoice tidak ditemukan pada Surat Jalan yang dipilih.";
  }
  const newOrderKeys = [...requested.keys()];
  const newDeliveryKeys = [...requestedDelivery.keys()];

  const previous = await Invoice.find({
    ...(excludeInvoiceId ? { _id: { $ne: excludeInvoiceId } } : {}),
    $or: [
      { noPoList: { $in: noPoList } }, { noPo: { $in: noPoList } },
      { "barang.noPoManual": { $in: noPoList } }, { "barang.sources.noPo": { $in: noPoList } },
      { noSuratJalan: { $in: selectedNumbers } },
    ],
  }).collation({ locale: "en", strength: 2 }).lean();
  for (const existing of previous) {
    for (const row of existing.barang || []) {
      const qty = Number(row.kuantitas || 0);
      if (row.sources?.length) {
        const total = row.sources.reduce((sum, source) => sum + Number(source.kuantitas || 0), 0);
        for (const source of row.sources) {
          const allocated = total > 0 ? qty * Number(source.kuantitas || 0) / total : qty;
          const sj = deliveries.find((entry) => textKey(entry.noSuratJalan) === textKey(source.noSuratJalan));
          const canonical = sourceItem(sj, source, row) || row;
          add(requested, orderKey(source.noPo, canonical), allocated);
          add(requestedDelivery, deliveryKey(source.noSuratJalan, canonical), allocated);
          if (source.barangId) {
            const sj = deliveries.find((entry) => textKey(entry.noSuratJalan) === textKey(source.noSuratJalan));
            if (sj) add(requestedSources, `${sj._id}|${source.barangId}`, allocated);
          }
        }
      } else {
        const refs = textKey(row.noPoManual) ? [textKey(row.noPoManual)] : references(existing);
        // Ambiguous legacy multi-SO lines conservatively reserve their qty on each
        // matching SO; they must be corrected before additional billing.
        const legacyDeliveries = deliveries.filter((sj) => (existing.noSuratJalan || []).some((number) => textKey(number) === textKey(sj.noSuratJalan)));
        refs.forEach((noPo) => {
          const canonical = legacyDeliveries.filter((sj) => textKey(sj.noPo) === noPo).map((sj) => sourceItem(sj, {}, row)).find(Boolean) || row;
          add(requested, orderKey(noPo, canonical), qty);
        });
        (existing.noSuratJalan || []).forEach((number) => {
          const sj = legacyDeliveries.find((entry) => textKey(entry.noSuratJalan) === textKey(number));
          add(requestedDelivery, deliveryKey(number, sourceItem(sj, {}, row) || row), qty);
        });
      }
    }
  }
  for (const key of newOrderKeys) {
    if (!ordered.has(key)) return "Barang Invoice tidak ditemukan pada Sales Order yang dipilih.";
    if (requested.get(key) > ordered.get(key) + 0.000001) return "Qty tagihan melebihi sisa Sales Order. Periksa Invoice yang sudah dibuat.";
  }
  for (const key of newDeliveryKeys) {
    const qty = requestedDelivery.get(key);
    if (shipped.has(key) && qty > shipped.get(key) + 0.000001) return "Qty tagihan melebihi sisa Surat Jalan. Periksa Invoice yang sudah dibuat.";
  }
  for (const [key, limit] of sourceLimits) {
    if (requestedSources.get(key) > limit + 0.000001) return "Barang sumber Surat Jalan sudah ditagih. Qty melebihi sisa yang dapat ditagih.";
  }
  return null;
}

module.exports = { validateInvoiceIntegrity, invoiceRelationQuery, deliveryInvoiceQuery };
