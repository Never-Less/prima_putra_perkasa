function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parsePriceListPayload(body = {}) {
  const namaBarang = String(body.namaBarang || "").trim();
  const hargaJual = parseNumber(body.hargaJual);
  const tanggalJual = parseDate(body.tanggalJual);
  const idCustomer = String(body.idCustomer || "").trim();
  const namaCustomer = String(body.namaCustomer || "").trim();
  const unit = String(body.unit || "").trim();
  const deskripsi = String(body.deskripsi || "").trim();
  const historyRows = Array.isArray(body.riwayatPembelian) ? body.riwayatPembelian : [];
  const riwayatPembelian = historyRows.map((row) => ({
    sumber: String(row?.sumber || "").trim(),
    tanggal: parseDate(row?.tanggal),
    hargaBeli: parseNumber(row?.hargaBeli),
  }));

  if (!namaBarang || !tanggalJual || !namaCustomer || !unit || hargaJual === null) {
    return { error: "Lengkapi nama barang, customer, unit, tanggal, dan harga jual." };
  }

  if (hargaJual < 0) {
    return { error: "Harga jual tidak boleh kurang dari 0." };
  }

  const invalidHistory = riwayatPembelian.some(
    (row) => !row.sumber || !row.tanggal || row.hargaBeli === null || row.hargaBeli < 0
  );

  if (invalidHistory) {
    return { error: "Lengkapi sumber, tanggal, dan harga beli pada seluruh riwayat pembelian." };
  }

  return {
    payload: {
      namaBarang,
      hargaJual,
      tanggalJual,
      idCustomer: idCustomer || null,
      namaCustomer,
      unit,
      deskripsi,
      riwayatPembelian,
    },
  };
}

module.exports = { parsePriceListPayload };
