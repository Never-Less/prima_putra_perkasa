const express = require("express");

const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId, normalizeBarangList, parseDate } = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "invalid surat jalan id" });
  }

  const updates = {};

  if (req.body.noSuratJalan !== undefined) {
    updates.noSuratJalan = String(req.body.noSuratJalan || "").trim();
  }

  if (req.body.noPo !== undefined) {
    updates.noPo = String(req.body.noPo || "").trim();
  }

  if (req.body.tanggal !== undefined) {
    const tanggal = parseDate(req.body.tanggal);
    if (!tanggal) {
      return res.status(400).json({ message: "tanggal tidak valid" });
    }
    updates.tanggal = tanggal;
  }

  if (req.body.idCustomer !== undefined) {
    const idCustomer = String(req.body.idCustomer || "").trim();

    if (!isValidId(idCustomer)) {
      return res.status(400).json({ message: "idCustomer tidak valid" });
    }

    updates.idCustomer = idCustomer;
  }

  if (req.body.barang !== undefined) {
    const barang = normalizeBarangList(req.body.barang);
    if (!barang) {
      return res.status(400).json({
        message: "barang harus array minimal 1 item (nama, jumlah)",
      });
    }
    updates.barang = barang;
  }

  if (req.body.kendaraan !== undefined) {
    updates.kendaraan = String(req.body.kendaraan || "").trim();
  }

  if (req.body.tipe !== undefined) {
    const tipe = String(req.body.tipe || "")
      .trim()
      .toLowerCase();

    if (!["partial", "non partial"].includes(tipe)) {
      return res.status(400).json({ message: "tipe harus partial atau non partial" });
    }

    updates.tipe = tipe;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message:
        "minimal kirim salah satu field: noSuratJalan, noPo, tanggal, idCustomer, barang, kendaraan, tipe",
    });
  }

  if (
    (updates.noSuratJalan !== undefined && !updates.noSuratJalan) ||
    (updates.noPo !== undefined && !updates.noPo) ||
    (updates.kendaraan !== undefined && !updates.kendaraan)
  ) {
    return res.status(400).json({
      message: "noSuratJalan, noPo, dan kendaraan tidak boleh kosong",
    });
  }

  try {
    if (updates.idCustomer) {
      const customer = await Customer.findById(updates.idCustomer);
      if (!customer) {
        return res.status(404).json({ message: "customer tidak ditemukan" });
      }
    }

    const suratJalan = await SuratJalan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!suratJalan) {
      return res.status(404).json({ message: "surat jalan not found" });
    }

    await SuratJalan.updateMany(
      { noPo: suratJalan.noPo },
      {
        $set: {
          tipe: suratJalan.tipe,
        },
      }
    );

    return res.json({
      message: "surat jalan updated",
      suratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to update surat jalan" });
  }
});

module.exports = router;
