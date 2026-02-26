const express = require("express");

const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId, normalizeBarangList, parseBoolean, parseDate } = require("./validators");

const router = express.Router();

router.post("/", async (req, res) => {
  const noSuratJalan = String(req.body.noSuratJalan || "").trim();
  const noPo = String(req.body.noPo || "").trim();
  const tanggal = parseDate(req.body.tanggal);
  const idCustomer = String(req.body.idCustomer || "").trim();
  const barang = normalizeBarangList(req.body.barang);
  const kendaraan = String(req.body.kendaraan || "").trim();
  const tipe = String(req.body.tipe || "")
    .trim()
    .toLowerCase();

  let sudahSelesai = false;
  if (req.body.sudahSelesai !== undefined) {
    const parsed = parseBoolean(req.body.sudahSelesai);
    if (parsed === null) {
      return res.status(400).json({ message: "sudahSelesai harus boolean" });
    }
    sudahSelesai = parsed;
  }

  if (!noSuratJalan || !noPo || !tanggal || !idCustomer || !barang || !kendaraan || !tipe) {
    return res.status(400).json({
      message:
        "noSuratJalan, noPo, tanggal, idCustomer, barang, kendaraan, dan tipe wajib diisi",
    });
  }

  if (!["partial", "non partial"].includes(tipe)) {
    return res.status(400).json({
      message: "tipe harus partial atau non partial",
    });
  }

  if (!isValidId(idCustomer)) {
    return res.status(400).json({ message: "idCustomer tidak valid" });
  }

  try {
    const customer = await Customer.findById(idCustomer);
    if (!customer) {
      return res.status(404).json({ message: "customer tidak ditemukan" });
    }

    const suratJalan = await SuratJalan.create({
      noSuratJalan,
      noPo,
      tanggal: tanggal,
      idCustomer,
      barang: barang,
      kendaraan: kendaraan,
      tipe: tipe,
      sudahSelesai,
    });

    return res.status(201).json({
      message: "surat jalan created",
      suratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to create surat jalan" });
  }
});

module.exports = router;
