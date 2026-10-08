import { createPageMetadata } from "../_lib/page-title";
import type { ReactNode } from "react";

export const metadata = {
  ...createPageMetadata("/salesOrder"),
  description: "Kelola dokumen dan status Sales Order.",
};

export default function SalesOrderLayout({ children }: { children: ReactNode }) {
  return children;
}
