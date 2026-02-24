const express = require("express");

const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId, normalizeBarangList, parseBoolean, parseDate } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const NoSuratJalan = String(req.body.NoSuratJalan || "").trim();
  const NoPO = String(req.body.NoPO || "").trim();
  const tanggal = parseDate(req.body.Tanggal);
  const IdCustomer = String(req.body.IdCustomer || "").trim();
  const barang = normalizeBarangList(req.body.Barang);
  const kendaraan = String(req.body.Kendaraan || "").trim();
  const tipe = String(req.body.Tipe || "")
    .trim()
    .toLowerCase();

  let SudahSelesai = false;
  if (req.body.SudahSelesai !== undefined) {
    const parsed = parseBoolean(req.body.SudahSelesai);
    if (parsed === null) {
      return res.status(400).json({ message: "SudahSelesai harus boolean" });
    }
    SudahSelesai = parsed;
  }

  if (!NoSuratJalan || !NoPO || !tanggal || !IdCustomer || !barang || !kendaraan || !tipe) {
    return res.status(400).json({
      message:
        "NoSuratJalan, NoPO, Tanggal, IdCustomer, Barang, Kendaraan, dan Tipe wajib diisi",
    });
  }

  if (!["partial", "non partial"].includes(tipe)) {
    return res.status(400).json({
      message: "Tipe harus partial atau non partial",
    });
  }

  if (!isValidId(IdCustomer)) {
    return res.status(400).json({ message: "IdCustomer tidak valid" });
  }

  try {
    const customer = await Customer.findById(IdCustomer);
    if (!customer) {
      return res.status(404).json({ message: "customer tidak ditemukan" });
    }

    const suratJalan = await SuratJalan.create({
      NoSuratJalan,
      NoPO,
      Tanggal: tanggal,
      IdCustomer,
      Barang: barang,
      Kendaraan: kendaraan,
      Tipe: tipe,
      SudahSelesai,
    });

    return res.status(201).json({
      message: "surat jalan created",
      SuratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create surat jalan" });
  }
});

module.exports = router;
