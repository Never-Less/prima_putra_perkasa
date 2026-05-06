require("dotenv").config();

const { connectDatabase, mongoose } = require("../config/database");
const { User, ROLE_ADMIN } = require("../models/User");

async function createOrUpdateAdmin() {
  const username = String(process.env.ADMIN_USERNAME || "")
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!username || !password) {
    throw new Error(
      "ADMIN_USERNAME dan ADMIN_PASSWORD wajib diisi melalui environment variable."
    );
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

  process.stdout.write("Admin user siap.\n");
}

async function run() {
  try {
    await connectDatabase();
    await createOrUpdateAdmin();
    process.stdout.write("Selesai.\n");
  } catch (error) {
    console.error("Gagal create admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
