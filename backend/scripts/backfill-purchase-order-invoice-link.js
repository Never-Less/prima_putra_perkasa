require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { PurchaseOrder } = require("../models/PurchaseOrder");
const { syncPurchaseOrderByNoPo } = require("../utils/sync-purchase-order-from-invoice");

function normalizeText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

async function backfillPurchaseOrderInvoiceLink() {
  const purchaseOrders = await PurchaseOrder.find({}, "noPo").lean();
  const noPoSet = new Set(
    purchaseOrders
      .map((item) => normalizeText(item?.noPo))
      .filter((value) => Boolean(value))
  );

  if (noPoSet.size === 0) {
    console.log("Tidak ada data purchase order untuk di-backfill.");
    return;
  }

  let processedCount = 0;
  let linkedCount = 0;
  let clearedCount = 0;

  for (const noPo of noPoSet) {
    const result = await syncPurchaseOrderByNoPo(noPo);
    processedCount += 1;

    if (result.linkedInvoiceId) {
      linkedCount += result.matchedPurchaseOrders;
    } else {
      clearedCount += result.matchedPurchaseOrders;
    }
  }

  console.log(`Backfill relasi invoice selesai. NoPo diproses: ${processedCount}.`);
  console.log(`Purchase order terhubung invoice: ${linkedCount}.`);
  console.log(`Purchase order dibersihkan dari invoice: ${clearedCount}.`);
}

async function run() {
  try {
    await connectDatabase();
    await backfillPurchaseOrderInvoiceLink();
    console.log("Selesai.");
  } catch (error) {
    console.error("Gagal backfill relasi invoice pada purchase order:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
