require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { SuratJalan } = require("../models/SuratJalan");

// Ubah nilai dummy ini jika diperlukan.
const DUMMY_SPESIFIKASI = "Spesifikasi Dummy";
const DUMMY_UNIT = "pcs";

function normalizeString(value) {
  return String(value || "").trim();
}

function shouldBackfillSpesifikasi(value) {
  return !normalizeString(value);
}

function shouldBackfillUnit(value) {
  return !normalizeString(value);
}

async function backfillSuratJalanBarang() {
  const cursor = SuratJalan.find().cursor();
  let scannedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  let spesifikasiPatchedCount = 0;
  let unitPatchedCount = 0;

  for await (const suratJalan of cursor) {
    scannedCount += 1;
    let hasChanges = false;

    const nextBarangList = suratJalan.barang.map((barangItem) => {
      const nextBarangItem = {
        nama: barangItem.nama,
        spesifikasi: barangItem.spesifikasi,
        jumlah: barangItem.jumlah,
        unit: barangItem.unit,
      };

      if (shouldBackfillSpesifikasi(nextBarangItem.spesifikasi)) {
        nextBarangItem.spesifikasi = DUMMY_SPESIFIKASI;
        spesifikasiPatchedCount += 1;
        hasChanges = true;
      }

      if (shouldBackfillUnit(nextBarangItem.unit)) {
        nextBarangItem.unit = DUMMY_UNIT;
        unitPatchedCount += 1;
        hasChanges = true;
      }

      return nextBarangItem;
    });

    if (!hasChanges) {
      continue;
    }

    suratJalan.barang = nextBarangList;

    try {
      await suratJalan.save();
      updatedCount += 1;
    } catch (error) {
      failedCount += 1;
      console.error(
        `Gagal backfill suratJalan ${suratJalan.noSuratJalan || suratJalan._id}: ${error.message}`
      );
    }
  }

  console.log("Backfill Surat Jalan selesai.");
  console.log(`Total dokumen dicek: ${scannedCount}`);
  console.log(`Total dokumen diupdate: ${updatedCount}`);
  console.log(`Total item spesifikasi diisi: ${spesifikasiPatchedCount}`);
  console.log(`Total item unit diisi: ${unitPatchedCount}`);
  console.log(`Total dokumen gagal update: ${failedCount}`);
}

async function run() {
  try {
    await connectDatabase();
    await backfillSuratJalanBarang();
  } catch (error) {
    console.error("Gagal menjalankan backfill surat jalan:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
