"use client";

import { usePathname } from "next/navigation";
import { getPageTitleKey } from "../_lib/page-title";
import { usePageTitle } from "../_hooks/use-page-title";

export function AppPageTitle() {
  const pathname = usePathname();
  // Export pages include the document number or reporting period themselves.
  usePageTitle(pathname.split("/").includes("export") ? undefined : getPageTitleKey(pathname));
  return null;
}
