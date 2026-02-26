"use client";

import { useMemo, useState } from "react";
import { sampleInvoiceRows } from "./_lib/invoice";
import { InvoiceEditForm } from "./_components/invoice-edit-form";
import { InvoiceTableFilter } from "./_components/invoice-table-filter";
import { useI18n } from "../_i18n/provider";

export default function InvoicePage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState("");

  const selectedRow = useMemo(() => {
    return sampleInvoiceRows.find((row) => row.id === selectedId);
  }, [selectedId]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t("nav.invoice")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("invoice.page.description")}
        </p>
      </section>

      <div className="mt-5 space-y-5">
        <InvoiceTableFilter
          rows={sampleInvoiceRows}
          selectedId={selectedId}
          onSelectRow={(row) => setSelectedId(row.id)}
        />

        <InvoiceEditForm
          key={selectedId || "new"}
          item={selectedRow}
          onNewData={() => setSelectedId("")}
        />
      </div>
    </main>
  );
}
