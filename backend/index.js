require("dotenv").config();

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const { connectDatabase, getDatabaseState, mongoose } = require("./config/database");
const {
  createCsrfProtection,
  isOriginAllowed,
  parseAllowedOrigins,
} = require("./middlewares/csrf");
const authRoutes = require("./routes/auth");
const customerRoutes = require("./routes/customer");
const invoiceRoutes = require("./routes/invoice");
const pembelianRoutes = require("./routes/pembelian");
const purchaseOrderRoutes = require("./routes/purchase-order");
const suratJalanRoutes = require("./routes/surat-jalan");

const app = express();
const port = Number(process.env.PORT) || 5000;
const allowedOrigins = parseAllowedOrigins(process.env.APP_ORIGINS);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }

      return callback(new Error("Origin blocked by CORS policy"));
    },
    credentials: false,
  })
);
app.use(express.json());
app.use(createCsrfProtection(allowedOrigins));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: getDatabaseState(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/pembelian", pembelianRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/surat-jalan", suratJalanRoutes);

app.use((error, _req, res, next) => {
  if (error?.message === "Origin blocked by CORS policy") {
    return res.status(403).json({ message: error.message });
  }

  return next(error);
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ message: "Internal server error" });
});

function validateEnvironment() {
  const requiredVariables = ["JWT_SECRET", "JWT_REFRESH_SECRET"];

  for (const key of requiredVariables) {
    if (!process.env[key]) {
      throw new Error(`${key} is not set`);
    }
  }
}

async function startServer() {
  validateEnvironment();
  await connectDatabase();

  app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});
