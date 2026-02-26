const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
const { sanitizePembelian } = require("./sanitize-pembelian");
const { isValidId, parseBoolean, parseDate, parseNumber } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const tanggalNota = parseDate(req.body.tanggalNota);
  const namaSupplier = String(req.body.namaSupplier || "").trim();
  const noNpwp = String(req.body.noNpwp || "").trim();
  let idInvoice = null;
  const hutang = req.body.hutang !== undefined ? parseBoolean(req.body.hutang) : false;
  const ppn = req.body.ppn !== undefined ? parseBoolean(req.body.ppn) : false;
  let lamaHutang = req.body.lamaHutang !== undefined ? parseNumber(req.body.lamaHutang) : 0;
  const nilaiNota = parseNumber(req.body.nilaiNota);
  let tanggalJatuhTempo = null;
  let tanggalBayar = null;

  if (req.body.tanggalJatuhTempo !== undefined && req.body.tanggalJatuhTempo !== null) {
    tanggalJatuhTempo = parseDate(req.body.tanggalJatuhTempo);
  }

  if (req.body.tanggalBayar !== undefined && req.body.tanggalBayar !== null) {
    tanggalBayar = parseDate(req.body.tanggalBayar);
  }

  if (req.body.idInvoice !== undefined && req.body.idInvoice !== null) {
    idInvoice = String(req.body.idInvoice || "").trim();
    if (!isValidId(idInvoice)) {
      return res.status(400).json({ message: "idInvoice tidak valid" });
    }
  }

  if (!tanggalNota || !namaSupplier || nilaiNota === null) {
    return res.status(400).json({
      message: "tanggalNota, namaSupplier, dan nilaiNota wajib diisi",
    });
  }

  if (hutang === null || ppn === null) {
    return res.status(400).json({ message: "hutang dan ppn harus boolean" });
  }

  if (nilaiNota < 0) {
    return res.status(400).json({ message: "nilaiNota harus angka >= 0" });
  }

  if (req.body.tanggalJatuhTempo !== undefined && req.body.tanggalJatuhTempo !== null && !tanggalJatuhTempo) {
    return res.status(400).json({ message: "tanggalJatuhTempo tidak valid" });
  }

  if (req.body.tanggalBayar !== undefined && req.body.tanggalBayar !== null && !tanggalBayar) {
    return res.status(400).json({ message: "tanggalBayar tidak valid" });
  }

  if (hutang) {
    if (!tanggalJatuhTempo) {
      return res
        .status(400)
        .json({ message: "tanggalJatuhTempo wajib diisi saat hutang bernilai true" });
    }

    if (lamaHutang === null || lamaHutang <= 0) {
      return res
        .status(400)
        .json({ message: "lamaHutang wajib lebih dari 0 saat hutang bernilai true" });
    }
  } else {
    lamaHutang = 0;
    tanggalJatuhTempo = null;
  }

  if (tanggalBayar && tanggalBayar < tanggalNota) {
    return res.status(400).json({
      message: "tanggalBayar tidak boleh lebih kecil dari tanggalNota",
    });
  }

  try {
    if (idInvoice) {
      const invoice = await Invoice.findById(idInvoice);
      if (!invoice) {
        return res.status(404).json({ message: "invoice tidak ditemukan" });
      }
    }

    const pembelian = await Pembelian.create({
      tanggalNota: tanggalNota,
      namaSupplier: namaSupplier,
      noNpwp: noNpwp,
      idInvoice: idInvoice,
      hutang: hutang,
      ppn: ppn,
      lamaHutang: lamaHutang,
      nilaiNota: nilaiNota,
      tanggalJatuhTempo: tanggalJatuhTempo,
      tanggalBayar: tanggalBayar,
    });

    return res.status(201).json({
      message: "pembelian created",
      pembelian: sanitizePembelian(pembelian),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create pembelian" });
  }
});

module.exports = router;
