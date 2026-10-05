const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { Supplier } = require("../../models/Supplier");
const { SupplierDocument } = require("../../models/SupplierDocument");
const { ROLE_ADMIN } = require("../../models/User");
const { createCsrfProtection } = require("../../middlewares/csrf");

const supplierId = "507f1f77bcf86cd799439011";
const documentId = "507f1f77bcf86cd799439012";
const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n");

async function fixture(t) {
  const app = express();
  app.use(express.json());
  app.use(createCsrfProtection(["http://localhost:3000"]));
  app.use("/api/suppliers", require("./index"));
  app.use("/internal", (req, _res, next) => { req.user = { _id: supplierId, role: req.get("x-test-role") || ROLE_ADMIN }; next(); }, require("./create"), require("./update"), require("./download-document"));
  const server = await new Promise((resolve) => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

function form(payload) {
  const body = new FormData();
  body.append("payload", JSON.stringify(payload));
  body.append("documents", new Blob([pdf], { type: "application/pdf" }), "catalog.pdf");
  return body;
}

test("internal contact validation rejects non-numeric numbers and invalid emails while preserving leading zeros", async (t) => {
  const base = await fixture(t);
  let writes = 0;
  t.mock.method(Supplier, "create", async (row) => { writes++; return row; });
  t.mock.method(Supplier, "findById", async () => ({ _id: supplierId, hutang: false }));
  t.mock.method(Supplier, "findByIdAndUpdate", async (_id, update) => { writes++; return { _id: supplierId, ...update.$set }; });
  const send = (method, body) => fetch(base + (method === "POST" ? "/internal" : `/internal/${supplierId}`), { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ namaSupplier: "Supplier", ...body }) });
  for (const method of ["POST", "PUT"]) for (const [field, value] of [["npwp", "123abc"], ["npwp", "0000000000000000"], ["phone", "021abc1234"], ["phone", 211234567], ["whatsapp", "invalid"], ["email", "not-an-email"], ["email", "a..b@example.com"]]) {
    const response = await send(method, { [field]: value });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).errors[field], `supplierOnboarding.error.${field}`);
  }
  assert.equal(writes, 0);
  const response = await send("POST", { npwp: "01.234.567.8-901.000", phone: "0211234567", whatsapp: "081234567890", email: " SALES@EXAMPLE.COM " });
  assert.equal(response.status, 201);
  const supplier = (await response.json()).supplier;
  assert.equal(supplier.npwp, "0012345678901000");
  assert.equal(supplier.phone, "0211234567");
  assert.equal(supplier.whatsapp, "081234567890");
  assert.equal(supplier.email, "sales@example.com");
  assert.equal((await send("PUT", { npwp: "", phone: "", whatsapp: "", email: "" })).status, 200);
});

test("internal document links validate before persistence and can be cleared", async (t) => {
  const base = await fixture(t);
  let persisted = 0;
  t.mock.method(Supplier, "create", async (row) => { persisted++; return row; });
  t.mock.method(Supplier, "findById", async () => ({ _id: supplierId, hutang: false }));
  t.mock.method(Supplier, "findByIdAndUpdate", async (_id, update) => { persisted++; return { _id: supplierId, ...update.$set }; });
  const send = (method, path, body) => fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  for (const method of ["POST", "PUT"]) {
    const path = method === "POST" ? "/internal" : `/internal/${supplierId}`;
    assert.equal((await send(method, path, { namaSupplier: "Supplier", documentLinks: [{ label: "Catalog", url: "javascript:alert(1)" }] })).status, 400);
  }
  assert.equal(persisted, 0);
  const created = await send("POST", "/internal", { namaSupplier: "Supplier", documentLinks: [{ label: " Catalog ", url: " https://example.com/catalog.pdf " }] });
  assert.equal(created.status, 201);
  assert.deepEqual((await created.json()).supplier.documentLinks, [{ label: "Catalog", url: "https://example.com/catalog.pdf" }]);
  const updated = await send("PUT", `/internal/${supplierId}`, { documentLinks: [] });
  assert.equal(updated.status, 200);
  assert.deepEqual((await updated.json()).supplier.documentLinks, []);
});

