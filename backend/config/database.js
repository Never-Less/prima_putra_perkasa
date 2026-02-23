const mongoose = require("mongoose");

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}

function getDatabaseState() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const readyState = mongoose.connection.readyState;

  return {
    connected: readyState === 1,
    state: states[readyState] || "unknown",
  };
}

module.exports = {
  connectDatabase,
  mongoose,
  getDatabaseState,
};
