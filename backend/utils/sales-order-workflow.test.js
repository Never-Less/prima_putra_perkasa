const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSalesOrderWorkflow: build,
  buildSalesOrderWorkflowFingerprint,
  indexSalesOrderRelations,
} = require("./sales-order-workflow");

const item = (namaBarang, kuantitas, jumlah, extra = {}) => ({ namaBarang, spesifikasi: "", unit: "METER", kuantitas, jumlah, ...extra });
const order = (noPo, barang, nominalPo = barang.reduce((sum, row) => sum + row.jumlah, 0)) => ({ noPo, barang, nominalPo });
const invoice = (noPoList, barang, extra = {}) => ({ noPoList, barang, isPaid: false, ...extra });
const workflow = (so, invoices) => build(so, [], invoices, { includeItems: true });

test("72260002282: allocation includes all invoice lines tagged with that SO number", () => {
  const cables = [item("KABEL", 250, 171250000, { spesifikasi: "NYY 5 X 35MM² SUPREME" }), item("KABEL", 200, 28000000, { spesifikasi: "NYY 5 X 6MM² SUPREME" })];
  const burst = item("BURST TESTER", 10, 2500000, { unit: "PIECE" });
  const bill = invoice(["72260002282"], [...cables, burst].map((row) => ({ ...row, sources: [{ noPo: "72260002282", kuantitas: row.kuantitas }] })), { subtotal: 201750000, grandTotal: 223942500 });
  const cableResult = workflow(order("72260002282", cables), [bill]);
  assert.equal(cableResult.billing.invoicedAmount, 201750000);
  assert.equal(cableResult.billing.remainingAmount, 0);
  assert.equal(cableResult.status, "billed");
  assert.deepEqual(cableResult.items.map((row) => row.remainingBillingQty), [0, 0]);
  assert.equal(workflow(order("72260002282", [burst]), [bill]).billing.invoicedAmount, 201750000);
});

test("multiple SO and SJ in a merged invoice line allocate quantities and money proportionally", () => {
  const bill = invoice(["A", "B"], [item("Cable", 10, 1000, { sources: [{ noPo: "A", suratJalanId: "1", kuantitas: 2 }, { noPo: "A", suratJalanId: "2", kuantitas: 4 }, { noPo: "B", suratJalanId: "3", kuantitas: 4 }] })]);
  const a = workflow(order("A", [item("Cable", 6, 600)]), [bill]);
  const b = workflow(order("B", [item("Cable", 4, 400)]), [bill]);
  assert.equal(a.billing.invoicedAmount, 600);
  assert.equal(b.billing.invoicedAmount, 400);
  assert.equal(a.status, "billed");
  assert.equal(b.status, "billed");
});

test("partial quantities stay partly billed even when invoice value meets SO total", () => {
  const result = workflow(order("A", [item("Cable", 10, 1000)]), [invoice(["A"], [item("Cable", 5, 1000)])]);
  assert.equal(result.status, "partlyBilled");
  assert.equal(result.billing.isComplete, false);
  assert.equal(result.items[0].remainingBillingQty, 5);
});

test("complete quantities can be billed at a different price; paid requires paid invoices", () => {
  const so = order("A", [item("Cable", 10, 1000)]);
  const bills = [invoice(["A"], [item("Cable", 4, 300)], { isPaid: true }), invoice(["A"], [item("Cable", 6, 500)], { isPaid: true })];
  assert.equal(workflow(so, bills).status, "paid");
  assert.equal(workflow(so, bills).billing.isComplete, true);
});

test("duplicate SO item rows cannot both consume the same billed quantity", () => {
  const result = workflow(order("A", [item("Cable", 5, 500), item("Cable", 5, 500)]), [invoice(["A"], [item("Cable", 5, 500)])]);
  assert.deepEqual(result.items.map((row) => row.billedQty), [5, 0]);
  assert.equal(result.status, "partlyBilled");
});

