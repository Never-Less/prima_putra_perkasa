const mongoose = require("mongoose");
const multer = require("multer");
const { SupplierDocument } = require("../../models/SupplierDocument");

const maxFiles = 5;
const maxFileSize = 5 * 1024 * 1024;
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { files: maxFiles, fileSize: maxFileSize, fields: 1, fieldSize: 64 * 1024, parts: maxFiles + 1 },
  fileFilter: (_req, file, callback) => callback(
    file.mimetype === "application/pdf" && /\.pdf$/i.test(file.originalname) ? null : new Error("invalidPdf"), true
  ),
}).array("documents", maxFiles);

function isPdf(buffer) {
  return buffer.length > 12 && /^(?:%PDF-1\.[0-7]|%PDF-2\.0)/.test(buffer.subarray(0, 8).toString("ascii"))
    && buffer.subarray(-1024).includes(Buffer.from("%%EOF"));
}

function receiveDocuments(req, res, next) {
  if (!req.is("multipart/form-data")) return next();
  uploader(req, res, (error) => {
    if (error) return res.status(400).json({ code: "supplierOnboarding.error.documents" });
    try {
      const payload = JSON.parse(req.body.payload);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalidPayload");
      req.body = payload;
      if ((req.files || []).some((file) => !isPdf(file.buffer))) throw new Error("invalidPdf");
      return next();
    } catch {
      return res.status(400).json({ code: "supplierOnboarding.error.documents" });
    }
  });
}

async function discardDocuments(documents = []) {
  if (documents.length) await SupplierDocument.deleteMany({ _id: { $in: documents.map((document) => document.id) } });
}

async function storeDocuments(supplierId, files = []) {
  if (!files.length) return [];
  const rows = files.map((file) => ({
    _id: new mongoose.Types.ObjectId(), supplierId,
    name: file.originalname.replace(/[\\/\x00-\x1f\x7f]/g, "_").replace(/\.pdf$/i, "").slice(0, 196) + ".pdf",
    size: file.size, data: file.buffer,
  }));
  const metadata = rows.map((row) => ({ id: String(row._id), name: row.name, size: row.size }));
  try { await SupplierDocument.insertMany(rows); }
  catch (error) { await discardDocuments(metadata); throw error; }
  return metadata;
}

module.exports = { receiveDocuments, storeDocuments, discardDocuments, isPdf, maxFiles, maxFileSize };
