export type SupplierDocument = { id: string; name: string; size: number };
export type SupplierDocumentLink = { label: string; url: string };
export function isSupplierDocumentUrl(url: string) {
  try {
    const parsed = new URL(url);
    return /^https?:\/\//i.test(url) && ["http:", "https:"].includes(parsed.protocol) && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch { return false; }
}
export const maxSupplierFiles = 5;
export const maxSupplierFileSize = 5 * 1024 * 1024;

export function supplierRequestBody(payload: unknown, files: File[] = []) {
  if (!files.length) return payload;
  const body = new FormData();
  body.append("payload", JSON.stringify(payload));
  files.forEach((file) => body.append("documents", file));
  return body;
}

export function splitSupplierTags(value: string) {
  return [...new Map(value.split(/[,\n]/).map((part) => part.trim()).filter(Boolean).map((part) => [part.toLocaleLowerCase(), part])).values()];
}