test("ambiguous multi-SO lines have no allocation; explicit source wins over manual fallback", () => {
  const so = order("A", [item("Cable", 10, 1000)]);
  assert.equal(workflow(so, [invoice(["A", "B"], [item("Cable", 10, 1000)])]).billing.invoicedAmount, 0);
  assert.equal(workflow(so, [invoice(["A", "B"], [item("Cable", 10, 1000, { noPoManual: "A", sources: [{ noPo: "B", kuantitas: 10 }] })])]).billing.invoicedAmount, 0);
});

test("source quantities cannot exceed actual invoice quantities", () => {
  const bill = invoice(["A", "B"], [item("Cable", 10, 1000, { sources: [{ noPo: "A", kuantitas: 10 }, { noPo: "B", kuantitas: 10 }] })]);
  const result = workflow(order("A", [item("Cable", 10, 1000)]), [bill]);
  assert.equal(result.items[0].billedQty, 5);
  assert.equal(result.billing.invoicedAmount, 500);
  assert.equal(result.status, "partlyBilled");
});

test("relations include source-only and manual PO references and legacy empty headers", () => {
  const bill = { noPo: "A", noPoList: [], barang: [item("Cable", 1, 100, { sources: [{ noPo: "B", kuantitas: 1 }], noPoManual: "C" })] };
  const relations = indexSalesOrderRelations([], [bill]);
  for (const key of ["a", "b", "c"]) assert.equal(relations.invoiceByNoPo.get(key).length, 1);
});

test("legacy monetary fallback stays before VAT; empty records are not complete", () => {
  const result = workflow(order("A", [], 1000), [invoice(["A"], [], { grandTotal: 1110, ppnAmount: 110 })]);
  assert.equal(result.billing.invoicedAmount, 1000);
  assert.equal(result.status, "billed");
  assert.equal(workflow(order("A", [], 0), []).billing.isComplete, false);
});

test("allocation follows the SO number without capping its invoice value to ordered quantities", () => {
  const first = order("A", [item("Cable", 1, 100)]);
  const second = order("A", [item("Cable", 4, 400), item("Cable", 5, 500)]);
  const bills = [invoice(["A"], [item("Cable", 10, 1000)])];
  const a = build(first, [], bills, { includeItems: true });
  const b = build(second, [], bills, { includeItems: true });
  assert.equal(a.billing.invoicedAmount, 1000);
  assert.equal(b.billing.invoicedAmount, 1000);
  assert.deepEqual(b.items.map((row) => row.billedQty), [4, 5]);
  assert.equal(a.status, "billed");
  assert.equal(b.status, "billed");
});

test("every invoice allocated to the SO must be paid, even when its item label differs", () => {
  const result = workflow(order("A", [item("Cable", 1, 100)]), [
    invoice(["A"], [item("Cable", 1, 100)], { isPaid: true }),
    invoice(["A"], [item("Other", 1, 100)]),
  ]);
  assert.equal(result.billing.invoicedAmount, 200);
  assert.equal(result.status, "billed");
});

test("case variants of a relation do not count an invoice twice", () => {
  const bill = invoice(["A"], [item("Cable", 1, 100, { noPoManual: "a" })]);
  assert.equal(indexSalesOrderRelations([], [bill]).invoiceByNoPo.get("a").length, 1);
});

test("manual status expires when automatic workflow data changes", () => {
  const so = order("A", [item("Cable", 10, 1000)]);
  so.workflowStatusManual = "paid";
  so.workflowStatusManualFingerprint = buildSalesOrderWorkflowFingerprint(so, [], []);

  const manualResult = build(so, [], []);
  assert.equal(manualResult.status, "paid");
  assert.equal(manualResult.automaticStatus, "toDeliver");
  assert.equal(manualResult.isManualStatus, true);

  const deliveryNotes = [{
    _id: "sj-1",
    noPo: "A",
    noSuratJalan: "SJ-1",
    barang: [{ nama: "Cable", spesifikasi: "", unit: "METER", jumlah: 10 }],
  }];
  const automaticResult = build(so, deliveryNotes, []);

  assert.equal(automaticResult.status, "deliveredToBilled");
  assert.equal(automaticResult.automaticStatus, "deliveredToBilled");
  assert.equal(automaticResult.isManualStatus, false);
});
