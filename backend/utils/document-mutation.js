const mongoose = require("mongoose");

// Mongoose propagates the session to queries/save/create inside connection.transaction.
mongoose.set("transactionAsyncLocalStorage", true);
const lockSchema = new mongoose.Schema({ _id: String, revision: { type: Number, default: 0 } });
const DocumentWorkflowLock = mongoose.model("DocumentWorkflowLock", lockSchema);

function documentMutation(handler) {
  return async (req, res, next) => {
    try {
      // Initialize outside the transaction. All document mutations contend on the
      // same write, so a competing transaction retries with a fresh snapshot.
      try {
        await DocumentWorkflowLock.updateOne({ _id: "documents" }, { $setOnInsert: { revision: 0 } }, { upsert: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
      let result;
      await mongoose.connection.transaction(async () => {
        await DocumentWorkflowLock.updateOne({ _id: "documents" }, { $inc: { revision: 1 } });
        result = { status: 200, body: undefined };
        const response = {
          status(code) { result.status = code; return this; },
          json(body) { result.body = body; return this; },
        };
        await handler(req, response);
        if (result.status >= 400) {
          const error = new Error("Document mutation rejected");
          error.documentResponse = result;
          throw error;
        }
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error.documentResponse) return res.status(error.documentResponse.status).json(error.documentResponse.body);
      return next(error);
    }
  };
}

module.exports = { documentMutation, DocumentWorkflowLock };