test("document downloads require authentication, supplier ownership, and a pending/approved reference", async (t) => {
  const base = await fixture(t);
  let linked = true;
  let owner = supplierId;
  t.mock.method(Supplier, "findOne", (query) => ({ select: async (fields) => {
    assert.equal(fields, "_id");
    assert.equal(query._id, supplierId);
    assert.deepEqual(query.$or, [{ "documents.id": documentId }, { "onboarding.pendingData.documents.id": documentId }]);
    return linked ? { _id: supplierId } : null;
  } }));
  t.mock.method(SupplierDocument, "findOne", (query) => ({ select: async (fields) => {
    assert.equal(fields, "+data");
    assert.equal(query._id, documentId);
    return query.supplierId === owner ? { name: "catalog.pdf", data: pdf } : null;
  } }));
  assert.equal((await fetch(`${base}/api/suppliers/${supplierId}/documents/${documentId}`)).status, 401);
  const response = await fetch(`${base}/internal/${supplierId}/documents/${documentId}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition"), /attachment.*catalog.pdf/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  owner = documentId;
  assert.equal((await fetch(`${base}/internal/${supplierId}/documents/${documentId}`)).status, 404);
  linked = false;
  assert.equal((await fetch(`${base}/internal/${supplierId}/documents/${documentId}`)).status, 404);
  assert.equal((await fetch(`${base}/internal/${supplierId}/documents/invalid`)).status, 404);
});

test("internal create/update accept multipart PDFs, retain existing attachments, and reject unauthorized uploads", async (t) => {
  const base = await fixture(t);
  const files = [];
  t.mock.method(SupplierDocument, "insertMany", async (rows) => { files.push(...rows); return rows; });
  t.mock.method(SupplierDocument, "deleteMany", async () => {});
  t.mock.method(Supplier, "create", async (supplier) => {
    assert.equal(supplier.documents.length, 1);
    assert.equal(supplier.documents[0].id, String(files[0]._id));
    assert.equal(String(files[0].supplierId), String(supplier._id));
    assert.deepEqual(supplier.productCategories, ["Kabel"]);
    return supplier;
  });
  t.mock.method(Supplier, "findById", async () => ({ _id: supplierId, hutang: false }));
  t.mock.method(Supplier, "findByIdAndUpdate", async (id, updates) => {
    assert.equal(id, supplierId);
    assert.equal(updates.$push.documents.$each.length, 1);
    assert.equal("documents" in updates.$set, false);
    return { _id: supplierId, documents: updates.$push.documents.$each };
  });
  const created = await fetch(`${base}/internal`, { method: "POST", body: form({ namaSupplier: "Supplier", productCategories: "Kabel,Kabel" }) });
  assert.equal(created.status, 201);
  const result = await created.json();
  assert.equal(result.supplier.documents[0].name, "catalog.pdf");
  assert.equal("data" in result.supplier.documents[0], false);
  assert.equal((await fetch(`${base}/internal/${supplierId}`, { method: "PUT", body: form({ notes: "Updated" }) })).status, 200);
  assert.equal((await fetch(`${base}/internal`, { method: "POST", headers: { "x-test-role": "viewer" }, body: form({ namaSupplier: "Rejected" }) })).status, 403);
  assert.equal((await fetch(`${base}/api/suppliers`, { method: "POST", body: form({ namaSupplier: "Rejected" }) })).status, 401);
  assert.equal((await fetch(`${base}/internal`, { method: "POST", headers: { Origin: "https://evil.example" }, body: form({ namaSupplier: "Rejected" }) })).status, 403);
  assert.equal(files.length, 2);
});

test("failed supplier persistence cleans up PDFs and invalid tags never reach storage", async (t) => {
  const base = await fixture(t);
  const files = new Set();
  t.mock.method(SupplierDocument, "insertMany", async (rows) => { rows.forEach((row) => files.add(String(row._id))); return rows; });
  t.mock.method(SupplierDocument, "deleteMany", async (condition) => { condition._id.$in.forEach((id) => files.delete(String(id))); });
  t.mock.method(Supplier, "create", async () => { throw new Error("Database unavailable"); });
  assert.equal((await fetch(`${base}/internal`, { method: "POST", body: form({ namaSupplier: "Supplier" }) })).status, 500);
  assert.equal(files.size, 0);
  assert.equal((await fetch(`${base}/internal`, { method: "POST", body: form({ namaSupplier: "Supplier", productBrands: ["x".repeat(101)] }) })).status, 400);
  assert.equal(files.size, 0);
});
