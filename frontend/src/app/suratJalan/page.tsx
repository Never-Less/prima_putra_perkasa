"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListViewHeader } from "../_components/list-view-header";
import { FormPreviewStylePage } from "./_components/form-preview-style-page";
import { useI18n } from "../_i18n/provider";
import { buildFormRouteWithReturnPagination, normalizePaginationQueryState } from "../_lib/pagination";

export default function SuratJalanPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortValue, setSortValue] = useState(() => String(searchParams.get("sort") || "updatedDesc"));
  const pagination = normalizePaginationQueryState({ page: searchParams.get("page"), limit: searchParams.get("limit") }, { page: 1, limit: 10 });
  const listState = Object.fromEntries(Array.from(searchParams.entries()).filter(([key]) => !["page", "limit", "returnPage", "returnLimit", "id"].includes(key)));

  return (
    <main className="erp-page">
      <ListViewHeader
        title={t("nav.suratJalan")}
        addLabel={t("common.addPageData", { page: t("nav.suratJalan") })}
        onAdd={() => router.push(buildFormRouteWithReturnPagination("/suratJalan/form", "", pagination, listState))}
      />

      <div className="mt-3 space-y-3">
        <FormPreviewStylePage
          showListAddButton={false}
          sortValue={sortValue}
          onSortChange={setSortValue}
        />
      </div>
    </main>
  );
}
