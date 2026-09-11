const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeBarangList, parseBarangList } = require("./validators");

const validItem = {
  nama: "Cable",
  spesifikasi: "NYY",
  kodeDepartemen: "ENG",
  jumlah: 10,
  unit: "METER",
};

test("Surat Jalan item validation identifies the failing row and field", () => {
  const quantityResult = parseBarangList([
    validItem,
    { ...validItem, nama: "Connector", jumlah: 0 },
  ]);
  assert.equal(
    quantityResult.error,
    "Baris 2 (Connector): jumlah kirim harus lebih besar dari 0 (nilai: 0)."
  );

  const unitResult = parseBarangList([
    { ...validItem, nama: "Adapter", unit: "" },
  ]);
  assert.equal(unitResult.error, "Baris 1 (Adapter): unit wajib diisi.");
});

test("legacy Surat Jalan normalizer keeps returning the normalized array", () => {
  assert.deepEqual(normalizeBarangList([validItem]), [
    {
      urutan: 1,
      ...validItem,
      spesifikasi: validItem.spesifikasi,
    },
  ]);
});

test("Surat Jalan item order defaults by row and rejects duplicates", () => {
  assert.deepEqual(
    parseBarangList([validItem, { ...validItem, nama: "Connector" }]).barang.map((item) => item.urutan),
    [1, 2]
  );

  const duplicateResult = parseBarangList([
    { ...validItem, urutan: 3 },
    { ...validItem, urutan: 3, nama: "Connector" },
  ]);
  assert.equal(
    duplicateResult.error,
    "Baris 2 (Connector): nomor urutan 3 sudah digunakan pada baris 1."
  );
});

test("Surat Jalan items are sorted and renumbered sequentially", () => {
  const result = parseBarangList([
    { ...validItem, urutan: 20 },
    { ...validItem, urutan: 10, nama: "Connector" },
  ]);

  assert.deepEqual(result.barang.map((item) => item.urutan), [1, 2]);
  assert.deepEqual(result.barang.map((item) => item.nama), ["Connector", "Cable"]);
});

test("Surat Jalan empty order numbers use their original row position", () => {
  const result = parseBarangList([
    { ...validItem, urutan: 10 },
    { ...validItem, nama: "Connector" },
  ]);

  assert.deepEqual(result.barang.map((item) => item.nama), ["Connector", "Cable"]);
  assert.deepEqual(result.barang.map((item) => item.urutan), [1, 2]);
});
