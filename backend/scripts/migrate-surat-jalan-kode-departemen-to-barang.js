require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { SuratJalan } = require("../models/SuratJalan");

async function migrateSuratJalanKodeDepartemenToBarang() {
  const cursor = SuratJalan.collection.find(
    { kodeDepartemen: { $exists: true } },
    {
      projection: {
        kodeDepartemen: 1,
        barang: 1,
      },
    }
  );
  let matchedCount = 0;
  let migratedCount = 0;

  while (await cursor.hasNext()) {
    const suratJalan = await cursor.next();
    const kodeDepartemen = String(suratJalan?.kodeDepartemen || "").trim();
    const barang = Array.isArray(suratJalan?.barang) ? suratJalan.barang : [];

    matchedCount += 1;

    const nextBarang = barang.map((item) => ({
      ...item,
      kodeDepartemen: String(item?.kodeDepartemen || kodeDepartemen).trim(),
    }));

    const result = await SuratJalan.collection.updateOne(
      { _id: suratJalan._id },
      {
        $set: {
          barang: nextBarang,
        },
        $unset: {
          kodeDepartemen: "",
        },
      }
    );

    migratedCount += result.modifiedCount || 0;
  }

  console.log(`Surat jalan dengan kodeDepartemen lama: ${matchedCount}`);
  console.log(`Surat jalan dimigrasi: ${migratedCount}`);
}

async function run() {
  try {
    await connectDatabase();
    await migrateSuratJalanKodeDepartemenToBarang();
    console.log("Migrasi kodeDepartemen surat jalan selesai.");
  } catch (error) {
    console.error("Gagal migrasi kodeDepartemen surat jalan:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
