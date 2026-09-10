/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS is needed for the TypeScript require hook in this Node test. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

// Run the actual TypeScript helpers with the existing TypeScript dependency.
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
const {
  buildInvoiceBarangRowsFromSuratJalanSelection: select,
  invoiceBarangRowsToList: toList,
} = require("../src/app/invoice/_lib/invoice.ts");

const name = 'SHOCK DRAT DALAM PVC 1"';
const item = (jumlah, hargaSatuan, barangId) => ({
  barangId, nama: name, spesifikasi: "", kodeDepartemen: "", jumlah, unit: "PCS", hargaSatuan,
});
const soItems = [item(2, 8000, "so-1"), item(12, 11000, "so-2")];
const delivery = (number, items) => ({ suratJalanId: number, noSuratJalan: number, barang: items });
const options = (deliveries, barang = soItems) => [{ noPo: "26004730", idCustomer: "customer", barang, noSuratJalan: deliveries }];
const prefill = soItems.map((row) => ({
  namaBarang: row.nama, spesifikasi: "", kuantitas: String(row.jumlah), unit: row.unit,
  hargaSatuan: String(row.hargaSatuan), noPoManual: "26004730", sources: [],
}));

test("SO 26004730: selecting a delivery preserves both quantities and different prices", () => {
  const sj = delivery("SJ-1", [item(2, 0, "sj-1"), item(12, 0, "sj-2")]);
  const rows = select(options([sj]), ["26004730"], ["SJ-1"], prefill);
  const result = toList(rows);
  assert.deepEqual(result.map((row) => [row.kuantitas, row.hargaSatuan, row.jumlah]), [[2, 8000, 16000], [12, 11000, 132000]]);
  assert.deepEqual(result.map((row) => row.sources[0].barangId), ["sj-1", "sj-2"]);
  assert.equal(result.reduce((total, row) => total + row.jumlah, 0), 148000);
  assert.equal(rows.at(-1).namaBarang, "");
});

test("selecting only the second delivery uses its matching SO price", () => {
  const sj = delivery("SJ-2", [item(12, 0, "sj-2")]);
  assert.equal(toList(select(options([sj]), ["26004730"], ["SJ-2"], prefill))[0].hargaSatuan, 11000);
});

test("adding a differently priced delivery does not reuse the first delivery price", () => {
  const data = options([delivery("SJ-1", [item(2, 0, "a")]), delivery("SJ-2", [item(12, 0, "b")])]);
  const current = select(data, ["26004730"], ["SJ-1"], prefill);
  const result = toList(select(data, ["26004730"], ["SJ-1", "SJ-2"], current));
  assert.deepEqual(result.map((row) => row.hargaSatuan), [8000, 11000]);
});

test("SO rows remain separate before a delivery is selected", () => {
  assert.deepEqual(toList(select(options([]), ["26004730"], [], prefill)).map((row) => [row.kuantitas, row.hargaSatuan]), [[2, 8000], [12, 11000]]);
});

test("changing delivery selection preserves edited prices by source", () => {
  const sj1 = delivery("SJ-1", [item(2, 0, "sj-1"), item(12, 0, "sj-2")]);
  const sj2 = delivery("SJ-2", [item(1, 0, "sj-3")]);
  const data = options([sj1, sj2]);
  const current = select(data, ["26004730"], ["SJ-1"], prefill);
  current[1].hargaSatuan = "12000";
  const result = toList(select(data, ["26004730"], ["SJ-1", "SJ-2"], current));
  assert.equal(result.find((row) => row.sources.some((source) => source.barangId === "sj-2")).hargaSatuan, 12000);
  const removed = toList(select(data, ["26004730"], ["SJ-2"], current));
  assert.equal(removed.length, 1);
  assert.equal(removed[0].sources[0].barangId, "sj-3");
});

test("partial deliveries with a unique price retain that price and source quantities", () => {
  const data = options([delivery("SJ-1", [item(3, 0, "a")]), delivery("SJ-2", [item(4, 0, "b")])], [item(10, 8000, "so")]);
  const result = toList(select(data, ["26004730"], ["SJ-1", "SJ-2"]));
  assert.equal(result.reduce((total, row) => total + row.kuantitas, 0), 7);
  assert.ok(result.every((row) => row.hargaSatuan === 8000));
  assert.equal(result.flatMap((row) => row.sources).reduce((total, source) => total + source.kuantitas, 0), 7);
});

test("ambiguous partial quantities do not silently take the first of different prices", () => {
  const data = options([delivery("SJ-1", [item(1, 0, "a")])]);
  assert.equal(select(data, ["26004730"], ["SJ-1"], prefill)[0].hargaSatuan, "");
});
