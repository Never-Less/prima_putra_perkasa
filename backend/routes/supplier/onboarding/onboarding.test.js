const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { Supplier } = require("../../../models/Supplier");
const { ROLE_ADMIN } = require("../../../models/User");
const { createCsrfProtection } = require("../../../middlewares/csrf");
const { validateProfile, hashToken } = require("./validation");
const { sanitizeSupplier } = require("../sanitize-supplier");

const supplierId = "507f1f77bcf86cd799439011";
const profile = {
  alamat: "Jl. Contoh No. 1, Jakarta", npwp: "01.234.567.8-901.000", picName: "PIC Supplier",
  phone: "0211234567", whatsapp: "6281234567890", email: "sales@example.com",
  productCategories: "Kabel, Lampu LED, Kabel", productBrands: "Philips, Panasonic",
};

test("normalizes legacy NPWP and comma lists while keeping phone and WhatsApp separate", () => {
  const result = validateProfile(profile);
  assert.equal(result.valid, true);
  assert.equal(result.data.npwp, "0012345678901000");
  assert.deepEqual(result.data.productCategories, ["Kabel", "Lampu LED"]);
  assert.deepEqual(result.data.productBrands, ["Philips", "Panasonic"]);
  assert.notEqual(result.data.phone, result.data.whatsapp);
  assert.equal(validateProfile({ ...profile, npwp: "0012345678901000" }).valid, true);
});

test("rejects invalid, missing, oversized, and non-string profile inputs", () => {
  for (const [field, invalid] of [
    ["npwp", "0000000000000000"], ["npwp", "123"], ["npwp", "abc012345678901234"],
    ["phone", "+628123456789"], ["whatsapp", "0812 3456"], ["email", "not-an-email"],
    ["email", "a@b"], ["email", "a..b@example.com"], ["email", "a@-invalid.com"], ["picName", ""], ["alamat", "x".repeat(501)],
    ["productCategories", []], ["productBrands", ["x".repeat(101)]], ["productBrands", [{ brand: "X" }]],
  ]) {
    const result = validateProfile({ ...profile, [field]: invalid });
    assert.equal(result.valid, false, `${field}: ${JSON.stringify(invalid)}`);
    assert.ok(result.errors[field]);
  }
  assert.equal(validateProfile().valid, false);
  assert.equal(validateProfile(null).valid, false);
});

function matches(document, condition) {
  return Object.entries(condition).every(([path, expected]) => {
    const actual = path.split(".").reduce((value, key) => value?.[key], document);
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if (expected.$in) return expected.$in.includes(actual);
      if (expected.$gt) return new Date(actual) > expected.$gt;
    }
    if (expected instanceof Date) return new Date(actual).getTime() === expected.getTime();
    return String(actual) === String(expected);
  });
}

function setPath(document, path, value, remove = false) {
  const keys = path.split(".");
  const key = keys.pop();
  const parent = keys.reduce((row, part) => row[part] ||= {}, document);
  if (remove) delete parent[key]; else parent[key] = structuredClone(value);
}

async function fixture(t) {
  const state = { document: { _id: supplierId, namaSupplier: "Senjaya Elektronik", hutang: false, lamaHutang: null,
    alamat: "Profil lama", notes: "Catatan internal", onboarding: { status: "notGenerated" } } };
  t.mock.method(Supplier, "findByIdAndUpdate", async (id, update) => {
    if (id !== state.document._id) return null;
    for (const [path, value] of Object.entries(update.$set)) setPath(state.document, path, value);
    return structuredClone(state.document);
  });
  t.mock.method(Supplier, "findOneAndUpdate", async (condition, update) => {
    if (!matches(state.document, condition)) return null;
    for (const [path, value] of Object.entries(update.$set || {})) setPath(state.document, path, value);
    for (const path of Object.keys(update.$unset || {})) setPath(state.document, path, null, true);
    return structuredClone(state.document);
  });
  t.mock.method(Supplier, "findOne", (condition) => {
    const result = matches(state.document, condition) ? structuredClone(state.document) : null;
    return {
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      select: (fields) => ({ lean: async () => {
        assert.equal(fields, "namaSupplier onboarding.status");
        return result ? { namaSupplier: result.namaSupplier, onboarding: { status: result.onboarding.status } } : null;
      } }),
    };
  });
  const app = express();
  app.use(express.json());
  app.use(createCsrfProtection(["http://localhost:3000"]));
  app.use("/api/supplier-forms", require("../../supplier-public"));
  // Exercise the real protected route without credentials.
  app.use("/api/suppliers", require(".."));
  // Authenticated fixture for internal actions: real role middleware still applies.
  app.use("/internal", (req, _res, next) => { req.user = { _id: supplierId, role: req.get("x-test-role") || ROLE_ADMIN }; next(); }, require("./index"));
  const server = await new Promise((resolve) => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, body, headers = {}) {
    const response = await fetch(base + path, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  async function generate() {
    const response = await request(`/internal/${supplierId}/onboarding/generate`, {});
    assert.equal(response.status, 200);
    return response.body.token;
  }
  return { state, request, generate };
}

test("generation stores a hash, public GET exposes only company name/status, and internal endpoints require auth", async (t) => {
  const { state, request, generate } = await fixture(t);
  const token = await generate();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(state.document.onboarding.tokenHash, hashToken(token));
  assert.ok(new Date(state.document.onboarding.expiresAt) > new Date());
  const response = await request(`/api/supplier-forms/${token}`);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body).sort(), ["namaSupplier", "status"]);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(JSON.stringify(sanitizeSupplier(state.document)).includes(hashToken(token)), false);
  for (const action of ["generate", "sent", "approve"]) {
    assert.equal((await request(`/api/suppliers/${supplierId}/onboarding/${action}`, {})).status, 401);
    assert.equal((await request(`/internal/${supplierId}/onboarding/${action}`, {}, { "x-test-role": "viewer" })).status, 403);
  }
});

