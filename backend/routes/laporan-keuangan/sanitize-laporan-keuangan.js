function sanitizeLaporanKeuangan(laporanKeuangan) {
  const rincianBiaya = Array.isArray(laporanKeuangan.rincianBiaya)
    ? laporanKeuangan.rincianBiaya.map((row) => ({
        namaBiaya: row.namaBiaya,
        jumlah: row.jumlah,
      }))
    : [];
  const totalBiayaOperasional = rincianBiaya.reduce(
    (total, row) => total + (Number(row.jumlah) || 0),
    0
  );

  return {
    id: laporanKeuangan._id,
    bulan: laporanKeuangan.bulan,
    rincianBiaya,
    totalBiayaOperasional,
    createdAt: laporanKeuangan.createdAt,
    updatedAt: laporanKeuangan.updatedAt,
  };
}

module.exports = {
  sanitizeLaporanKeuangan,
};
