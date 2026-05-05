require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { User, ROLE_ADMIN } = require("../models/User");

async function backfillUserRoleAdmin() {
  const result = await User.updateMany(
    {},
    {
      $set: {
        role: ROLE_ADMIN,
      },
    }
  );

  const matchedCount = Number(result.matchedCount || 0);
  const modifiedCount = Number(result.modifiedCount || 0);

  console.log(`User diproses: ${matchedCount}.`);
  console.log(`User diubah menjadi role admin: ${modifiedCount}.`);
}

async function run() {
  try {
    await connectDatabase();
    await backfillUserRoleAdmin();
    console.log("Selesai.");
  } catch (error) {
    console.error("Gagal backfill role user ke admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
