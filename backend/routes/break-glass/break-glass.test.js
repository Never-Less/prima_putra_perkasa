const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");
const { User } = require("../../models/User");
const { Invoice } = require("../../models/Invoice");
const { PurchaseOrder } = require("../../models/PurchaseOrder");
const { CashTransaction } = require("../../models/CashTransaction");
const { AuditLog } = require("../../models/AuditLog");
const { BreakGlassAudit } = require("../../models/BreakGlassAudit");
const { BreakGlassSession } = require("../../models/BreakGlassSession");
const { DocumentWorkflowLock } = require("../../utils/document-mutation");
const { requireBreakGlassAccess, getBreakGlassRole } = require("../../utils/break-glass-access");
const { createCsrfProtection } = require("../../middlewares/csrf");
const owner = "507f1f77bcf86cd799439011";
const developer = "507f1f77bcf86cd799439012";
const targetId = "507f1f77bcf86cd799439013";
const sessionId = "507f1f77bcf86cd799439014";

async function fixture(t) {
  const oldOwner = process.env.BREAK_GLASS_OWNER_IDS;
  const oldDeveloper = process.env.BREAK_GLASS_DEVELOPER_IDS;
  process.env.BREAK_GLASS_OWNER_IDS = owner;
  process.env.BREAK_GLASS_DEVELOPER_IDS = developer;
  t.after(() => {
    if (oldOwner === undefined) delete process.env.BREAK_GLASS_OWNER_IDS; else process.env.BREAK_GLASS_OWNER_IDS = oldOwner;
    if (oldDeveloper === undefined) delete process.env.BREAK_GLASS_DEVELOPER_IDS; else process.env.BREAK_GLASS_DEVELOPER_IDS = oldDeveloper;
  });
  let state = { invoice: { _id: targetId, noInvoice: "INV-001", noPo: "SO-001", noSuratJalan: ["SJ-001"], isPaid: false, grandTotal: 111 }, sessions: [], audits: [], documentAudits: [], cash: false };
  let failAudit = false;
  t.mock.method(DocumentWorkflowLock, "updateOne", async () => ({}));
  // Simulate transactional rollback; production uses the real MongoDB transaction.
  t.mock.method(mongoose.connection, "transaction", async (fn) => {
    const before = structuredClone(state);
    try { return await fn(); } catch (error) { state = before; throw error; }
  });
  t.mock.method(User, "findById", () => ({ select: async () => ({ _id: owner, comparePassword: async (password) => password === "correct-password" }) }));
  t.mock.method(Invoice, "findById", () => ({ lean: async () => structuredClone(state.invoice) }));
  t.mock.method(Invoice, "findOne", () => ({ sort() { return this; }, select() { return this; }, lean: async () => null }));
  t.mock.method(Invoice, "deleteOne", async () => { state.invoice = null; });
  t.mock.method(PurchaseOrder, "find", () => ({ sort() { return this; }, lean: async () => [] }));
  t.mock.method(PurchaseOrder, "updateMany", async () => ({ matchedCount: 0 }));
  t.mock.method(CashTransaction, "exists", async () => state.cash);
  t.mock.method(BreakGlassSession, "create", async (data) => { const row = { _id: sessionId, usedAt: null, revokedAt: null, ...data }; state.sessions.push(row); return row; });
  t.mock.method(BreakGlassSession, "findOneAndUpdate", async (filter, update) => {
    const row = state.sessions.find((item) => Object.entries(filter).every(([key, value]) => {
      if (key === "expiresAt") return item.expiresAt > value.$gt;
      return String(item[key]) === String(value);
    }));
    if (!row) return null;
    Object.assign(row, update.$set);
    return row;
  });
  t.mock.method(BreakGlassAudit, "create", async (data) => { if (failAudit && data.event === "executed") throw new Error("Audit unavailable"); state.audits.push(structuredClone(data)); });
  t.mock.method(AuditLog, "create", async (data) => state.documentAudits.push(data));
  const app = express();
  app.use(express.json(), createCsrfProtection(["http://localhost:3000"]));
  app.use((req, res, next) => {
    if (!req.get("x-test-user")) return res.status(401).json({});
    req.user = { _id: req.get("x-test-user"), username: "test", role: "admin" };
    next();
  });
  delete require.cache[require.resolve("./activate")];
  app.use("/bg", requireBreakGlassAccess, require("./activate"), require("./execute"), require("./revoke"));
  app.use("/users", require("../user/update"), require("../user/remove"));
  app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = async (path, body = {}, user = owner, method = "POST", origin = "http://localhost:3000") => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { "Content-Type": "application/json", Origin: origin, ...(user ? { "x-test-user": user } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const activation = { targetId, operation: "cancelUnpaidInvoice", reason: "Koreksi dokumen pengiriman", password: "correct-password" };
  const activate = () => request("/bg/sessions", activation);
  const execute = (body = { confirmation: "INV-001" }, user = owner) => request(`/bg/sessions/${sessionId}/execute`, body, user);
  return { state: () => state, failAudit: () => { failAudit = true; }, request, activation, activate, execute };
}

test("only configured identities qualify; admin role, no auth, and foreign Origin cannot activate", async (t) => {
  const f = await fixture(t);
  assert.equal(getBreakGlassRole(owner), "owner");
  assert.equal(getBreakGlassRole(developer), "developer");
  assert.equal((await f.request("/bg/sessions", f.activation, targetId)).status, 403);
  assert.equal((await f.request("/bg/sessions", f.activation, "")).status, 401);
  assert.equal((await f.request("/bg/sessions", f.activation, owner, "POST", "https://attacker.example")).status, 403);
  for (const method of ["PUT", "DELETE"]) assert.equal((await f.request(`/users/${owner}`, { password: "takeover123" }, targetId, method)).status, 403);
});

test("reauthentication, reason, operation allowlist and rate limiting are enforced", async (t) => {
  const f = await fixture(t);
  for (const body of [{ reason: "short" }, { operation: "rawUpdate" }, { password: {} }]) assert.equal((await f.request("/bg/sessions", { ...f.activation, ...body })).status, 400);
  assert.equal((await f.request("/bg/sessions", { ...f.activation, password: "wrong" })).status, 403);
  assert.equal(f.state().audits[0].event, "denied");
  await f.request("/bg/sessions", { ...f.activation, password: "wrong" });
  assert.equal((await f.activate()).status, 429);
  assert.equal(f.state().sessions.length, 0);
});

test("execution requires matching actor, confirmation and unchanged preview; then is single use", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.activate()).status, 201);
  assert.equal((await f.execute(undefined, developer)).status, 409);
  assert.equal((await f.execute({ confirmation: "other" })).status, 400);
  f.state().invoice.grandTotal = 222;
  assert.equal((await f.execute()).status, 409);
  f.state().invoice.grandTotal = 111;
  assert.equal((await f.execute()).status, 200);
  assert.equal(f.state().invoice, null);
  assert.equal(f.state().audits.at(-1).before.invoice.noInvoice, "INV-001");
  assert.equal(f.state().audits.at(-1).after.invoice, null);
  assert.equal((await f.execute()).status, 409);
});

