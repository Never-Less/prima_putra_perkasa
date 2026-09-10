const { documentMutation } = require("../../utils/document-mutation");
const express = require("express");

const { Customer } = require("../../models/Customer");
const { SuratJalan } = require("../../models/SuratJalan");
const { sanitizeSuratJalan } = require("./sanitize-surat-jalan");
const { isValidId, normalizeBarangList, parseDate } = require("./validators");
const { validateDeliveryAgainstSalesOrder } = require("../../utils/delivery-validation");

const router = express.Router();

router.post("/", documentMutation(async (req, res) => {
  const noSuratJalan = String(req.body.noSuratJalan || "").trim();
  const noPo = String(req.body.noPo || "").trim();
  const tanggal = parseDate(req.body.tanggal);
  const idCustomer = String(req.body.idCustomer || "").trim();
  const barang = normalizeBarangList(req.body.barang, {
    defaultKodeDepartemen: req.body.kodeDepartemen,
  });
  const kendaraan = String(req.body.kendaraan || "").trim();

  if (!noSuratJalan || !noPo || !tanggal || !idCustomer || !barang || !kendaraan) {
    return res.status(400).json({
      message:
        "Lengkapi No. Surat Jalan, No. SO, tanggal, customer, barang, dan kendaraan sebelum menyimpan.",
    });
  }


  if (!isValidId(idCustomer)) {
    return res.status(400).json({ message: "Customer yang dipilih tidak valid." });
  }

  try {
    const customer = await Customer.findById(idCustomer);
    if (!customer) {
      return res.status(404).json({ message: "Customer yang dipilih tidak ditemukan." });
    }

    const deliveryError = await validateDeliveryAgainstSalesOrder({ noPo, customerId: idCustomer, barang });
    if (deliveryError) return res.status(409).json({ message: deliveryError });

    const existingNoPoSuratJalan = await SuratJalan.findOne({ noPo })
      .select("idCustomer")
      .lean();
    if (existingNoPoSuratJalan) {
      const existingIdCustomer = String(existingNoPoSuratJalan.idCustomer || "").trim();

      if (existingIdCustomer && existingIdCustomer !== idCustomer) {
        return res.status(409).json({
          message: "No. SO ini sudah terhubung ke customer lain.",
        });
      }
    }

    const existingSuratJalan = await SuratJalan.findOne({ noSuratJalan }).select("_id").lean();
    if (existingSuratJalan) {
      return res.status(409).json({ message: "No. Surat Jalan ini sudah digunakan." });
    }

    const suratJalan = await SuratJalan.create({
      noSuratJalan,
      noPo,
      tanggal: tanggal,
      idCustomer,
      barang: barang,
      kendaraan: kendaraan,
    });


    return res.status(201).json({
      message: "surat jalan created",
      suratJalan: sanitizeSuratJalan(suratJalan),
    });
  } catch (error) {
    if (error?.hasErrorLabel?.("TransientTransactionError")) throw error;
    if (error?.code === 11000 && error?.keyPattern?.noSuratJalan) {
      return res.status(409).json({ message: "No. Surat Jalan ini sudah digunakan." });
    }

    return res.status(500).json({ message: "Data surat jalan belum bisa disimpan. Coba lagi." });
  }
}));

module.exports = router;
