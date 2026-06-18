const express = require("express");

const { Invoice } = require("../../models/Invoice");
const { Pembelian } = require("../../models/Pembelian");
const { Supplier } = require("../../models/Supplier");
const { sanitizePembelian } = require("./sanitize-pembelian");
const { isValidId, parseBoolean, parseDate, parseNumber } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const tanggalNota = parseDate(req.body.tanggalNota);
  const namaSupplier = String(req.body.namaSupplier || "").trim();
  let idSupplier = null;
  const noNota = String(req.body.noNota || "").trim();
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
      return res.status(400).json({ message: "Invoice yang dipilih tidak valid." });
    }
  }

  if (req.body.idSupplier !== undefined && req.body.idSupplier !== null) {
    idSupplier = String(req.body.idSupplier || "").trim();

    if (idSupplier && !isValidId(idSupplier)) {
      return res.status(400).json({ message: "Supplier yang dipilih tidak valid." });
    }

    if (!idSupplier) {
      idSupplier = null;
    }
  }

  if (!tanggalNota || !namaSupplier || nilaiNota === null) {
    return res.status(400).json({
      message: "Lengkapi tanggal nota, supplier, dan nilai nota sebelum menyimpan.",
    });
  }

  if (hutang === null || ppn === null) {
    return res.status(400).json({ message: "Status hutang atau PPN tidak valid." });
  }

  if (nilaiNota < 0) {
    return res.status(400).json({ message: "Nilai nota harus berupa angka 0 atau lebih." });
  }

  if (req.body.tanggalJatuhTempo !== undefined && req.body.tanggalJatuhTempo !== null && !tanggalJatuhTempo) {
    return res.status(400).json({ message: "Tanggal jatuh tempo tidak dapat dibaca." });
  }

  if (req.body.tanggalBayar !== undefined && req.body.tanggalBayar !== null && !tanggalBayar) {
    return res.status(400).json({ message: "Tanggal bayar tidak dapat dibaca." });
  }

  if (hutang) {
    if (!tanggalJatuhTempo) {
      return res
        .status(400)
        .json({ message: "Isi tanggal jatuh tempo saat status hutang aktif." });
    }

    if (lamaHutang === null || lamaHutang <= 0) {
      return res
        .status(400)
        .json({ message: "Isi lama hutang lebih dari 0 hari saat status hutang aktif." });
    }
  } else {
    lamaHutang = 0;
    tanggalJatuhTempo = null;
  }

  if (tanggalBayar && tanggalBayar < tanggalNota) {
    return res.status(400).json({
      message: "Tanggal bayar tidak boleh lebih awal dari tanggal nota.",
    });
  }

  try {
    if (idInvoice) {
      const invoice = await Invoice.findById(idInvoice);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice yang dipilih tidak ditemukan." });
      }
    }

    if (idSupplier) {
      const supplier = await Supplier.findById(idSupplier);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier yang dipilih tidak ditemukan." });
      }
    }

    const pembelian = await Pembelian.create({
      tanggalNota: tanggalNota,
      namaSupplier: namaSupplier,
      idSupplier: idSupplier,
      noNota: noNota,
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
    return res.status(500).json({ message: "Data pembelian belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
