const { isDocumentCorrectionModeEnabled } = require("../config/document-validation");

const documentValidationWarningCode = "DOCUMENT_VALIDATION_WARNING";

function shouldContinueAfterValidationWarning(req) {
  return (
    isDocumentCorrectionModeEnabled() &&
    req.body?.continueOnValidationWarning === true
  );
}

function respondToDocumentValidation(req, res, message) {
  if (shouldContinueAfterValidationWarning(req)) {
    return false;
  }

  const correctionModeEnabled = isDocumentCorrectionModeEnabled();
  const payload = { message };

  if (correctionModeEnabled) {
    payload.code = documentValidationWarningCode;
    payload.canContinue = true;
  }

  res.status(409).json(payload);
  return true;
}

module.exports = {
  documentValidationWarningCode,
  respondToDocumentValidation,
  shouldContinueAfterValidationWarning,
};
