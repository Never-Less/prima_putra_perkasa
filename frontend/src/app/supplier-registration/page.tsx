import type { Metadata } from "next";
import { SupplierRegistrationForm } from "./supplier-registration-form";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function SupplierRegistrationPage() {
  return <SupplierRegistrationForm />;
}
