const express = require("express");

const { PurchaseOrder } = require("../../models/PurchaseOrder");
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
        urutan: Number.isInteger(Number(item?.urutan)) && Number(item.urutan) > 0 ? Number(item.urutan) : index + 1,
        nama,
        spesifikasi,
        kodeDepartemen,
        jumlah,
        unit,
      };
    })
    .filter((item) => Boolean(item))
    .sort((left, right) => left.urutan - right.urutan);
}

function normalizeSalesOrderBarangOptions(value, noPo = "") {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedNoPo = String(noPo || "").trim();

  return value
    .map((item, index) => {
      const nama = String(item?.namaBarang || "").trim();
      const spesifikasi = String(item?.spesifikasi || "").trim();
      const jumlah = Number(item?.kuantitas);
      const unit = String(item?.unit || "").trim();
      const hargaSatuan = Number(item?.hargaSatuan);

      if (!nama || !Number.isFinite(jumlah) || jumlah <= 0) {
        return null;
      }

      return {
        barangId: `sales-order:${normalizedNoPo}:${index + 1}`,
        urutan: Number.isInteger(Number(item?.urutan)) && Number(item.urutan) > 0 ? Number(item.urutan) : index + 1,
        nama,
        spesifikasi,
        kodeDepartemen: "",
        jumlah,
        unit,
        hargaSatuan: Number.isFinite(hargaSatuan) ? hargaSatuan : 0,
      };
    })
    .filter((item) => Boolean(item))
    .sort((left, right) => left.urutan - right.urutan);
}

router.get("/invoice-options", async (_req, res) => {
  try {
    const [purchaseOrderList, suratJalanList] = await Promise.all([
      PurchaseOrder.find({}, "noPo namaCustomer barang createdAt")
        .sort({ noPo: 1, createdAt: -1 })
        .lean(),
      SuratJalan.find(
        {},
        "noPo noSuratJalan idCustomer barang kodeDepartemen"
      )
        .sort({ noPo: 1, noSuratJalan: 1 })
        .lean(),
    ]);

    const groupMap = new Map();

    purchaseOrderList.forEach((item) => {
      const noPo = String(item?.noPo || "").trim();
      const idCustomer = String(item?.namaCustomer || "").trim();
      const barang = normalizeSalesOrderBarangOptions(item?.barang, noPo);

      if (!noPo) {
        return;
      }

      const existingGroup = groupMap.get(noPo);

      if (existingGroup) {
        existingGroup.idCustomer = existingGroup.idCustomer || idCustomer;

        if (existingGroup.barang.length === 0 && barang.length > 0) {
          existingGroup.barang = barang;
        }

        return;
      }

      groupMap.set(noPo, {
        idCustomer,
        barang,
        noSuratJalanMap: new Map(),
      });
    });

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
        barang: [],
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
        barang: value.barang,
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
