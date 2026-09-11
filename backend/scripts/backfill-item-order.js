require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { Invoice } = require("../models/Invoice");
const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");

const isApplyMode = process.argv.includes("--apply");
const onlyArgument = process.argv.find((argument) => argument.startsWith("--only="));
const selectedNames = new Set(
  String(onlyArgument || "")
    .slice(7)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

const targets = [
  { name: "purchase-orders", model: PurchaseOrder, labelField: "noPo" },
  { name: "surat-jalan", model: SuratJalan, labelField: "noSuratJalan" },
  { name: "invoices", model: Invoice, labelField: "noInvoice" },
];

function validOrderNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function assignItemOrder(itemsInput) {
  const items = Array.isArray(itemsInput) ? itemsInput : [];
  const assignedByIndex = new Map();
  const usedNumbers = new Set();

  items.forEach((item, index) => {
    const orderNumber = validOrderNumber(item?.urutan);

    if (orderNumber !== null && !usedNumbers.has(orderNumber)) {
      assignedByIndex.set(index, orderNumber);
      usedNumbers.add(orderNumber);
    }
  });

  let nextAvailableNumber = 1;
  const nextItems = items.map((item, index) => {
    let orderNumber = assignedByIndex.get(index);

    if (!orderNumber) {
      const preferredNumber = index + 1;

      if (!usedNumbers.has(preferredNumber)) {
        orderNumber = preferredNumber;
      } else {
        while (usedNumbers.has(nextAvailableNumber)) {
          nextAvailableNumber += 1;
        }
        orderNumber = nextAvailableNumber;
      }

      usedNumbers.add(orderNumber);
    }

    return {
      ...item,
      urutan: orderNumber,
    };
  });

  const changedItems = nextItems.reduce(
    (total, item, index) => total + (items[index]?.urutan === item.urutan ? 0 : 1),
    0
  );

  return { items: nextItems, changedItems };
}

async function backfillTarget({ name, model, labelField }) {
  const cursor = model.collection.find(
    { "barang.0": { $exists: true } },
    { projection: { [labelField]: 1, barang: 1 } }
  );
  const summary = {
    collection: name,
    documentsScanned: 0,
    documentsChanged: 0,
    documentsUpdated: 0,
    conflicts: 0,
    itemsChanged: 0,
  };

  while (await cursor.hasNext()) {
    const document = await cursor.next();
    summary.documentsScanned += 1;

    const result = assignItemOrder(document?.barang);

    if (result.changedItems === 0) {
      continue;
    }

    summary.documentsChanged += 1;
    summary.itemsChanged += result.changedItems;

    if (!isApplyMode) {
      continue;
    }

    const updateResult = await model.collection.updateOne(
      { _id: document._id, barang: document.barang },
      { $set: { barang: result.items } }
    );

    if (updateResult.modifiedCount === 1) {
      summary.documentsUpdated += 1;
    } else {
      summary.conflicts += 1;
      console.warn(
        `Lewati ${name} ${String(document?.[labelField] || document?._id)} karena datanya berubah saat backfill.`
      );
    }
  }

  return summary;
}

async function run() {
  const activeTargets = selectedNames.size > 0
    ? targets.filter((target) => selectedNames.has(target.name))
    : targets;

  if (activeTargets.length === 0) {
    throw new Error("Nilai --only tidak cocok. Gunakan purchase-orders, surat-jalan, atau invoices.");
  }

  await connectDatabase();

  const summaries = [];
  for (const target of activeTargets) {
    summaries.push(await backfillTarget(target));
  }

  console.table(summaries);
  console.log(
    isApplyMode
      ? "Backfill nomor urutan selesai diterapkan."
      : "Dry-run selesai. Jalankan kembali dengan --apply untuk menerapkan perubahan."
  );
}

if (require.main === module) {
  run()
    .catch((error) => {
      console.error("Gagal menjalankan backfill nomor urutan:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close();
    });
}

module.exports = {
  assignItemOrder,
  validOrderNumber,
};
