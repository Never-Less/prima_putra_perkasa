import { ApiRequestError } from "./api-client";

const documentValidationWarningCode = "DOCUMENT_VALIDATION_WARNING";

type DocumentValidationWarningDetails = {
  code?: unknown;
  canContinue?: unknown;
  message?: unknown;
};

export function getDocumentValidationWarning(error: unknown) {
  if (!(error instanceof ApiRequestError) || !error.details || typeof error.details !== "object") {
    return null;
  }

  const details = error.details as DocumentValidationWarningDetails;

  if (details.code !== documentValidationWarningCode || details.canContinue !== true) {
    return null;
  }

  return {
    message:
      typeof details.message === "string" && details.message.trim()
        ? details.message.trim()
        : error.message,
  };
}
