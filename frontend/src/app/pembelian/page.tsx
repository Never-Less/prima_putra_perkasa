"use client";

import { useMemo, useState } from "react";
import { PembelianEditForm } from "./_components/pembelian-edit-form";
import { PembelianTableFilter } from "./_components/pembelian-table-filter";
import { samplePembelianRows } from "./_lib/pembelian";
import { useI18n } from "../_i18n/provider";

export default function PembelianPage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(samplePembelianRows[0]?.id || "");

  const selectedRow = useMemo(() => {
    return samplePembelianRows.find((row) => row.id === selectedId) || samplePembelianRows[0];
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
          selectedId={selectedRow?.id}
          onSelectRow={(row) => setSelectedId(row.id)}
        />

        {selectedRow ? <PembelianEditForm key={selectedRow.id} item={selectedRow} /> : null}
      </div>
    </main>
  );
}
