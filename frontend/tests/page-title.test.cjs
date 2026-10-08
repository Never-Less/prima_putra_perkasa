/* eslint-disable @typescript-eslint/no-require-imports -- Execute shared TS helpers with the existing compiler. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  module._compile(outputText, filename);
};
const { getPageTitleKey, createPageMetadata, formatPageTitle } = require("../src/app/_lib/page-title.ts");
const { messages } = require("../src/app/_i18n/messages.ts");

test("every page, including forms and exports, has a localized title and server metadata", () => {
  const app = path.resolve(__dirname, "../src/app");
  const pages = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (entry.name === "page.tsx") pages.push(filename);
    }
  }
  visit(app);
  for (const filename of pages) {
    const route = "/" + path.relative(app, path.dirname(filename)).split(path.sep).join("/");
    const key = getPageTitleKey(route);
    assert.ok(key, `Missing title for ${route}`);
    for (const locale of ["id", "en"]) assert.ok(messages[locale][key], `${locale}: ${route}`);
    assert.equal(createPageMetadata(route).title, messages.id[key]);
    const layout = route === "/" ? path.join(app, "layout.tsx") : path.join(app, route.split("/")[1], "layout.tsx");
    assert.match(fs.readFileSync(layout, "utf8"), /export const metadata/, route);
  }
  assert.ok(pages.length > 0);
});

test("Invoice and nested routes retain their page name regardless of list filters", () => {
  assert.equal(createPageMetadata("/invoice").title, "Invoice");
  assert.equal(createPageMetadata("/invoice/form").title, "Invoice");
  assert.equal(createPageMetadata("/invoice/export/123").title, "Invoice");
  assert.equal(getPageTitleKey("/supplier-registration"), "supplierOnboarding.publicTitle");
  assert.equal(getPageTitleKey("/supplier/form"), "nav.supplier");
  assert.equal(getPageTitleKey("/unknown"), undefined);
});

test("tab titles keep the page name, optional document detail, and brand", () => {
  assert.equal(formatPageTitle("Invoice", "Prima Putra Perkasa"), "Invoice | Prima Putra Perkasa");
  assert.equal(formatPageTitle("Invoice", "Prima Putra Perkasa", " INV-001 "), "Invoice - INV-001 | Prima Putra Perkasa");
  assert.equal(formatPageTitle("Beranda", "Prima Putra Perkasa", " "), "Beranda | Prima Putra Perkasa");
});
