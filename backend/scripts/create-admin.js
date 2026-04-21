require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { User, ROLE_ADMIN } = require("../models/User");

// Ganti value ini sesuai kebutuhan sebelum menjalankan script.
const ADMIN_USERNAME = "admin@gmail.com";
const ADMIN_PASSWORD = "password123";

async function createOrUpdateAdmin() {
  const username = String(ADMIN_USERNAME || "")
    .trim()
    .toLowerCase();
  const password = String(ADMIN_PASSWORD || "");

  if (!username || !password) {
    throw new Error("ADMIN_USERNAME dan ADMIN_PASSWORD wajib diisi.");
  }

  if (password.length < 8) {
    throw new Error("password minimal 8 karakter.");
  }

  let adminUser = await User.findOne({ username: username }).select("+password");

  if (!adminUser) {
    adminUser = new User({
      username: username,
      password: password,
      role: ROLE_ADMIN,
    });
  } else {
    adminUser.password = password;
    adminUser.role = ROLE_ADMIN;
  }

  await adminUser.save();

  console.log(`Admin user siap: ${adminUser.username}`);
}

async function run() {
  try {
    await connectDatabase();
    await createOrUpdateAdmin();
    console.log("Selesai.");
  } catch (error) {
    console.error("Gagal create admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
