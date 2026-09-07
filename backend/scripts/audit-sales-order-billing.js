// Read-only audit: node scripts/audit-sales-order-billing.js
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDatabase } = require("../config/database");
const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");
const { Invoice } = require("../models/Invoice");
const { buildSalesOrderWorkflow, indexSalesOrderRelations } = require("../utils/sales-order-workflow");

async function main() {
  await connectDatabase();
  const [orders, deliveries, invoices] = await Promise.all([
    PurchaseOrder.find({}, "noPo nominalPo barang").lean(),
    SuratJalan.find({}, "noPo noSuratJalan barang tipe").lean(),
    Invoice.find({}, "noPo noPoList noSuratJalan barang subtotal grandTotal ppnAmount isPaid").lean(),
  ]);
  const relations = indexSalesOrderRelations(deliveries, invoices);
  const counts = {};
  const findings = [];
  const changes = [];
  let previousWorkflow;
  if (process.argv.includes("--compare-head")) {
    const { execFileSync } = require("node:child_process");
    const vm = require("node:vm");
    const context = { module: { exports: {} } };
    vm.runInNewContext(execFileSync("git", ["show", "HEAD:backend/utils/sales-order-workflow.js"], { encoding: "utf8" }), context);
    previousWorkflow = context.module.exports.buildSalesOrderWorkflow;
  }
  for (const order of orders) {
    const key = order.noPo.trim().toLowerCase().replace(/\s+/g, " ");
    const workflow = buildSalesOrderWorkflow(order, relations.suratJalanByNoPo.get(key) || [], relations.invoiceByNoPo.get(key) || [], { includeItems: true });
    counts[workflow.status] = (counts[workflow.status] || 0) + 1;
    if (previousWorkflow) {
      const previous = previousWorkflow(order, relations.suratJalanByNoPo.get(key) || [], relations.invoiceByNoPo.get(key) || []);
      if (previous.status !== workflow.status) changes.push({ id: String(order._id), noSo: order.noPo, before: previous.status, after: workflow.status });
    }
    const itemTotal = (order.barang || []).reduce((sum, item) => sum + Number(item.jumlah || 0), 0);
    const allItemsBilled = workflow.items.length > 0 && workflow.items.every((item) => item.orderedQty > 0 && item.remainingBillingQty === 0);
    if (workflow.status === "partlyBilled" || Math.abs(itemTotal - order.nominalPo) > 1) {
      findings.push({ id: String(order._id), noSo: order.noPo, status: workflow.status, nominal: order.nominalPo, itemTotal, billed: workflow.billing.invoicedAmount, allItemsBilled, missingItems: !(order.barang || []).length });
    }
  }
  console.log(JSON.stringify({ total: orders.length, counts, partialWithoutItems: findings.filter((row) => row.status === "partlyBilled" && row.missingItems).length, partialWithItems: findings.filter((row) => row.status === "partlyBilled" && !row.missingItems).length, changes }, null, 2));
  if (!process.argv.includes("--summary")) console.table(findings);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
