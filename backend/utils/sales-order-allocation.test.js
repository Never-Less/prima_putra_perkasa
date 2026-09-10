const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSalesOrderWorkflow: build } = require("./sales-order-workflow");

const line = (name, quantity, price, extra = {}) => ({
  namaBarang: name, spesifikasi: "", unit: "PCS", kuantitas: quantity,
  hargaSatuan: price, jumlah: quantity * price, ...extra,
});
const order = (noPo, barang) => ({ noPo, barang, nominalPo: barang.reduce((sum, row) => sum + row.jumlah, 0) });
const invoice = (number, noPoList, barang, extra = {}) => ({
  noInvoice: number, noPoList, barang, isPaid: false, ...extra,
});

test("26004473: two invoices allocate 3,544,000 before VAT and all 13 items are billed", () => {
  const prices = [[5, 18000], [1, 1100000], [1, 165000], [1, 165000], [1, 135000], [1, 170000], [10, 11000], [1, 39000], [24, 25000], [1, 85000], [1, 140000], [1, 75000]];
  const others = prices.map(([qty, price], index) => line(`Item ${index + 1}`, qty, price));
  const oil = line("OLI HELIEX DIESEL R4 15W-40 RIMULA", 10, 67000, { unit: "LTR" });
  const so = order("26004473", [...others, oil]);
  const sj = { _id: "oil-sj", noPo: so.noPo, noSuratJalan: "PP/0926/3290", barang: [{ _id: "oil-item", nama: oil.namaBarang, spesifikasi: "", kodeDepartemen: "DM 390", unit: oil.unit, jumlah: 10 }] };
  const invoices = [
    invoice("B0926/2653", [so.noPo], others.map((row) => ({ ...row, noPoManual: so.noPo })), { subtotal: 2874000, grandTotal: 3190140, ppnAmount: 316140 }),
    invoice("B0926/2668", [so.noPo], [{ ...oil, spesifikasi: "DM 390", noPoManual: so.noPo, sources: [{ noPo: so.noPo, suratJalanId: sj._id, noSuratJalan: sj.noSuratJalan, barangId: "oil-item", kuantitas: 10 }] }], { subtotal: 670000, grandTotal: 743700, ppnAmount: 73700 }),
  ];
  const result = build(so, [sj], invoices, { includeItems: true });
  assert.equal(result.billing.orderAmount, 3544000);
  assert.equal(result.billing.invoicedAmount, 3544000);
  assert.equal(result.billing.remainingAmount, 0);
  assert.equal(result.status, "billed");
  assert.ok(result.items.every((item) => item.remainingBillingQty === 0));
  assert.deepEqual(result.invoices.map((row) => row.allocatedAmount), [2874000, 670000]);
});

test("explicit SO on an invoice line allocates its total despite different labels/specifications", () => {
  const so = order("A", [line("Cable", 10, 100)]);
  const bill = invoice("INV", ["A", "B"], [
    line("Renamed cable", 10, 100, { spesifikasi: "DM 390", noPoManual: "A" }),
    line("Cable", 10, 100, { noPoManual: "B" }),
    line("Unassigned", 10, 100),
  ], { subtotal: 3000, grandTotal: 3330 });
  assert.equal(build(so, [], [bill]).billing.invoicedAmount, 1000);
});

test("all linked invoice line values are summed without hiding excess quantities", () => {
  const so = order("A", [line("Cable", 10, 100)]);
  const invoices = [
    invoice("1", ["A"], [line("Cable", 8, 100, { noPoManual: "A" })]),
    invoice("2", ["A"], [line("Cable", 4, 120, { noPoManual: "A" })]),
  ];
  const result = build(so, [], invoices);
  assert.equal(result.billing.invoicedAmount, 1280);
  assert.deepEqual(result.invoices.map((row) => row.allocatedAmount), [800, 480]);
  assert.equal(build(so, [], [...invoices].reverse()).billing.invoicedAmount, 1280);
});

test("merged SO line amounts sum to their full line total using source proportions", () => {
  const bill = invoice("INV", ["A", "B"], [line("Combined description", 10, 100, {
    sources: [{ noPo: "A", kuantitas: 2 }, { noPo: "B", kuantitas: 3 }],
  })]);
  const a = build(order("A", [line("A original", 4, 100)]), [], [bill]);
  const b = build(order("B", [line("B original", 6, 100)]), [], [bill]);
  assert.equal(a.billing.invoicedAmount, 400);
  assert.equal(b.billing.invoicedAmount, 600);
});

test("header-only association with lines assigned to another SO does not start billing", () => {
  const bill = invoice("INV", ["A", "B"], [line("Cable", 10, 100, { noPoManual: "B" })]);
  const result = build(order("A", [line("Cable", 10, 100)]), [], [bill]);
  assert.equal(result.billing.invoicedAmount, 0);
  assert.equal(result.status, "toDeliver");
});

test("line amount changes and deleted invoices are reflected without retaining old allocations", () => {
  const so = order("A", [line("Cable", 10, 100)]);
  const first = invoice("1", ["A"], [line("Cable", 4, 100, { noPoManual: "A" })]);
  const second = invoice("2", ["A"], [line("Cable", 6, 100, { noPoManual: "A" })]);
  assert.equal(build(so, [], [first, second]).billing.invoicedAmount, 1000);
  second.barang[0].jumlah = 500;
  assert.equal(build(so, [], [first, second]).billing.invoicedAmount, 900);
  const afterDelete = build(so, [], [first]);
  assert.equal(afterDelete.billing.invoicedAmount, 400);
  assert.equal(afterDelete.billing.remainingAmount, 600);
  assert.equal(afterDelete.status, "partlyBilled");
});

test("invoice allocation retains decimal line totals", () => {
  const so = order("A", [line("Cable", 2, 0.5)]);
  const bill = invoice("INV", ["A"], [line("Cable", 1, 0.25), line("Cable", 1, 0.5)]);
  const result = build(so, [], [bill]);
  assert.equal(result.billing.invoicedAmount, 0.75);
  assert.equal(result.billing.remainingAmount, 0.25);
});
