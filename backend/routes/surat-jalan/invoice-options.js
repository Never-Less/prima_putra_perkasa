const express = require("express");

const { SuratJalan } = require("../../models/SuratJalan");

const router = express.Router();

function normalizeBarangOptions(value, defaultKodeDepartemen = "", noSuratJalan = "") {
  if (!Array.isArray(value)) {
    return [];
  }

  const fallbackKodeDepartemen = String(defaultKodeDepartemen || "").trim();

  return value
    .map((item, index) => {
      const nama = String(item?.nama || "").trim();
      const spesifikasi = String(item?.spesifikasi || "").trim();
      const kodeDepartemen = String(item?.kodeDepartemen || fallbackKodeDepartemen).trim();
      const jumlah = Number(item?.jumlah);
      const unit = String(item?.unit || "").trim();
      const barangId = String(item?._id || item?.id || "").trim() ||
        `legacy:${String(noSuratJalan || "").trim()}:${index}`;

      if (!nama || !Number.isFinite(jumlah) || jumlah <= 0) {
        return null;
      }

      return {
        barangId,
        nama,
        spesifikasi,
        kodeDepartemen,
        jumlah,
        unit,
      };
    })
    .filter((item) => Boolean(item));
}

router.get("/invoice-options", async (_req, res) => {
  try {
    const suratJalanList = await SuratJalan.find(
      {},
      "noPo noSuratJalan idCustomer barang kodeDepartemen"
    )
      .sort({ noPo: 1, noSuratJalan: 1 })
      .lean();

    const groupMap = new Map();

    suratJalanList.forEach((item) => {
      const noPo = String(item?.noPo || "").trim();
      const noSuratJalan = String(item?.noSuratJalan || "").trim();
      const idCustomer = String(item?.idCustomer || "").trim();
      const suratJalanId = String(item?._id || "").trim();
      const barang = normalizeBarangOptions(item?.barang, item?.kodeDepartemen, noSuratJalan);

      if (!noPo || !noSuratJalan) {
        return;
      }

      const existingGroup = groupMap.get(noPo);

      if (existingGroup) {
        existingGroup.idCustomer = existingGroup.idCustomer || idCustomer;
        existingGroup.noSuratJalanMap.set(noSuratJalan, {
          suratJalanId,
          noSuratJalan,
          barang,
        });
        return;
      }

      groupMap.set(noPo, {
        idCustomer,
        noSuratJalanMap: new Map([
          [
            noSuratJalan,
            {
            noSuratJalan,
            suratJalanId,
            barang,
            },
          ],
        ]),
      });
    });

    const noPoOptions = Array.from(groupMap.entries()).map(([noPo, value]) => {
      const noSuratJalan = Array.from(value.noSuratJalanMap.values()).sort((left, right) =>
        left.noSuratJalan.localeCompare(right.noSuratJalan)
      );

      return {
        noPo,
        idCustomer: value.idCustomer,
        noSuratJalan,
      };
    });

    return res.json({
      noPoOptions,
    });
  } catch (_error) {
    return res.status(500).json({ message: "failed to get surat jalan invoice options" });
  }
});

module.exports = router;
