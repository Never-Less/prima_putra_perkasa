"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { useI18n } from "../../_i18n/provider";
import { buildListQueryString, normalizePaginationQueryState, normalizeStringFilterQueryState, type ServerListResult } from "../../_lib/pagination";
import { fetchCustomerById } from "../../customer/_lib/customer";
import { defaultSuratJalanFilter, fetchSuratJalanList, type SuratJalanFilter, type SuratJalanItem } from "../_lib/surat-jalan";
import { SuratJalanTableFilter } from "./surat-jalan-table-filter";

type Props = {
  selectedIds: readonly string[];
  onSelectionChange: (ids: string[]) => void;
};

type TableData = {
  key: string;
  result: ServerListResult<SuratJalanItem>;
  customerNames: Map<string, string>;
  error: boolean;
};

export function PackingListSelectionTable({ selectedIds, onSelectionChange }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = normalizeStringFilterQueryState({ get: (key) => searchParams.get(`packingFilter_${key}`) }, defaultSuratJalanFilter);
  const pagination = normalizePaginationQueryState({ page: searchParams.get("packingPage"), limit: searchParams.get("packingLimit") }, { page: 1, limit: 10 });
  const queryKey = buildListQueryString({ ...filter, ...pagination });
  const query = useMemo(() => {
    const params = new URLSearchParams(queryKey);
    return { ...normalizeStringFilterQueryState(params, defaultSuratJalanFilter), ...normalizePaginationQueryState({ page: params.get("page"), limit: params.get("limit") }, { page: 1, limit: 10 }) };
  }, [queryKey]);
  const activeFilter = useMemo(() => normalizeStringFilterQueryState(new URLSearchParams(queryKey), defaultSuratJalanFilter), [queryKey]);
  const [data, setData] = useState<TableData | null>(null);
  const [retry, setRetry] = useState(0);
  const ready = data?.key === queryKey;
  const rows = ready ? data.result.items : [];

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await fetchSuratJalanList(query);
        const customerIds = Array.from(new Set(result.items.map((row) => row.idCustomer)));
        const customers = await Promise.all(customerIds.map(fetchCustomerById));
        const customerNames = new Map<string, string>();
        customers.forEach((customer) => { if (customer) customerNames.set(customer.id, customer.nama); });
        if (active) setData({ key: queryKey, result, customerNames, error: false });
      } catch {
        if (active) setData({ key: queryKey, result: { items: [], totalRows: 0, pagination: { ...query, totalPages: 1, totalItems: 0 } }, customerNames: new Map(), error: true });
      }
    }
    void load();
    return () => { active = false; };
  }, [query, queryKey, retry]);

  function updateQuery(values: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (String(value)) params.set(key, String(value));
      else params.delete(key);
    });
    router.push(`/suratJalan/export/packing-list?${params.toString()}`, { scroll: false });
  }

  function toggle(id: string) {
    onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  }

  function togglePage() {
    const pageIds = new Set(rows.map((row) => row.id));
    onSelectionChange(rows.every((row) => selectedIds.includes(row.id))
      ? selectedIds.filter((id) => !pageIds.has(id))
      : Array.from(new Set([...selectedIds, ...pageIds])));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium" aria-live="polite">{t("packingList.selectedCount", { count: selectedIds.length })}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="erp-button" disabled={!rows.length} onClick={togglePage}>{t("packingList.selectPage")}</button>
          <button type="button" className="erp-button" disabled={!selectedIds.length} onClick={() => onSelectionChange([])}>{t("packingList.clearSelection")}</button>
        </div>
      </div>
      {!ready ? <ApiLoadingState /> : null}
      {ready && data.error ? <div role="alert" className="text-sm text-red-600">{t("packingList.loadError")} <button type="button" className="underline" onClick={() => { setData(null); setRetry((value) => value + 1); }}>{t("packingList.retry")}</button></div> : null}
      <SuratJalanTableFilter
        rows={rows}
        filter={activeFilter}
        filteredCount={ready ? data.result.totalRows : 0}
        pagination={ready ? data.result.pagination : { ...pagination, totalPages: pagination.page, totalItems: 0 }}
        selection={{ ids: selectedIds, onToggle: toggle, onTogglePage: togglePage }}
        onSelectRow={(row) => toggle(row.id)}
        resolveCustomerLabel={(id) => ready ? data.customerNames.get(id) || id : id}
        onFilterChange={(key: keyof SuratJalanFilter, value: string) => updateQuery({ [`packingFilter_${key}`]: value, packingPage: 1 })}
        onApplyFilter={(nextFilter) => updateQuery({ ...Object.fromEntries(Object.entries(nextFilter).map(([key, value]) => [`packingFilter_${key}`, value])), packingPage: 1 })}
        onResetFilter={() => updateQuery({ ...Object.fromEntries(Object.keys(defaultSuratJalanFilter).map((key) => [`packingFilter_${key}`, ""])), packingPage: 1 })}
        onPageChange={(page) => updateQuery({ packingPage: page })}
        onPageSizeChange={(limit) => updateQuery({ packingPage: 1, packingLimit: limit })}
        colorTone="sky"
        tableStyle="compact"
      />
    </div>
  );
}
