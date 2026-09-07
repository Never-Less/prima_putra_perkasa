require("dotenv").config();

const mongoose = require("mongoose");

const { connectDatabase } = require("../config/database");
const { PurchaseOrder } = require("../models/PurchaseOrder");

const isApplyMode = process.argv.includes("--apply");
const idArgument = process.argv.find((argument) => argument.startsWith("--id="));
const salesOrderId = String(idArgument || "").slice(5).trim();

function calculateItemTotal(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (total, item) => total + Math.max(0, Number(item?.jumlah) || 0),
    0
  );
}

async function main() {
  await connectDatabase();

  const query = { "barang.0": { $exists: true } };

  if (salesOrderId) {
    if (!mongoose.isValidObjectId(salesOrderId)) {
      throw new Error("ID Sales Order tidak valid.");
    }
    query._id = salesOrderId;
  }

  const salesOrders = await PurchaseOrder.find(
    query,
    "noPo nominalPo barang"
  ).lean();
  const mismatches = salesOrders
    .map((salesOrder) => ({
      id: salesOrder._id,
      noSo: salesOrder.noPo,
      nominalLama: Number(salesOrder.nominalPo || 0),
      totalBarang: calculateItemTotal(salesOrder.barang),
    }))
    .filter((row) => Math.abs(row.nominalLama - row.totalBarang) > 0.5);

  if (isApplyMode && mismatches.length > 0) {
    await PurchaseOrder.bulkWrite(
      mismatches.map((row) => ({
        updateOne: {
          filter: { _id: row.id },
          update: { $set: { nominalPo: row.totalBarang } },
        },
      }))
    );
  }

  console.table(
    mismatches.map(({ id: _id, ...row }) => ({
      ...row,
      action: isApplyMode ? "updated" : "would update",
    }))
  );
  console.log(
    `${mismatches.length} Sales Order ${
      isApplyMode ? "diperbaiki" : "perlu diperbaiki"
    } berdasarkan total harga barang.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
