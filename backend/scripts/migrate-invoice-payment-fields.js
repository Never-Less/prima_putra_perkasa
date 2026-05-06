require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { Invoice } = require("../models/Invoice");
const { PurchaseOrder } = require("../models/PurchaseOrder");

async function migrateInvoicePaymentFields() {
  const invoiceIsPaidResult = await Invoice.updateMany(
    { isPaid: { $exists: false } },
    { $set: { isPaid: false } }
  );
  const invoiceTanggalBayarResult = await Invoice.updateMany(
    { tanggalBayar: { $exists: false } },
    { $set: { tanggalBayar: null } }
  );
  const purchaseOrdersWithPaymentDate = await PurchaseOrder.collection
    .find(
      {
        tanggalBayar: { $exists: true, $ne: null },
        noInvoice: { $exists: true, $ne: null },
      },
      {
        projection: {
          noInvoice: 1,
          tanggalBayar: 1,
        },
      }
    )
    .sort({ tanggalBayar: -1 })
    .toArray();

  let migratedTanggalBayarCount = 0;

  for (const purchaseOrder of purchaseOrdersWithPaymentDate) {
    const result = await Invoice.collection.updateOne(
      {
        _id: purchaseOrder.noInvoice,
        $or: [
          { tanggalBayar: { $exists: false } },
          { tanggalBayar: null },
        ],
      },
      { $set: { tanggalBayar: purchaseOrder.tanggalBayar } }
    );

    migratedTanggalBayarCount += result.modifiedCount || 0;
  }

  const purchaseOrderCleanupResult = await PurchaseOrder.collection.updateMany(
    {
      $or: [
        { isPaid: { $exists: true } },
        { tanggalBayar: { $exists: true } },
      ],
    },
    {
      $unset: {
        isPaid: "",
        tanggalBayar: "",
      },
    }
  );

  console.log(
    `Invoice diisi isPaid=false: ${invoiceIsPaidResult.modifiedCount || 0}`
  );
  console.log(
    `Invoice diisi tanggalBayar=null: ${invoiceTanggalBayarResult.modifiedCount || 0}`
  );
  console.log(
    `Tanggal bayar PO dipindahkan ke invoice: ${migratedTanggalBayarCount}`
  );
  console.log(
    `Purchase Order dibersihkan dari isPaid/tanggalBayar: ${purchaseOrderCleanupResult.modifiedCount || 0}`
  );
}

async function run() {
  try {
    await connectDatabase();
    await migrateInvoicePaymentFields();
    console.log("Migrasi payment fields invoice selesai.");
  } catch (error) {
    console.error("Gagal migrasi payment fields invoice:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
