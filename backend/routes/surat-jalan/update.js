const express = require("express");

const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId, normalizeBarangList, parseDate } = require("./validators");

const router = express.Router();

router.put("/:id", async (req, res) => {
  const id = String(req.params.id || "");

  if (!isValidId(id)) {
    return res.status(400).json({ message: "Data surat jalan yang dipilih tidak dapat dibuka." });
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
      return res.status(400).json({ message: "Tanggal surat jalan tidak dapat dibaca." });
    }
    updates.tanggal = tanggal;
  }

  if (req.body.idCustomer !== undefined) {
    const idCustomer = String(req.body.idCustomer || "").trim();

    if (!isValidId(idCustomer)) {
      return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
    }

    updates.idCustomer = idCustomer;
  }

  if (req.body.barang !== undefined) {
    const barang = normalizeBarangList(req.body.barang, {
      defaultKodeDepartemen: req.body.kodeDepartemen,
    });
    if (!barang) {
      return res.status(400).json({
        message: "Isi minimal satu barang surat jalan dengan nama barang, jumlah, dan unit yang valid.",
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
      return res.status(400).json({ message: "Pilih tipe surat jalan yang valid." });
    }

    updates.tipe = tipe;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "Tidak ada perubahan yang bisa disimpan. Ubah minimal satu data terlebih dahulu.",
    });
  }

  if (
    (updates.noSuratJalan !== undefined && !updates.noSuratJalan) ||
    (updates.noPo !== undefined && !updates.noPo) ||
    (updates.kendaraan !== undefined && !updates.kendaraan)
  ) {
    return res.status(400).json({
      message: "Lengkapi No. Surat Jalan, No. SO, dan kendaraan sebelum menyimpan.",
    });
  }

  try {
    if (updates.idCustomer) {
      const customer = await Customer.findById(updates.idCustomer);
      if (!customer) {
        return res.status(404).json({ message: "Customer yang dipilih tidak ditemukan." });
      }
    }

    if (updates.noSuratJalan) {
      const existingSuratJalan = await SuratJalan.findOne({
        noSuratJalan: updates.noSuratJalan,
        _id: { $ne: id },
      })
        .select("_id")
        .lean();

      if (existingSuratJalan) {
        return res.status(409).json({ message: "No. Surat Jalan ini sudah digunakan." });
      }
    }

    const suratJalan = await SuratJalan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!suratJalan) {
      return res.status(404).json({ message: "Data surat jalan tidak ditemukan." });
    }

    await SuratJalan.updateMany(
      { noPo: suratJalan.noPo },
      {
        $set: {
          tipe: suratJalan.tipe,
          idCustomer: suratJalan.idCustomer,
        },
      }
    );

    return res.json({
      message: "surat jalan updated",
      suratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.noSuratJalan) {
      return res.status(409).json({ message: "No. Surat Jalan ini sudah digunakan." });
    }

    return res.status(500).json({ message: "Data surat jalan belum bisa disimpan. Coba lagi." });
  }
});

module.exports = router;
