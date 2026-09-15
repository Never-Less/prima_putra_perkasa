const disabledValues = new Set(["0", "false", "no", "off"]);

function isDocumentCorrectionModeEnabled() {
  const value = String(process.env.TEMP_DOCUMENT_CORRECTION_MODE ?? "true")
    .trim()
    .toLowerCase();

  return !disabledValues.has(value);
}

module.exports = {
  isDocumentCorrectionModeEnabled,
};
