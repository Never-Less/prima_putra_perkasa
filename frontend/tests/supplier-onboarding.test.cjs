/* eslint-disable @typescript-eslint/no-require-imports -- Run the actual TS helpers through the existing compiler. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
const { defaultSupplierFilter, fetchSupplierList } = require("../src/app/supplier/_lib/supplier.ts");
const { requestSupplierForm } = require("../src/app/supplier/_lib/supplier-onboarding.ts");
const {
  buildFormRouteWithReturnPagination, buildListRouteWithPagination,
  normalizeReturnPaginationQueryState, normalizeStringFilterQueryState,
} = require("../src/app/_lib/pagination.ts");

test("supplier review return URL restores onboarding status, all filters, sort, page and page size", () => {
  const filter = { ...defaultSupplierFilter, namaSupplier: "Senjaya & Elektronik", hutang: "true", lamaHutangMin: "10", lamaHutangMax: "30", onboardingStatus: "submitted" };
  const list = { ...filter, sort: "nameAsc" };
  const pagination = { page: 3, limit: 25 };
  const form = new URL(buildFormRouteWithReturnPagination("/supplier/form", "supplier-1", pagination, list), "https://example.com");
  const params = form.searchParams;
  const restoredFilter = normalizeStringFilterQueryState(params, defaultSupplierFilter);
  const restoredPagination = normalizeReturnPaginationQueryState({ returnPage: params.get("returnPage"), returnLimit: params.get("returnLimit") }, { page: 1, limit: 10 });
  const restored = buildListRouteWithPagination("/supplier", restoredPagination, { ...restoredFilter, sort: params.get("sort") });
  assert.equal(restored, buildListRouteWithPagination("/supplier", pagination, list));
});

test("supplier list forwards onboarding filter and sort to the server", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    const params = new URL(url).searchParams;
    assert.equal(params.get("onboardingStatus"), "submitted");
    assert.equal(params.get("sort"), "nameAsc");
    assert.equal(params.get("page"), "2");
    return new Response(JSON.stringify({ suppliers: [], pagination: { page: 2, limit: 25, totalItems: 0, totalPages: 1 } }), { status: 200 });
  });
  await fetchSupplierList({ ...defaultSupplierFilter, onboardingStatus: "submitted", sort: "nameAsc", page: 2, limit: 25 });
});

test("public requests never read internal credentials, cache responses, or send cookies", async (t) => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem() { throw new Error("Public form accessed internal credentials"); } } } });
  t.after(() => { if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else delete globalThis.window; });
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(new Headers(options.headers).has("Authorization"), false);
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    assert.equal(options.referrerPolicy, "no-referrer");
    return new Response(JSON.stringify({ status: "generated", namaSupplier: "Senjaya Elektronik" }), { status: 200 });
  });
  assert.equal((await requestSupplierForm("a".repeat(64))).namaSupplier, "Senjaya Elektronik");
});
