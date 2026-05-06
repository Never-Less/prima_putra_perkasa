require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");

async function migratePembelianNoNota() {
  const collection = mongoose.connection.collection("pembelians");
  const rows = await collection
    .find(
      {
        noNpwp: { $exists: true },
      },
      {
        projection: {
          noNpwp: 1,
          noNota: 1,
        },
      }
    )
    .toArray();

  if (rows.length === 0) {
    console.log("No pembelian rows need noNota migration.");
    return;
  }

  const operations = rows.map((row) => {
    const currentNoNota = String(row.noNota || "").trim();
    const legacyNoNpwp = String(row.noNpwp || "").trim();
    const update = {
      $unset: {
        noNpwp: "",
      },
    };

    if (!currentNoNota && legacyNoNpwp) {
      update.$set = {
        noNota: legacyNoNpwp,
      };
    }

    return {
      updateOne: {
        filter: { _id: row._id },
        update,
      },
    };
  });

  const result = await collection.bulkWrite(operations, { ordered: false });

  console.log(
    `Migrated ${result.modifiedCount || 0} pembelian rows from noNpwp to noNota.`
  );
}

async function main() {
  try {
    await connectDatabase();
    await migratePembelianNoNota();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

void main();
