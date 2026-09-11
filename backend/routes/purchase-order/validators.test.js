const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeBarangList, parseBarangList } = require("./validators");

const validItem = {
  namaBarang: "Cable",
  spesifikasi: "NYY",
  kuantitas: 10,
  unit: "METER",
  hargaSatuan: 5000,
  jumlah: 50000,
};

test("Sales Order item validation identifies the failing row and field", () => {
  const quantityResult = parseBarangList([
    validItem,
    { ...validItem, namaBarang: "Connector", kuantitas: 0 },
  ]);
  assert.equal(
    quantityResult.error,
    "Baris 2 (Connector): kuantitas harus lebih besar dari 0 (nilai: 0)."
  );

  const priceResult = parseBarangList([
    { ...validItem, namaBarang: "Adapter", hargaSatuan: "tidak valid" },
  ]);
  assert.equal(
    priceResult.error,
    "Baris 1 (Adapter): harga satuan tidak valid (nilai: tidak valid)."
  );
});

test("legacy Sales Order normalizer keeps returning the normalized array", () => {
  assert.deepEqual(normalizeBarangList([validItem]), [{ urutan: 1, ...validItem }]);
});

test("Sales Order item order defaults by row and rejects duplicates", () => {
  assert.deepEqual(
    parseBarangList([validItem, { ...validItem, namaBarang: "Connector" }]).barang.map((item) => item.urutan),
    [1, 2]
  );

  const duplicateResult = parseBarangList([
    { ...validItem, urutan: 2 },
    { ...validItem, urutan: 2, namaBarang: "Connector" },
  ]);
  assert.equal(
    duplicateResult.error,
    "Baris 2 (Connector): nomor urutan 2 sudah digunakan pada baris 1."
  );
});

test("Sales Order items are sorted and renumbered sequentially", () => {
  const result = parseBarangList([
    { ...validItem, urutan: 20 },
    { ...validItem, urutan: 10, namaBarang: "Connector" },
  ]);

  assert.deepEqual(result.barang.map((item) => item.urutan), [1, 2]);
  assert.deepEqual(result.barang.map((item) => item.namaBarang), ["Connector", "Cable"]);
});

test("Sales Order empty order numbers use their original row position", () => {
  const result = parseBarangList([
    { ...validItem, urutan: 10 },
    { ...validItem, namaBarang: "Connector" },
  ]);

  assert.deepEqual(result.barang.map((item) => item.namaBarang), ["Connector", "Cable"]);
  assert.deepEqual(result.barang.map((item) => item.urutan), [1, 2]);
});
