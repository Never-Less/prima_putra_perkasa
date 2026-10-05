const express = require("express");

const { Pembelian } = require("../../models/Pembelian");
const { sanitizePembelian } = require("./sanitize-pembelian");

const router = express.Router();

function calculatePembelianDueDate(pembelian) {
  const storedDueDate = pembelian.tanggalJatuhTempo
    ? new Date(pembelian.tanggalJatuhTempo)
    : null;

  if (storedDueDate && !Number.isNaN(storedDueDate.getTime())) {
    return storedDueDate;
  }

  const tanggalNota = new Date(pembelian.tanggalNota);

  if (Number.isNaN(tanggalNota.getTime())) {
    return null;
  }

  const lamaHutang = Math.max(0, Math.trunc(Number(pembelian.lamaHutang || 0)));
  tanggalNota.setUTCDate(tanggalNota.getUTCDate() + lamaHutang);
  return tanggalNota;
}

router.get("/outstanding", async (req, res) => {
  try {
    const query = {
      hutang: true,
      tanggalBayar: null,
    };
    const supplierId = String(req.query.supplierId || "").trim();
    const dueMonth = String(req.query.dueMonth || "").trim();
    const overdueLevel = String(req.query.overdueLevel || "").trim();

    if (supplierId) {
      query.idSupplier = supplierId;
    }

    const pembelians = await Pembelian.find(query)
      .sort({ tanggalJatuhTempo: 1, tanggalNota: 1 })
      .lean();
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    const rows = pembelians
      .map((pembelian) => {
        const dueDate = calculatePembelianDueDate(pembelian);

        if (!dueDate) {
          return null;
        }

        const dueUtc = Date.UTC(
          dueDate.getUTCFullYear(),
          dueDate.getUTCMonth(),
          dueDate.getUTCDate()
        );
        const overdueDays = Math.max(0, Math.floor((todayUtc - dueUtc) / 86400000));
        const warningLevel = overdueDays > 7 ? "critical" : overdueDays > 3 ? "warning" : "normal";

        return {
          ...sanitizePembelian({ ...pembelian, tanggalJatuhTempo: dueDate }),
          overdueDays,
          warningLevel,
        };
      })
      .filter(Boolean)
      .filter((row) => !dueMonth || String(row.tanggalJatuhTempo).slice(0, 7) === dueMonth)
      .filter((row) => !overdueLevel || row.warningLevel === overdueLevel);

    return res.json({
      pembelians: rows,
      summary: {
        totalRows: rows.length,
        totalHutang: rows.reduce((total, row) => total + Number(row.nilaiNota || 0), 0),
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "Hutang supplier belum bisa dimuat." });
  }
});

module.exports = router;
