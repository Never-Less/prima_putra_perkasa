const test = require("node:test");
const assert = require("node:assert/strict");

const { isDocumentCorrectionModeEnabled } = require("./document-validation");

test("document correction mode is temporarily enabled by default", () => {
  const originalValue = process.env.TEMP_DOCUMENT_CORRECTION_MODE;
  delete process.env.TEMP_DOCUMENT_CORRECTION_MODE;

  try {
    assert.equal(isDocumentCorrectionModeEnabled(), true);
  } finally {
    if (originalValue === undefined) {
      delete process.env.TEMP_DOCUMENT_CORRECTION_MODE;
    } else {
      process.env.TEMP_DOCUMENT_CORRECTION_MODE = originalValue;
    }
  }
});

test("document correction mode can be disabled without changing code", () => {
  const originalValue = process.env.TEMP_DOCUMENT_CORRECTION_MODE;

  try {
    for (const value of ["false", "0", "off", "no"]) {
      process.env.TEMP_DOCUMENT_CORRECTION_MODE = value;
      assert.equal(isDocumentCorrectionModeEnabled(), false);
    }
  } finally {
    if (originalValue === undefined) {
      delete process.env.TEMP_DOCUMENT_CORRECTION_MODE;
    } else {
      process.env.TEMP_DOCUMENT_CORRECTION_MODE = originalValue;
    }
  }
});
