const test = require("node:test");
const assert = require("node:assert/strict");

const { assignItemOrder } = require("./backfill-item-order");

test("backfill assigns array positions to legacy items", () => {
  const result = assignItemOrder([{ nama: "A" }, { nama: "B" }, { nama: "C" }]);

  assert.deepEqual(result.items.map((item) => item.urutan), [1, 2, 3]);
  assert.equal(result.changedItems, 3);
});

test("backfill preserves valid unique numbers and repairs duplicates", () => {
  const result = assignItemOrder([
    { nama: "A", urutan: 2 },
    { nama: "B" },
    { nama: "C", urutan: 2 },
    { nama: "D", urutan: 10 },
  ]);

  assert.deepEqual(result.items.map((item) => item.urutan), [2, 1, 3, 10]);
  assert.equal(result.changedItems, 2);
});

test("backfill is idempotent", () => {
  const firstResult = assignItemOrder([{ nama: "A" }, { nama: "B" }]);
  const secondResult = assignItemOrder(firstResult.items);

  assert.equal(secondResult.changedItems, 0);
  assert.deepEqual(secondResult.items, firstResult.items);
});