test("paid invoices and cash ledger references are rejected, including payments arriving after preview", async (t) => {
  const f = await fixture(t);
  f.state().invoice.isPaid = true;
  assert.equal((await f.activate()).status, 409);
  f.state().invoice.isPaid = false;
  f.state().cash = true;
  assert.equal((await f.activate()).status, 409);
  f.state().cash = false;
  await f.activate();
  f.state().cash = true;
  assert.equal((await f.execute()).status, 409);
  assert.equal(f.state().sessions[0].usedAt, null);
});

test("expired and revoked sessions cannot execute; removing designation immediately denies access", async (t) => {
  const f = await fixture(t);
  await f.activate();
  f.state().sessions[0].expiresAt = new Date(0);
  assert.equal((await f.execute()).status, 409);
  f.state().sessions[0].expiresAt = new Date(Date.now() + 60000);
  assert.equal((await f.request(`/bg/sessions/${sessionId}/revoke`)).status, 200);
  assert.equal((await f.execute()).status, 409);
  delete process.env.BREAK_GLASS_OWNER_IDS;
  assert.equal((await f.execute()).status, 403);
});

test("audit failure rolls back invoice deletion and session consumption", async (t) => {
  const f = await fixture(t);
  await f.activate();
  f.failAudit();
  assert.equal((await f.execute()).status, 500);
  assert.equal(f.state().invoice.noInvoice, "INV-001");
  assert.equal(f.state().sessions[0].usedAt, null);
  assert.equal(f.state().audits.length, 1);
});
