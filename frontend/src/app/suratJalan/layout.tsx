import type { ReactNode } from "react";
import { createPageMetadata } from "../_lib/page-title";

export const metadata = createPageMetadata("/suratJalan");

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
