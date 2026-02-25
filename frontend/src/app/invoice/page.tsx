"use client";

import { useMemo, useState } from "react";
import { sampleInvoiceRows } from "./_lib/invoice";
import { InvoiceEditForm } from "./_components/invoice-edit-form";
import { InvoiceTableFilter } from "./_components/invoice-table-filter";

export default function InvoicePage() {
  const [selectedId, setSelectedId] = useState(sampleInvoiceRows[0]?.id || "");

  const selectedRow = useMemo(() => {
    return sampleInvoiceRows.find((row) => row.id === selectedId) || sampleInvoiceRows[0];
  }, [selectedId]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Aplikasi Invoice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Page invoice disesuaikan dengan field schema backend: Tanggal, NoInvoice, NoPO, NoSuratJalan, IdCustomer, Barang, IsPpn, PpnRate, Subtotal, PpnAmount, dan GrandTotal.
        </p>
      </section>

      <div className="mt-5 space-y-5">
        <InvoiceTableFilter
          rows={sampleInvoiceRows}
          selectedId={selectedRow?.id}
          onSelectRow={(row) => setSelectedId(row.id)}
        />

        {selectedRow ? <InvoiceEditForm key={selectedRow.id} item={selectedRow} /> : null}
      </div>
    </main>
  );
}
