const express = require("express");

const { requireRole } = require("../../middlewares/auth");
const { Supplier } = require("../../models/Supplier");
const { ROLE_ADMIN, ROLE_STAFF } = require("../../models/User");
const { sanitizeSupplier } = require("./sanitize-supplier");

const router = express.Router();
const mongoose = require("mongoose");
const { receiveDocuments, storeDocuments, discardDocuments } = require("./document-storage");
const { validateTags } = require("./validate-tags");
const { validateDocumentLinks } = require("./document-links");
const { validateCompany } = require("./validate-company");
const { validateContact } = require("./validate-contact");

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();

    if (lowered === "true") {
      return true;
    }

    if (lowered === "false") {
      return false;
    }
  }

  return null;
}

function parseNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function profileFields(body) {
  const productCategories = Array.isArray(body.productCategories)
    ? body.productCategories.map((value) => String(value || "").trim()).filter(Boolean)
    : String(body.productCategories || "").split(",").map((value) => value.trim()).filter(Boolean);
  const documentLinks = Array.isArray(body.documentLinks)
    ? body.documentLinks.map((row) => ({ label: String(row?.label || "").trim(), url: String(row?.url || "").trim() })).filter((row) => row.label && /^https?:\/\//i.test(row.url))
    : [];
  return {
    legalCompanyName: body.legalCompanyName || "", supplierType: body.supplierType || "", supplierTypeOther: body.supplierTypeOther || "",
    alamat: String(body.alamat || "").trim(), npwp: String(body.npwp || "").trim(),
    picName: String(body.picName || "").trim(), phone: String(body.phone || "").trim(),
    whatsapp: String(body.whatsapp || "").trim(),
    productBrands: (Array.isArray(body.productBrands) ? body.productBrands : String(body.productBrands || "").split(",")).map((value) => String(value || "").trim()).filter(Boolean),
    email: String(body.email || "").trim(), notes: String(body.notes || "").trim(),
    productCategories: [...new Set(productCategories)], documentLinks,
    isActive: body.isActive === undefined ? true : parseBoolean(body.isActive),
  };
}

router.post("/", requireRole(ROLE_ADMIN, ROLE_STAFF), receiveDocuments, validateTags, validateDocumentLinks, validateContact, validateCompany, async (req, res) => {
  const namaSupplier = String(req.body.namaSupplier || "").trim();
  const hutang = req.body.hutang !== undefined ? parseBoolean(req.body.hutang) : false;
  const lamaHutang = hutang ? parseNumber(req.body.lamaHutang) : null;

  if (!namaSupplier) {
    return res.status(400).json({ message: "Isi nama supplier sebelum menyimpan." });
  }

  if (hutang === null) {
    return res.status(400).json({ message: "Status hutang tidak valid." });
  }

  if (hutang && (lamaHutang === null || lamaHutang <= 0)) {
    return res.status(400).json({
      message: "Isi lama hutang lebih dari 0 hari saat status hutang aktif.",
    });
  }

  let documents = [];
  let linked = false;
  try {
    const id = new mongoose.Types.ObjectId();
    documents = await storeDocuments(id, req.files);
    const supplier = await Supplier.create({
      _id: id, documents,
      namaSupplier,
      hutang,
      lamaHutang,
      ...profileFields(req.body),
    });

    linked = true;
    return res.status(201).json({
      message: "supplier created",
      supplier: sanitizeSupplier(supplier),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Data supplier belum bisa disimpan. Coba lagi." });
  } finally {
    if (!linked) await discardDocuments(documents);
  }
});

module.exports = router;