test("manual sent, public submit, internal review, and completion preserve the approval boundary", async (t) => {
  const { state, request, generate } = await fixture(t);
  const token = await generate();
  assert.equal((await request(`/internal/${supplierId}/onboarding/sent`, { generatedAt: state.document.onboarding.generatedAt })).status, 200);
  assert.equal(state.document.onboarding.status, "sent");
  const response = await request(`/api/supplier-forms/${token}`, { ...profile, namaSupplier: "Injected", hutang: true, lamaHutang: 999, notes: "Injected", onboarding: { status: "completed" } });
  assert.equal(response.status, 200);
  assert.equal(state.document.onboarding.status, "submitted");
  assert.equal(state.document.namaSupplier, "Senjaya Elektronik");
  assert.equal(state.document.alamat, "Profil lama");
  assert.equal(state.document.hutang, false);
  assert.equal(state.document.notes, "Catatan internal");
  assert.equal("hutang" in state.document.onboarding.pendingData, false);
  const submittedAt = state.document.onboarding.submittedAt;
  assert.equal((await request(`/internal/${supplierId}/onboarding/approve`, { submittedAt, hutang: true, lamaHutang: 0 })).status, 400);
  assert.equal((await request(`/internal/${supplierId}/onboarding/approve`, { submittedAt, hutang: true, lamaHutang: 30 })).status, 200);
  assert.equal(state.document.onboarding.status, "completed");
  assert.equal(state.document.alamat, profile.alamat);
  assert.equal(state.document.hutang, true);
  assert.equal(state.document.lamaHutang, 30);
  assert.equal(state.document.onboarding.pendingData, null);
  assert.equal(state.document.onboarding.tokenHash, undefined);
  assert.equal((await request(`/api/supplier-forms/${token}`, profile)).status, 409);
});

test("only one simultaneous submission succeeds and stale review cannot approve a replacement link", async (t) => {
  const { state, request, generate } = await fixture(t);
  const token = await generate();
  const responses = await Promise.all([request(`/api/supplier-forms/${token}`, profile), request(`/api/supplier-forms/${token}`, profile)]);
  assert.deepEqual(responses.map((value) => value.status).sort(), [200, 409]);
  const submittedAt = state.document.onboarding.submittedAt;
  await generate();
  assert.equal((await request(`/internal/${supplierId}/onboarding/approve`, { submittedAt, hutang: false })).status, 409);
  assert.equal(state.document.alamat, "Profil lama");
});

test("expired, replaced, malformed links and hostile origins cannot submit", async (t) => {
  const { state, request, generate } = await fixture(t);
  const oldToken = await generate();
  const token = await generate();
  assert.notEqual(token, oldToken);
  assert.equal((await request(`/api/supplier-forms/${oldToken}`)).status, 404);
  assert.equal((await request(`/api/supplier-forms/${oldToken}`, profile)).status, 409);
  assert.equal((await request("/api/supplier-forms/not-a-token", profile)).status, 404);
  assert.equal((await request(`/api/supplier-forms/${token}`, profile, { Origin: "https://evil.example" })).status, 403);
  state.document.onboarding.expiresAt = new Date(Date.now() - 1000);
  assert.equal((await request(`/api/supplier-forms/${token}`)).status, 404);
  assert.equal((await request(`/api/supplier-forms/${token}`, profile)).status, 409);
  assert.equal(state.document.onboarding.status, "generated");
});

test("invalid public profile leaves the invitation open and returns field errors", async (t) => {
  const { state, request, generate } = await fixture(t);
  const token = await generate();
  const response = await request(`/api/supplier-forms/${token}`, { ...profile, email: "bad", whatsapp: "abc" });
  assert.equal(response.status, 400);
  assert.ok(response.body.errors.email);
  assert.ok(response.body.errors.whatsapp);
  assert.equal(state.document.onboarding.status, "generated");
});
