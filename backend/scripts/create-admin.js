require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { User } = require("../models/User");

// Ganti value ini sesuai kebutuhan sebelum menjalankan script.
const ADMIN_USERNAME = "admin@gmail.com";
const ADMIN_PASSWORD = "password";

async function createOrUpdateAdmin() {
  const username = String(ADMIN_USERNAME || "")
    .trim()
    .toLowerCase();
  const password = String(ADMIN_PASSWORD || "");

  if (!username || !password) {
    throw new Error("ADMIN_USERNAME dan ADMIN_PASSWORD wajib diisi.");
  }

  if (password.length < 8) {
    throw new Error("Password minimal 8 karakter.");
  }

  let adminUser = await User.findOne({ Username: username }).select("+Password");

  if (!adminUser) {
    adminUser = new User({
      Username: username,
      Password: password,
      Role: "admin",
    });
  } else {
    adminUser.Password = password;
    adminUser.Role = "admin";
  }

  await adminUser.save();

  console.log(`Admin user siap: ${adminUser.Username}`);
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
