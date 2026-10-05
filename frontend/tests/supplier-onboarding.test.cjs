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
const { normalizeSupplierNumberInput, supplierNpwpPattern } = require("../src/app/supplier/_lib/supplier-contact.ts");
const { supplierRequestBody, splitSupplierTags, isSupplierDocumentUrl } = require("../src/app/supplier/_lib/supplier-documents.ts");
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

test("comma and pasted multiline tags normalize whitespace and duplicates while retaining the final draft", () => {
  assert.deepEqual(splitSupplierTags(" Kabel , Lampu LED, kabel,\nSaklar"), ["kabel", "Lampu LED", "Saklar"]);
  assert.deepEqual(splitSupplierTags(" , ,\n"), []);
  assert.deepEqual(splitSupplierTags("Philips,Panasonic"), ["Philips", "Panasonic"]);
});

test("public multipart requests send the original PDF bytes without internal credentials or a manual boundary", async (t) => {
  const file = new File(["%PDF-1.7\n%%EOF"], "price-list.pdf", { type: "application/pdf" });
  const payload = { productCategories: ["Kabel"], productBrands: ["Philips"], documentLinks: [{ label: "Catalog", url: "https://example.com/catalog.pdf" }] };
  const body = supplierRequestBody(payload, [file]);
  assert.deepEqual(JSON.parse(body.get("payload")), payload);
  assert.equal(await body.get("documents").text(), await file.text());
  assert.deepEqual(supplierRequestBody(payload), payload);
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.body, body);
    assert.equal(new Headers(options.headers).has("Content-Type"), false);
    assert.equal(new Headers(options.headers).has("Authorization"), false);
    assert.equal(options.credentials, "omit");
    return new Response(JSON.stringify({ status: "submitted" }), { status: 200 });
  });
  assert.equal((await requestSupplierForm("a".repeat(64), body)).status, "submitted");
});

test("document URLs support shared-file links and reject executable, malformed, and credentialed URLs", () => {
  assert.equal(isSupplierDocumentUrl("https://drive.google.com/file/d/catalog/view"), true);
  assert.equal(isSupplierDocumentUrl("http://example.com/catalog.pdf"), true);
  for (const url of ["javascript:alert(1)", "data:application/pdf;base64,abc", "https://", "https://user:pass@example.com/file", "file:///catalog.pdf"]) assert.equal(isSupplierDocumentUrl(url), false);
});

test("number inputs keep leading zeros, reject letters, and retain supported legacy NPWP formatting", () => {
  assert.equal(normalizeSupplierNumberInput("021 123-4567", "phone"), "0211234567");
  assert.equal(normalizeSupplierNumberInput("+62 812abc3456789", "whatsapp"), "628123456789");
  assert.equal(normalizeSupplierNumberInput("01.234.567.8-901.000", "npwp"), "01.234.567.8-901.000");
  assert.equal(normalizeSupplierNumberInput("abc0012345678901000", "npwp"), "0012345678901000");
  const pattern = new RegExp(`^${supplierNpwpPattern}$`);
  assert.equal(pattern.test("01.234.567.8-901.000"), true);
  assert.equal(pattern.test("0012345678901000"), true);
  assert.equal(pattern.test("01x234x567x8-901x000"), false);
});
