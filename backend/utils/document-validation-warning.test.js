const test = require("node:test");
const assert = require("node:assert/strict");

const {
  documentValidationWarningCode,
  respondToDocumentValidation,
} = require("./document-validation-warning");

function withCorrectionMode(value, callback) {
  const originalValue = process.env.TEMP_DOCUMENT_CORRECTION_MODE;
  process.env.TEMP_DOCUMENT_CORRECTION_MODE = value;

  try {
    callback();
  } finally {
    if (originalValue === undefined) {
      delete process.env.TEMP_DOCUMENT_CORRECTION_MODE;
    } else {
      process.env.TEMP_DOCUMENT_CORRECTION_MODE = originalValue;
    }
  }
}

function createResponseRecorder() {
  return {
    statusCode: null,
    payload: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test("validation failure becomes a continuable warning in correction mode", () => {
  withCorrectionMode("true", () => {
    const response = createResponseRecorder();
    const responded = respondToDocumentValidation({ body: {} }, response, "Data tidak sesuai.");

    assert.equal(responded, true);
    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.payload, {
      message: "Data tidak sesuai.",
      code: documentValidationWarningCode,
      canContinue: true,
    });
  });
});

test("explicit continuation bypasses validation only in correction mode", () => {
  withCorrectionMode("true", () => {
    const response = createResponseRecorder();
    const responded = respondToDocumentValidation(
      { body: { continueOnValidationWarning: true } },
      response,
      "Data tidak sesuai."
    );

    assert.equal(responded, false);
    assert.equal(response.statusCode, null);
  });
});

test("validation remains blocking when correction mode is disabled", () => {
  withCorrectionMode("false", () => {
    const response = createResponseRecorder();
    const responded = respondToDocumentValidation(
      { body: { continueOnValidationWarning: true } },
      response,
      "Data tidak sesuai."
    );

    assert.equal(responded, true);
    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.payload, { message: "Data tidak sesuai." });
  });
});
