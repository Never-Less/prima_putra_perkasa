const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeBarangList, parseBarangList } = require("./validators");

const validItem = {
  namaBarang: "Cable",
  spesifikasi: "NYY",
  kuantitas: 10,
  unit: "METER",
  hargaSatuan: 5000,
  noPoManual: "SO-TEST",
  sources: [],
};

test("Invoice item order defaults by row, sorts, and renumbers sequentially", () => {
  const legacyItems = normalizeBarangList([
    validItem,
    { ...validItem, namaBarang: "Connector" },
  ]);
  assert.deepEqual(legacyItems.map((item) => item.urutan), [1, 2]);

  const customItems = normalizeBarangList([
    { ...validItem, urutan: 20 },
    { ...validItem, urutan: 10, namaBarang: "Connector" },
  ]);
  assert.deepEqual(customItems.map((item) => item.urutan), [1, 2]);
  assert.deepEqual(customItems.map((item) => item.namaBarang), ["Connector", "Cable"]);
});

test("Invoice empty order numbers use their original row position", () => {
  const items = normalizeBarangList([
    { ...validItem, urutan: 10 },
    { ...validItem, namaBarang: "Connector" },
  ]);

  assert.deepEqual(items.map((item) => item.namaBarang), ["Connector", "Cable"]);
  assert.deepEqual(items.map((item) => item.urutan), [1, 2]);
});

test("Invoice item order rejects invalid and duplicate numbers", () => {
  assert.equal(normalizeBarangList([{ ...validItem, urutan: 0 }]), null);
  assert.equal(normalizeBarangList([{ ...validItem, urutan: 1.5 }]), null);
  assert.equal(
    normalizeBarangList([
      { ...validItem, urutan: 1 },
      { ...validItem, urutan: 1, namaBarang: "Connector" },
    ]),
    null
  );
});

test("Invoice duplicate order validation identifies both rows", () => {
  const result = parseBarangList([
    { ...validItem, urutan: 7 },
    { ...validItem, urutan: 7, namaBarang: "Connector" },
  ]);

  assert.equal(
    result.error,
    "Baris 2 (Connector): nomor urutan 7 sudah digunakan pada baris 1."
  );
});

test("Invoice invalid order validation identifies its row and value", () => {
  const result = parseBarangList([
    validItem,
    { ...validItem, urutan: 1.5, namaBarang: "Connector" },
  ]);

  assert.equal(
    result.error,
    "Baris 2 (Connector): nomor urutan harus berupa bilangan bulat lebih besar dari 0 (nilai: 1.5)."
  );
});
