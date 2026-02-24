const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
const { sanitizePembelian } = require("./sanitize-pembelian");
const { isValidId, parseBoolean, parseDate, parseNumber } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const tanggalNota = parseDate(req.body.TanggalNota);
  const namaSupplier = String(req.body.NamaSupplier || "").trim();
  const noNpwp = String(req.body.NoNpwp || "").trim();
  let idInvoice = null;
  const hutang = req.body.Hutang !== undefined ? parseBoolean(req.body.Hutang) : false;
  const ppn = req.body.Ppn !== undefined ? parseBoolean(req.body.Ppn) : false;
  let lamaHutang = req.body.LamaHutang !== undefined ? parseNumber(req.body.LamaHutang) : 0;
  const nilaiNota = parseNumber(req.body.NilaiNota);
  let tanggalJatuhTempo = null;
  let tanggalBayar = null;

  if (req.body.TanggalJatuhTempo !== undefined && req.body.TanggalJatuhTempo !== null) {
    tanggalJatuhTempo = parseDate(req.body.TanggalJatuhTempo);
  }

  if (req.body.TanggalBayar !== undefined && req.body.TanggalBayar !== null) {
    tanggalBayar = parseDate(req.body.TanggalBayar);
  }

  if (req.body.IdInvoice !== undefined && req.body.IdInvoice !== null) {
    idInvoice = String(req.body.IdInvoice || "").trim();
    if (!isValidId(idInvoice)) {
      return res.status(400).json({ message: "IdInvoice tidak valid" });
    }
  }

  if (!tanggalNota || !namaSupplier || nilaiNota === null) {
    return res.status(400).json({
      message: "TanggalNota, NamaSupplier, dan NilaiNota wajib diisi",
    });
  }

  if (hutang === null || ppn === null) {
    return res.status(400).json({ message: "Hutang dan Ppn harus boolean" });
  }

  if (nilaiNota < 0) {
    return res.status(400).json({ message: "NilaiNota harus angka >= 0" });
  }

  if (req.body.TanggalJatuhTempo !== undefined && req.body.TanggalJatuhTempo !== null && !tanggalJatuhTempo) {
    return res.status(400).json({ message: "TanggalJatuhTempo tidak valid" });
  }

  if (req.body.TanggalBayar !== undefined && req.body.TanggalBayar !== null && !tanggalBayar) {
    return res.status(400).json({ message: "TanggalBayar tidak valid" });
  }

  if (hutang) {
    if (!tanggalJatuhTempo) {
      return res
        .status(400)
        .json({ message: "TanggalJatuhTempo wajib diisi saat Hutang bernilai true" });
    }

    if (lamaHutang === null || lamaHutang <= 0) {
      return res
        .status(400)
        .json({ message: "LamaHutang wajib lebih dari 0 saat Hutang bernilai true" });
    }
  } else {
    lamaHutang = 0;
    tanggalJatuhTempo = null;
  }

  if (tanggalBayar && tanggalBayar < tanggalNota) {
    return res.status(400).json({
      message: "TanggalBayar tidak boleh lebih kecil dari TanggalNota",
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
      TanggalNota: tanggalNota,
      NamaSupplier: namaSupplier,
      NoNpwp: noNpwp,
      IdInvoice: idInvoice,
      Hutang: hutang,
      Ppn: ppn,
      LamaHutang: lamaHutang,
      NilaiNota: nilaiNota,
      TanggalJatuhTempo: tanggalJatuhTempo,
      TanggalBayar: tanggalBayar,
    });

    return res.status(201).json({
      message: "pembelian created",
      Pembelian: sanitizePembelian(pembelian),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create pembelian" });
  }
});

module.exports = router;
