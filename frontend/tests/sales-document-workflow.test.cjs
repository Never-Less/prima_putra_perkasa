/* eslint-disable @typescript-eslint/no-require-imports */
// HTTP integration QA: real routers, auth, schemas and frontend converters.
// Default: persistence is replaced. QA_REAL_DB=1 uses a newly named QA database.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { randomBytes } = require("node:crypto");
const ts = require("typescript");
const express = require("../../backend/node_modules/express");
const { PurchaseOrder } = require("../../backend/models/PurchaseOrder");
const { SuratJalan } = require("../../backend/models/SuratJalan");
const { Invoice } = require("../../backend/models/Invoice");
const { Customer } = require("../../backend/models/Customer");
const { User } = require("../../backend/models/User");
const { signAccessToken } = require("../../backend/utils/jwt");
const { createCsrfProtection } = require("../../backend/middlewares/csrf");

require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
const { buildInvoiceBarangRowsFromSuratJalanSelection: selectInvoice, invoiceBarangRowsToList } = require("../src/app/invoice/_lib/invoice.ts");
const { buildSuratJalanBarangRowsFromNoPoOption, barangRowsToList } = require("../src/app/suratJalan/_lib/surat-jalan.ts");
const customerId = "000000000000000000000001";
const otherCustomerId = "000000000000000000000002";
const user = { _id: "000000000000000000000003", username: "isolated-qa", role: "admin" };
const origin = "http://localhost:3000";
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const realDatabase = process.env.QA_REAL_DB === "1";
const mongoose = require("../../backend/node_modules/mongoose");
const qaDatabaseName = `ppp_qa_workflow_${Date.now()}_${randomBytes(3).toString("hex")}`;
before(async () => {
  if (!realDatabase) return;
  const path = require("node:path");
  const uri = process.env.QA_MONGODB_URI || require("../../backend/node_modules/dotenv")
    .parse(fs.readFileSync(path.join(__dirname, "../../backend/.env"))).MONGODB_URI;
  assert.ok(uri, "MongoDB configuration missing");
  await mongoose.connect(uri, { dbName: qaDatabaseName, serverSelectionTimeoutMS: 10000 });
  assert.equal(mongoose.connection.name, qaDatabaseName);
  await Promise.all([PurchaseOrder, SuratJalan, Invoice, Customer, User].map((Model) => Model.init()));
  console.log(`QA database: ${qaDatabaseName}`);
});
after(async () => { if (realDatabase) await mongoose.disconnect(); });

