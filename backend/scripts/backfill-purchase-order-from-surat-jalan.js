require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { PurchaseOrder } = require("../models/PurchaseOrder");
const { SuratJalan } = require("../models/SuratJalan");

function normalizeText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

async function backfillPurchaseOrdersFromSuratJalan() {
  const groupedRows = await SuratJalan.aggregate([
    {
      $match: {
        noPo: { $exists: true, $ne: null },
      },
    },
    {
      $sort: {
        noPo: 1,
        tanggal: 1,
        createdAt: 1,
      },
    },
    {
      $group: {
        _id: "$noPo",
        tanggalPo: { $first: "$tanggal" },
        namaCustomer: { $first: "$idCustomer" },
      },
    },
    {
      $project: {
        _id: 0,
        noPo: "$_id",
        tanggalPo: 1,
        namaCustomer: 1,
      },
    },
  ]);

  const sourceRows = groupedRows
    .map((row) => {
      const noPo = normalizeText(row?.noPo);
      const namaCustomer = normalizeText(row?.namaCustomer);
      const tanggalPo = row?.tanggalPo ? new Date(row.tanggalPo) : null;

      if (!noPo || !namaCustomer || !tanggalPo || Number.isNaN(tanggalPo.getTime())) {
        return null;
      }

      return {
        noPo,
        namaCustomer,
        tanggalPo,
      };
    })
    .filter((row) => Boolean(row));

  const existingRows = await PurchaseOrder.find({}, "noPo").lean();
  const existingNoPoSet = new Set(
    existingRows
      .map((row) => normalizeText(row?.noPo).toLowerCase())
      .filter((value) => Boolean(value))
  );

  const docsToCreate = sourceRows
    .filter((row) => !existingNoPoSet.has(row.noPo.toLowerCase()))
    .map((row) => ({
      noPo: row.noPo,
      tanggalPo: row.tanggalPo,
      namaCustomer: row.namaCustomer,
      nominalPo: 0,
      isPaid: false,
      tanggalBayar: null,
      tanggalInvoice: null,
      noInvoice: null,
    }));

  if (docsToCreate.length === 0) {
    console.log("Tidak ada purchase order baru yang perlu di-backfill.");
    return;
  }

  const insertedRows = await PurchaseOrder.insertMany(docsToCreate, {
    ordered: false,
  });

  console.log(`Backfill selesai. ${insertedRows.length} purchase order ditambahkan.`);
}

async function run() {
  try {
    await connectDatabase();
    await backfillPurchaseOrdersFromSuratJalan();
    console.log("Selesai.");
  } catch (error) {
    console.error("Gagal backfill purchase order dari surat jalan:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
