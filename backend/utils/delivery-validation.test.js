const test = require("node:test");
const assert = require("node:assert/strict");
const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");
const { validateDeliveryAgainstSalesOrder: validate } = require("./delivery-validation");

const name = 'SHOCK DRAT DALAM PVC 1"';
const ordered = (kuantitas, extra = {}) => ({ namaBarang: name, spesifikasi: "", unit: "PCS", kuantitas, ...extra });
const shipped = (jumlah, extra = {}) => ({ nama: name, spesifikasi: "", unit: "PCS", jumlah, ...extra });
const request = (barang, extra = {}) => ({ noPo: "SO-TEST", customerId: "customer-1", barang, ...extra });

function database(t, items, deliveries = []) {
  const state = { order: { noPo: "SO-TEST", namaCustomer: "customer-1", barang: items }, deliveries };
  t.mock.method(PurchaseOrder, "findOne", ({ noPo }) => {
    assert.equal(noPo, "SO-TEST");
    return { collation: () => ({ lean: async () => state.order }) };
  });
  t.mock.method(SuratJalan, "find", (query) => ({
    select: () => ({ lean: async () => state.deliveries.filter((row) =>
      row.noPo === query.noPo && row._id !== query._id?.$ne
    ) }),
  }));
  return state;
}

test("identical SO rows share their total quantity, including normalized names and units", async (t) => {
  database(t, [ordered(8), ordered(12, { namaBarang: `  ${name.toLowerCase()}  `, unit: "pcs" })]);
  assert.equal(await validate(request([shipped(20)])), null);
  assert.equal(await validate(request([shipped(8), shipped(12)])), null);
  assert.match(await validate(request([shipped(21)])), /Maksimal total 20 PCS/);
});

test("existing deliveries and repeated rows in a new SJ cannot exceed the combined SO total", async (t) => {
  database(t, [ordered(8), ordered(12)], [{ _id: "old", noPo: "SO-TEST", barang: [shipped(5)] }]);
  assert.equal(await validate(request([shipped(15)])), null);
  assert.match(await validate(request([shipped(8), shipped(8)])), /melebihi sisa/);
});

test("deleting an SJ and revising the SO uses only current documents", async (t) => {
  const state = database(t, [ordered(12)], [{ _id: "old", noPo: "SO-TEST", barang: [shipped(12)] }]);
  assert.match(await validate(request([shipped(12)])), /melebihi sisa/);
  state.deliveries = [];
  state.order.barang = [ordered(8), ordered(12)];
  assert.equal(await validate(request([shipped(20)])), null);
  state.order.barang = [ordered(10)];
  assert.match(await validate(request([shipped(12)])), /Maksimal total 10 PCS/);
});

test("editing an SJ excludes itself but still counts other deliveries", async (t) => {
  database(t, [ordered(12)], [
    { _id: "editing", noPo: "SO-TEST", barang: [shipped(8)] },
    { _id: "other", noPo: "SO-TEST", barang: [shipped(4)] },
  ]);
  assert.equal(await validate(request([shipped(8)], { excludeSuratJalanId: "editing" })), null);
  assert.match(await validate(request([shipped(9)], { excludeSuratJalanId: "editing" })), /melebihi sisa/);
});

test("different specifications or units do not contribute to the same delivery allowance", async (t) => {
  database(t, [ordered(12), ordered(20, { spesifikasi: "Heavy duty" }), ordered(30, { unit: "BOX" })]);
  assert.match(await validate(request([shipped(13)])), /Maksimal total 12 PCS/);
  assert.match(await validate(request([shipped(1, { spesifikasi: "Unknown" })])), /tidak ditemukan/);
});

test("customer validation remains enforced", async (t) => {
  database(t, [ordered(12)]);
  assert.match(await validate(request([shipped(12)], { customerId: "other-customer" })), /Customer Surat Jalan harus sama/);
});

test("a missing or deleted SO cannot receive a new SJ", async (t) => {
  const state = database(t, [ordered(12)]);
  state.order = null;
  assert.match(await validate(request([shipped(12)])), /Sales Order tidak ditemukan/);
});
