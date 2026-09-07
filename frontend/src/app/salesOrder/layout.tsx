import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sales Order",
  description: "Kelola dokumen dan status Sales Order.",
};

export default function SalesOrderLayout({ children }: { children: ReactNode }) {
  return children;
}
