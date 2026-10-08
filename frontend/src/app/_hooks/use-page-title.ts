"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "../_i18n/provider";
import { formatPageTitle } from "../_lib/page-title";

export function usePageTitle(titleKey?: string, detail?: string) {
  const { t } = useI18n();
  const pathname = usePathname();
  useEffect(() => {
    if (titleKey) document.title = formatPageTitle(t(titleKey), t("pageTitle.brand"), detail);
  }, [titleKey, detail, t, pathname]);
}