function valuesAt(value, path) {
  if (Array.isArray(value)) return value.flatMap((entry) => valuesAt(entry, path));
  if (!path.length) return [value];
  return valuesAt(value?.[path[0]], path.slice(1));
}
function matches(row, filter, insensitive = false) {
  return Object.entries(filter).every(([key, wanted]) => {
    if (key === "$or") return wanted.some((part) => matches(row, part, insensitive));
    const values = valuesAt(row, key.split("."));
    const equal = (a, b) => insensitive ? String(a).toLowerCase() === String(b).toLowerCase() : String(a) === String(b);
    if (wanted && typeof wanted === "object") {
      return Object.entries(wanted).every(([operator, operand]) => {
        if (operator === "$ne") return values.every((value) => !equal(value, operand));
        if (operator === "$exists") return values.some((value) => value !== undefined) === operand;
        if (operator === "$in") return values.some((value) => operand.some((entry) => equal(value, entry)));
        throw new Error(`Unsupported QA query operator: ${operator}`);
      });
    }
    return values.some((value) => equal(value, wanted));
  });
}
function memoryModel(t, Model) {
  const rows = [];
  function query(filter = {}, single = false) {
    let insensitive = false;
    let sorting = {};
    const result = () => {
      const found = rows.filter((row) => matches(row, filter, insensitive)).sort((a, b) => {
        for (const [key, direction] of Object.entries(sorting)) {
          if (a[key] !== b[key]) return (a[key] > b[key] ? 1 : -1) * direction;
        }
        return 0;
      });
      const value = clone(single ? found[0] || null : found);
      if (single && value) Object.defineProperty(value, "toObject", { value: () => clone(value) });
      return value;
    };
    return {
      collation() { insensitive = true; return this; },
      select() { return this; },
      sort(value) { sorting = value; return this; },
      lean: async () => result(),
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
  }
  t.mock.method(Model, "find", (filter) => query(filter));
  t.mock.method(Model, "findOne", (filter) => query(filter, true));
  t.mock.method(Model, "findById", (id) => query({ _id: id }, true));
  t.mock.method(Model, "countDocuments", (filter) => ({
    collation() { return this; },
    then(resolve, reject) { return Promise.resolve(rows.filter((row) => matches(row, filter, true)).length).then(resolve, reject); },
  }));
  t.mock.method(Model, "create", async (input) => {
    const document = new Model(input);
    await document.validate();
    rows.push(clone(document.toObject()));
    return document;
  });
  t.mock.method(Model, "updateMany", async (filter, update) => {
    const found = rows.filter((row) => matches(row, filter));
    found.forEach((row) => Object.assign(row, clone(update.$set)));
    return { matchedCount: found.length };
  });
  t.mock.method(Model, "findByIdAndUpdate", async (id, update) => {
    const index = rows.findIndex((row) => row._id === String(id));
    if (index < 0) return null;
    const document = new Model({ ...rows[index], ...update });
    await document.validate();
    rows[index] = clone(document.toObject());
    return document;
  });
  t.mock.method(Model, "findByIdAndDelete", async (id) => {
    const index = rows.findIndex((row) => row._id === String(id));
    return index < 0 ? null : rows.splice(index, 1)[0];
  });
}
async function setup(t) {
  if (realDatabase) {
    // Clear only the database generated for this run; never use the URI's default DB.
    assert.match(qaDatabaseName, /^ppp_qa_workflow_\d+_[a-f0-9]{6}$/);
    assert.equal(mongoose.connection.name, qaDatabaseName);
    await Promise.all([PurchaseOrder, SuratJalan, Invoice, Customer, User].map((Model) => Model.deleteMany({})));
    await Customer.create([
      { _id: customerId, nama: "QA Customer A", alamat: "QA only", atasNama: "QA A" },
      { _id: otherCustomerId, nama: "QA Customer B", alamat: "QA only", atasNama: "QA B" },
    ]);
    await User.create({ ...user, password: randomBytes(24).toString("hex") });
  } else {
    const { DocumentWorkflowLock } = require("../../backend/utils/document-mutation");
    t.mock.method(DocumentWorkflowLock, "updateOne", async () => ({ matchedCount: 1 }));
    t.mock.method(mongoose.connection, "transaction", async (callback) => callback());
    for (const Model of [PurchaseOrder, SuratJalan, Invoice]) memoryModel(t, Model);
    t.mock.method(Customer, "findById", async (id) => [customerId, otherCustomerId].includes(String(id)) ? { _id: id } : null);
    t.mock.method(User, "findById", async (id) => id === user._id ? user : null);
  }
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  t.after(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
  const token = signAccessToken(user);
  const app = express();
  app.use(express.json());
  app.use(createCsrfProtection([origin]));
  app.use("/so", require("../../backend/routes/purchase-order"));
  app.use("/sj", require("../../backend/routes/surat-jalan"));
  app.use("/invoice", require("../../backend/routes/invoice"));
  const server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  async function request(method, path, body, headers = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers: { "Content-Type": "application/json", Origin: origin, Authorization: `Bearer ${token}`, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    return { status: response.status, ...await response.json() };
  }
  const line = (qty = 10, price = 10000) => ({ namaBarang: "QA Cable", spesifikasi: "2 x 1.5", kuantitas: qty, unit: "METER", hargaSatuan: price, jumlah: qty * price });
  const order = (extra = {}) => request("POST", "/so", { noPo: "QA-SO", tanggalPo: "2026-09-09", namaCustomer: customerId, barang: [line()], ...extra });
  async function delivery(qty = 10, number = "QA-SJ") {
    const { noPoOptions } = await request("GET", "/sj/no-po-options");
    const barang = barangRowsToList(buildSuratJalanBarangRowsFromNoPoOption(noPoOptions.find((row) => row.noPo === "QA-SO")));
    barang[0].jumlah = qty;
    return request("POST", "/sj", { noSuratJalan: number, noPo: "QA-SO", tanggal: "2026-09-09", idCustomer: customerId, kendaraan: "QA Truck", barang });
  }
  async function bill(numbers = [], extra = {}) {
    const { noPoOptions } = await request("GET", "/sj/invoice-options");
    const barang = invoiceBarangRowsToList(selectInvoice(noPoOptions, ["QA-SO"], numbers));
    return request("POST", "/invoice", { tanggal: "2026-09-09", noInvoice: "QA-INV", noPoList: ["QA-SO"], noSuratJalan: numbers, idCustomer: customerId, barang, ...extra });
  }
  return { request, order, delivery, bill, line };
}

test("SO -> SJ -> Invoice -> paid -> delete invoice restores SO billing", async (t) => {
  const qa = await setup(t);
  const so = await qa.order(); assert.equal(so.status, 201);
  const sj = await qa.delivery(); assert.equal(sj.status, 201);
  const result = await qa.bill(["QA-SJ"]); assert.equal(result.status, 201);
  assert.equal(result.invoice.subtotal, 100000);
  assert.equal(result.invoice.ppnAmount, 11000);
  assert.equal(result.invoice.grandTotal, 111000);
  assert.match(result.invoice.dueDate, /^2026-10-09/);
  assert.equal(result.invoice.barang[0].sources[0].suratJalanId, sj.suratJalan.id);
  assert.equal((await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder.workflow.status, "billed");
  assert.equal((await qa.request("PUT", `/invoice/${result.invoice.id}`, { isPaid: true })).status, 400);
  assert.equal((await qa.request("PUT", `/invoice/${result.invoice.id}`, { isPaid: true, tanggalBayar: "2026-09-10" })).status, 200);
  assert.equal((await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder.workflow.status, "paid");
  assert.equal((await qa.request("DELETE", `/so/${so.purchaseOrder.id}`)).status, 409);
  assert.equal((await qa.request("DELETE", `/invoice/${result.invoice.id}`)).status, 200);
  const restored = (await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder;
  assert.equal(restored.noInvoice, null);
  assert.equal(restored.workflow.items[0].remainingBillingQty, 10);
});
test("SO -> Invoice directly: preserves quantity, price, SO reference and no-VAT total", async (t) => {
  const qa = await setup(t); const so = await qa.order(); assert.equal(so.status, 201);
  const result = await qa.bill([], { isPpn: false }); assert.equal(result.status, 201);
  assert.deepEqual(result.invoice.noSuratJalan, []);
  assert.equal(result.invoice.barang[0].noPoManual, "QA-SO");
  assert.equal(result.invoice.grandTotal, 100000);
  assert.equal((await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder.workflow.status, "billed");
});
test("partial SJ + partial billing + second SJ reaches full billing without losing quantities", async (t) => {
  const qa = await setup(t); const so = await qa.order();
  assert.equal((await qa.delivery(4, "QA-SJ-1")).status, 201);
  assert.equal((await qa.bill(["QA-SJ-1"])).status, 201);
  let workflow = (await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder.workflow;
  assert.equal(workflow.status, "partlyBilled");
  assert.equal(workflow.items[0].remainingBillingQty, 6);
  assert.equal((await qa.delivery(7, "QA-SJ-2")).status, 409);
  assert.equal((await qa.delivery(6, "QA-SJ-2")).status, 201);
  assert.equal((await qa.bill(["QA-SJ-2"], { noInvoice: "QA-INV-2" })).status, 201);
  workflow = (await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder.workflow;
  assert.equal(workflow.status, "billed");
  assert.equal(workflow.billing.invoicedAmount, 100000);
});
test("duplicate SO/SJ and SJ edits beyond remaining quantities are rejected", async (t) => {
  const qa = await setup(t); await qa.order();
  assert.equal((await qa.order({ noPo: "qa-so" })).status, 409);
  const sj = await qa.delivery(4);
  assert.equal((await qa.delivery(1)).status, 409);
  assert.equal((await qa.request("PUT", `/sj/${sj.suratJalan.id}`, { barang: [{ nama: "QA Cable", spesifikasi: "2 x 1.5", unit: "METER", jumlah: 11 }] })).status, 409);
});
test("private routes enforce Bearer auth and mutation Origin", async (t) => {
  const qa = await setup(t);
  for (const route of ["/so", "/sj", "/invoice"]) {
    assert.equal((await qa.request("GET", route, undefined, { Authorization: "" })).status, 401);
    assert.equal((await qa.request("POST", route, {}, { Origin: "https://invalid.example" })).status, 403);
  }
});

// Regression tests for the integrity defects found during QA.
test("QA-01: invoice must reject a customer different from the selected SO", async (t) => {
  const qa = await setup(t); await qa.order();
  const result = await qa.bill([], { idCustomer: otherCustomerId });
  assert.ok([400, 409].includes(result.status), `Expected rejection, got HTTP ${result.status}`);
});
test("QA-02: fully invoiced SJ must not be billed a second time", async (t) => {
  const qa = await setup(t); await qa.order(); await qa.delivery();
  assert.equal((await qa.bill(["QA-SJ"])).status, 201);
  const result = await qa.bill(["QA-SJ"], { noInvoice: "QA-INV-2" });
  assert.ok([400, 409].includes(result.status), `Expected rejection, got HTTP ${result.status}`);
});
test("QA-03: invoice line amount must be recalculated or rejected when inconsistent", async (t) => {
  const qa = await setup(t); await qa.order();
  const result = await qa.bill([], { barang: [{ ...qa.line(), jumlah: 1, noPoManual: "QA-SO" }] });
  assert.ok([400, 409].includes(result.status) || result.invoice?.subtotal === 100000, `HTTP ${result.status}, subtotal ${result.invoice?.subtotal}`);
});
test("QA-04: an invoiced SJ cannot be deleted leaving orphaned invoice sources", async (t) => {
  const qa = await setup(t); await qa.order(); const sj = await qa.delivery(); await qa.bill(["QA-SJ"]);
  const result = await qa.request("DELETE", `/sj/${sj.suratJalan.id}`);
  assert.equal(result.status, 409);
});
test("QA-05: directly invoiced SO cannot be invoiced beyond its ordered quantity", async (t) => {
  const qa = await setup(t); await qa.order(); await qa.bill();
  const result = await qa.bill([], { noInvoice: "QA-INV-2" });
  assert.ok([400, 409].includes(result.status), `Expected rejection, got HTTP ${result.status}`);
});

test("two SO and two SJ merge into one invoice with separate source allocation", async (t) => {
  const qa = await setup(t);
  const first = await qa.order(); const second = await qa.order({ noPo: "QA-SO-2" });
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  const sj = await qa.delivery(); assert.equal(sj.status, 201);
  const other = await qa.request("POST", "/sj", { noPo: "QA-SO-2", noSuratJalan: "QA-SJ-2", tanggal: "2026-09-09", idCustomer: customerId, kendaraan: "QA Truck", tipe: "partial", barang: sj.suratJalan.barang });
  assert.equal(other.status, 201);
  const { noPoOptions } = await qa.request("GET", "/sj/invoice-options");
  const barang = invoiceBarangRowsToList(selectInvoice(noPoOptions, ["QA-SO", "QA-SO-2"], ["QA-SJ", "QA-SJ-2"]));
  const result = await qa.bill(["QA-SJ", "QA-SJ-2"], { noPoList: ["QA-SO", "QA-SO-2"], barang });
  assert.equal(result.status, 201); assert.equal(result.invoice.grandTotal, 222000);
  for (const so of [first, second]) {
    const row = (await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder;
    assert.equal(row.workflow.billing.invoicedAmount, 100000);
    assert.equal(row.workflow.status, "billed");
  }
});
test("same-name SO rows with different prices survive SJ -> Invoice -> reload", async (t) => {
  const qa = await setup(t);
  assert.equal((await qa.order({ barang: [qa.line(2, 8000), qa.line(12, 11000)] })).status, 201);
  assert.equal((await qa.delivery(2)).status, 201);
  const result = await qa.bill(["QA-SJ"]); assert.equal(result.status, 201);
  const reloaded = await qa.request("GET", `/invoice/${result.invoice.id}`);
  assert.deepEqual(reloaded.invoice.barang.map((row) => [row.kuantitas, row.hargaSatuan, row.jumlah]), [[2, 8000, 16000], [12, 11000, 132000]]);
  assert.equal(reloaded.invoice.subtotal, 148000);
});
test("invoice edit recalculates VAT and due date; unpay clears payment date", async (t) => {
  const qa = await setup(t); await qa.order(); const result = await qa.bill();
  const id = result.invoice.id;
  let update = await qa.request("PUT", `/invoice/${id}`, { isPpn: false, paymentTerm: { type: "net", netDays: 14 }, isPaid: true, tanggalBayar: "2026-09-10" });
  assert.equal(update.status, 200); assert.equal(update.invoice.grandTotal, 100000);
  assert.match(update.invoice.dueDate, /^2026-09-23/);
  update = await qa.request("PUT", `/invoice/${id}`, { isPpn: true, isPaid: false });
  assert.equal(update.status, 200); assert.equal(update.invoice.grandTotal, 111000);
  assert.equal(update.invoice.tanggalBayar, null);
});
test("QA-06: invoicing directly then via SJ must not bill the same SO quantities twice", async (t) => {
  const qa = await setup(t); await qa.order(); assert.equal((await qa.bill()).status, 201);
  assert.equal((await qa.delivery()).status, 201);
  const result = await qa.bill(["QA-SJ"], { noInvoice: "QA-INV-2" });
  assert.ok([400, 409].includes(result.status), `Expected rejection, got HTTP ${result.status}`);
});

test("SJ no longer needs a manual delivery type; duplicate items share delivery progress", async (t) => {
  const qa = await setup(t); const so = await qa.order({ barang: [qa.line(5), qa.line(5)] });
  const sj = await qa.request("POST", "/sj", { noPo: "QA-SO", noSuratJalan: "QA-SJ", tanggal: "2026-09-09", idCustomer: customerId, kendaraan: "QA", barang: [{ nama: "QA Cable", spesifikasi: "2 x 1.5", unit: "METER", jumlah: 5 }] });
  assert.equal(sj.status, 201); assert.equal("tipe" in sj.suratJalan, false);
  const workflow = (await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder.workflow;
  assert.equal(workflow.status, "partlyDelivered"); assert.equal(workflow.deliveryStatus, "partial");
});
test("Invoice edit excludes itself but rejects another customer or excessive quantities", async (t) => {
  const qa = await setup(t); await qa.order(); const result = await qa.bill(); const id = result.invoice.id;
  assert.equal((await qa.request("PUT", `/invoice/${id}`, { barang: result.invoice.barang })).status, 200);
  assert.equal((await qa.request("PUT", `/invoice/${id}`, { idCustomer: otherCustomerId })).status, 409);
  assert.equal((await qa.request("PUT", `/invoice/${id}`, { barang: [qa.line(11)] })).status, 409);
  assert.equal((await qa.request("GET", `/invoice/${id}`)).invoice.barang[0].kuantitas, 10);
});
test("partial invoice edit scales source quantities and preserves remaining allowance", async (t) => {
  const qa = await setup(t); await qa.order(); await qa.delivery();
  const { noPoOptions } = await qa.request("GET", "/sj/invoice-options");
  const rows = selectInvoice(noPoOptions, ["QA-SO"], ["QA-SJ"]); rows[0].kuantitas = "4";
  const first = await qa.bill(["QA-SJ"], { barang: invoiceBarangRowsToList(rows) });
  assert.equal(first.status, 201); assert.equal(first.invoice.barang[0].sources[0].kuantitas, 4);
  rows[0].kuantitas = "6";
  assert.equal((await qa.bill(["QA-SJ"], { noInvoice: "QA-INV-2", barang: invoiceBarangRowsToList(rows) })).status, 201);
  rows[0].kuantitas = "7";
  assert.equal((await qa.request("PUT", `/invoice/${first.invoice.id}`, { barang: invoiceBarangRowsToList(rows) })).status, 409);
});
test("department suffix in invoice specification preserves original SO allocation", async (t) => {
  const qa = await setup(t); const so = await qa.order(); const sj = await qa.delivery();
  const barang = sj.suratJalan.barang.map((row) => ({ ...row, kodeDepartemen: "QA-DEPT" }));
  assert.equal((await qa.request("PUT", `/sj/${sj.suratJalan.id}`, { barang })).status, 200);
  const invoice = await qa.bill(["QA-SJ"]); assert.equal(invoice.status, 201);
  assert.equal((await qa.request("GET", `/so/${so.purchaseOrder.id}`)).purchaseOrder.workflow.status, "billed");
  assert.equal((await qa.bill([], { noInvoice: "QA-DIRECT" })).status, 409);
});
test("reject forged delivery source and inconsistent source totals", async (t) => {
  const qa = await setup(t); await qa.order(); const sj = await qa.delivery();
  const source = { suratJalanId: sj.suratJalan.id, noSuratJalan: "QA-SJ", noPo: "QA-SO", barangId: "forged", kuantitas: 10 };
  assert.equal((await qa.bill(["QA-SJ"], { barang: [{ ...qa.line(), sources: [source] }] })).status, 409);
  source.barangId = sj.suratJalan.barang[0].id; source.kuantitas = 5;
  assert.equal((await qa.bill(["QA-SJ"], { barang: [{ ...qa.line(), sources: [source] }] })).status, 409);
});
test("linked SO/SJ edits are blocked until downstream documents are removed", { skip: !realDatabase }, async (t) => {
  const qa = await setup(t); const so = await qa.order(); const sj = await qa.delivery(); const bill = await qa.bill(["QA-SJ"]);
  assert.equal((await qa.request("PUT", `/sj/${sj.suratJalan.id}`, { kendaraan: "Revised" })).status, 409);
  assert.equal((await qa.request("PUT", `/so/${so.purchaseOrder.id}`, { barang: [qa.line(20)] })).status, 409);
  assert.equal((await qa.request("DELETE", `/invoice/${bill.invoice.id}`)).status, 200);
  assert.equal((await qa.request("PUT", `/sj/${sj.suratJalan.id}`, { kendaraan: "Revised" })).status, 200);
  assert.equal((await qa.request("PUT", `/so/${so.purchaseOrder.id}`, { barang: [qa.line(20)] })).status, 409);
  assert.equal((await qa.request("DELETE", `/sj/${sj.suratJalan.id}`)).status, 200);
  assert.equal((await qa.request("PUT", `/so/${so.purchaseOrder.id}`, { barang: [qa.line(20)] })).status, 200);
  assert.equal((await qa.request("DELETE", `/so/${so.purchaseOrder.id}`)).status, 200);
});
test("concurrent full invoices reserve the SO quantity only once", { skip: !realDatabase }, async (t) => {
  const qa = await setup(t); await qa.order();
  const results = await Promise.all([qa.bill([], { noInvoice: "QA-RACE-A" }), qa.bill([], { noInvoice: "QA-RACE-B" })]);
  assert.deepEqual(results.map((row) => row.status).sort(), [201, 409]);
  assert.equal(await Invoice.countDocuments({}), 1);
});
test("concurrent invoice creation and SJ deletion cannot leave an orphan source", { skip: !realDatabase }, async (t) => {
  const qa = await setup(t); await qa.order(); const sj = await qa.delivery();
  const { noPoOptions } = await qa.request("GET", "/sj/invoice-options");
  const barang = invoiceBarangRowsToList(selectInvoice(noPoOptions, ["QA-SO"], ["QA-SJ"]));
  const results = await Promise.all([
    qa.bill(["QA-SJ"], { barang }), qa.request("DELETE", `/sj/${sj.suratJalan.id}`),
  ]);
  assert.ok((results[0].status === 201 && results[1].status === 409) || (results[0].status === 409 && results[1].status === 200));
  if (await Invoice.countDocuments({})) assert.ok(await SuratJalan.findById(sj.suratJalan.id));
});
test("duplicate invoice number is rejected even when SO quantity remains", async (t) => {
  const qa = await setup(t); await qa.order();
  assert.equal((await qa.bill([], { barang: [qa.line(4)] })).status, 201);
  assert.equal((await qa.bill([], { noInvoice: "qa-inv", barang: [qa.line(6)] })).status, 409);
  const second = await qa.bill([], { noInvoice: "QA-INV-2", barang: [qa.line(6)] });
  assert.equal(second.status, 201);
  assert.equal((await qa.request("PUT", `/invoice/${second.invoice.id}`, { noInvoice: "QA-INV" })).status, 409);
});
test("legacy header-only SJ invoice with department suffix blocks later direct billing", async (t) => {
  const qa = await setup(t); await qa.order(); const sj = await qa.delivery();
  assert.equal((await qa.request("PUT", `/sj/${sj.suratJalan.id}`, { barang: sj.suratJalan.barang.map((row) => ({ ...row, kodeDepartemen: "QA-DEPT" })) })).status, 200);
  const bill = await qa.bill(["QA-SJ"], { barang: [{ ...qa.line(), spesifikasi: "2 x 1.5 - QA-DEPT", noPoManual: "QA-SO", sources: [] }] });
  assert.equal(bill.status, 201);
  assert.equal((await qa.bill([], { noInvoice: "QA-DIRECT" })).status, 409);
});
