import { ApiRequestError, requestApi } from "../../_lib/api-client";

export const onboardingStatuses = ["notGenerated", "generated", "sent", "submitted", "completed"] as const;
export type OnboardingStatus = typeof onboardingStatuses[number];
export type SupplierProfile = {
  alamat: string;
  npwp: string;
  picName: string;
  phone: string;
  whatsapp: string;
  email: string;
  productCategories: string[];
  productBrands: string[];
};
export type SupplierOnboarding = {
  status: OnboardingStatus;
  generatedAt?: string | null;
  expiresAt?: string | null;
  sentAt?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  pendingData?: SupplierProfile | null;
};
export const profileFields = [
  { name: "alamat", label: "supplier.field.alamat", max: 500 },
  { name: "npwp", label: "supplier.field.npwp", max: 30, hint: "supplierOnboarding.npwpHint" },
  { name: "picName", label: "supplier.field.pic", max: 120 },
  { name: "phone", label: "supplier.field.phone", max: 15, hint: "supplierOnboarding.phoneHint" },
  { name: "whatsapp", label: "supplierOnboarding.whatsapp", max: 15, hint: "supplierOnboarding.phoneHint" },
  { name: "email", label: "supplier.field.email", max: 150, hint: "supplierOnboarding.emailHint" },
  { name: "productCategories", label: "supplierOnboarding.productCategories", max: 5000, hint: "supplierOnboarding.categoriesHint" },
  { name: "productBrands", label: "supplierOnboarding.productBrands", max: 5000, hint: "supplierOnboarding.brandsHint" },
] as const;

export function onboardingError(error: unknown) {
  if (error instanceof ApiRequestError && error.details && typeof error.details === "object") {
    const code = (error.details as { code?: string }).code;
    if (code?.startsWith("supplierOnboarding.error.")) return code;
  }
  return "supplierOnboarding.error.generic";
}

export function generateSupplierLink(id: string) {
  return requestApi<{ token: string; expiresAt: string }>(`/api/suppliers/${id}/onboarding/generate`, {
    method: "POST", body: {}, invalidateCachePaths: "/api/suppliers",
  });
}

export function supplierOnboardingAction(id: string, action: "sent" | "approve", body: unknown) {
  return requestApi(`/api/suppliers/${id}/onboarding/${action}`, {
    method: "POST", body, invalidateCachePaths: "/api/suppliers",
  });
}

// Separate public request: never read, refresh, or send an internal user's JWT.
export async function requestSupplierForm<T>(token: string, body?: unknown): Promise<T> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
  const response = await fetch(`${base}/api/supplier-forms/${encodeURIComponent(token)}`, {
    method: body === undefined ? "GET" : "POST", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
    headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiRequestError("Supplier form request failed", response.status, payload);
  return payload as T;
}
