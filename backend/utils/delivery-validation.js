const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");

function key(name, specification, unit) {
  return [name, specification, unit].map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ")).join("::");
}

async function validateDeliveryAgainstSalesOrder({ noPo, customerId, barang, excludeSuratJalanId = null }) {
  const salesOrder = await PurchaseOrder.findOne({ noPo }).collation({ locale: "en", strength: 2 }).lean();
  if (!salesOrder) return "Sales Order tidak ditemukan. Pilih Sales Order yang masih tersedia sebelum menyimpan Surat Jalan.";
  if (String(salesOrder.namaCustomer || "") !== String(customerId || "")) {
    return "Customer Surat Jalan harus sama dengan customer pada Sales Order.";
  }
  const query = { noPo: salesOrder.noPo };
  if (excludeSuratJalanId) query._id = { $ne: excludeSuratJalanId };
  const previous = await SuratJalan.find(query).select("barang").lean();
  const ordered = new Map();
  for (const row of salesOrder.barang || []) {
    const itemKey = key(row.namaBarang, row.spesifikasi, row.unit);
    ordered.set(itemKey, (ordered.get(itemKey) || 0) + Number(row.kuantitas || 0));
  }
  const delivered = new Map();
  previous.flatMap((row) => row.barang || []).forEach((row) => {
    const itemKey = key(row.nama, row.spesifikasi, row.unit);
    delivered.set(itemKey, (delivered.get(itemKey) || 0) + Number(row.jumlah || 0));
  });
  for (const row of barang || []) {
    const itemKey = key(row.nama, row.spesifikasi, row.unit);
    if (!ordered.has(itemKey)) return `Barang "${row.nama}" tidak ditemukan pada Sales Order ${salesOrder.noPo}.`;
    const total = (delivered.get(itemKey) || 0) + Number(row.jumlah || 0);
    if (total > ordered.get(itemKey)) return `Jumlah kirim "${row.nama}" melebihi sisa Sales Order. Maksimal total ${ordered.get(itemKey)} ${row.unit}.`;
    delivered.set(itemKey, total);
  }
  return null;
}

module.exports = { validateDeliveryAgainstSalesOrder };
