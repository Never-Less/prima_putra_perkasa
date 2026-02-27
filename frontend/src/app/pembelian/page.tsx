"use client";

import { useMemo, useState } from "react";
import { PembelianEditForm } from "./_components/pembelian-edit-form";
import { PembelianTableFilter } from "./_components/pembelian-table-filter";
import {
  consumePembelianPrefill,
  samplePembelianRows,
  toPembelianFormStateFromPrefill,
  type PembelianFormState,
} from "./_lib/pembelian";
import { useI18n } from "../_i18n/provider";

export default function PembelianPage() {
  const { t } = useI18n();
  const [prefillOnLoad] = useState(() => consumePembelianPrefill());
  const [selectedId, setSelectedId] = useState("");
  const [initialForm, setInitialForm] = useState<PembelianFormState | null>(() =>
    prefillOnLoad ? toPembelianFormStateFromPrefill(prefillOnLoad) : null
  );
  const [initialFormKey, setInitialFormKey] = useState(() => (prefillOnLoad ? Date.now() : 0));

  const selectedRow = useMemo(() => {
    return samplePembelianRows.find((row) => row.id === selectedId);
  }, [selectedId]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t("nav.pembelian")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("pembelian.page.description")}</p>
      </section>

      <div className="mt-5 space-y-5">
        <PembelianTableFilter
          rows={samplePembelianRows}
          selectedId={selectedId}
          onSelectRow={(row) => {
            setInitialForm(null);
            setSelectedId(row.id);
          }}
        />

        <PembelianEditForm
          key={`${selectedId || "new"}-${initialFormKey}`}
          item={selectedRow}
          initialForm={selectedRow ? undefined : initialForm || undefined}
          onNewData={() => {
            setInitialForm(null);
            setInitialFormKey(Date.now());
            setSelectedId("");
          }}
        />
      </div>
    </main>
  );
}
