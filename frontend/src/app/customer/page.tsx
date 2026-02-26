"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiLoadingState } from "../_components/api-loading-state";
import { ApiRequestError } from "../_lib/api-client";
import { CustomerEditForm } from "./_components/customer-edit-form";
import { CustomerTableFilter } from "./_components/customer-table-filter";
import { fetchCustomerRows, type CustomerItem } from "./_lib/customer";
import { useI18n } from "../_i18n/provider";

export default function CustomerPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<CustomerItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const customerRows = await fetchCustomerRows();

      setRows(customerRows);
      setSelectedId((prevSelectedId) => {
        if (customerRows.some((row) => row.id === prevSelectedId)) {
          return prevSelectedId;
        }

        return customerRows[0]?.id || "";
      });
    } catch (error) {
      setRows([]);
      setSelectedId("");

      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message || t("customer.apiLoadError"));
        return;
      }

      setErrorMessage(t("customer.apiLoadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const selectedRow = useMemo(() => {
    return rows.find((row) => row.id === selectedId) || rows[0];
  }, [rows, selectedId]);

  const showDataSection = !isLoading && (rows.length > 0 || !errorMessage);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t("nav.customer")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("customer.page.description")}
        </p>
      </section>

      <div className="mt-5 space-y-5">
        {isLoading ? <ApiLoadingState /> : null}

        {!isLoading && errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{errorMessage}</p>
            <button
              onClick={() => void loadCustomers()}
              className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              {t("common.retry")}
            </button>
          </section>
        ) : null}

        {showDataSection ? (
          <>
            <CustomerTableFilter
              rows={rows}
              selectedId={selectedRow?.id}
              onSelectRow={(row) => setSelectedId(row.id)}
            />

            {selectedRow ? <CustomerEditForm key={selectedRow.id} item={selectedRow} /> : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
