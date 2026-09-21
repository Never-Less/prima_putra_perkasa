const test = require("node:test");
const assert = require("node:assert/strict");

const { getPembelianPaymentStatus } = require("./sanitize-pembelian");

test("cash purchases are treated as paid", () => {
  assert.equal(getPembelianPaymentStatus({ hutang: false, tanggalBayar: null }), "paid");
});

test("debt purchases without payment date are treated as unpaid", () => {
  assert.equal(getPembelianPaymentStatus({ hutang: true, tanggalBayar: null }), "unpaid");
});

test("debt purchases with payment date are treated as paid", () => {
  assert.equal(
    getPembelianPaymentStatus({ hutang: true, tanggalBayar: new Date("2026-09-21") }),
    "paid"
  );
});
