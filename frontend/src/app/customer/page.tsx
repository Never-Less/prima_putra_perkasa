"use client";

import { useMemo, useState } from "react";
import { CustomerEditForm } from "./_components/customer-edit-form";
import { CustomerTableFilter } from "./_components/customer-table-filter";
import { sampleCustomerRows } from "./_lib/customer";
import { useI18n } from "../_i18n/provider";

export default function CustomerPage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(sampleCustomerRows[0]?.id || "");

  const selectedRow = useMemo(() => {
    return sampleCustomerRows.find((row) => row.id === selectedId) || sampleCustomerRows[0];
  }, [selectedId]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t("nav.customer")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("customer.page.description")}
        </p>
      </section>

      <div className="mt-5 space-y-5">
        <CustomerTableFilter
          rows={sampleCustomerRows}
          selectedId={selectedRow?.id}
          onSelectRow={(row) => setSelectedId(row.id)}
        />

        {selectedRow ? <CustomerEditForm key={selectedRow.id} item={selectedRow} /> : null}
      </div>
    </main>
  );
}
