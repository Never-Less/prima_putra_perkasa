"use client";

import { useEffect, useState } from "react";
import { toCustomerFormState, type CustomerFormState, type CustomerItem } from "../_lib/customer";
import { useI18n } from "../../_i18n/provider";

type CustomerEditFormProps = {
  item: CustomerItem;
};

export function CustomerEditForm({ item }: CustomerEditFormProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<CustomerFormState>(() => toCustomerFormState(item));

  useEffect(() => {
    setForm(toCustomerFormState(item));
  }, [item]);

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900">{t("customer.form.title")}</h2>
        <p className="text-sm text-sky-800">
          {t("customer.form.description")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-transparent bg-slate-100/80 p-4">
          <div className="grid gap-3">
            <label className="text-sm text-slate-700">
              {t("field.nama")}
              <input
                value={form.nama}
                onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.alamat")}
              <textarea
                rows={4}
                value={form.alamat}
                onChange={(event) => setForm((prev) => ({ ...prev, alamat: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.atasNama")}
              <input
                value={form.atasNama}
                onChange={(event) => setForm((prev) => ({ ...prev, atasNama: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">
              {t("common.saveChanges")}
            </button>
            <button
              onClick={() => setForm(toCustomerFormState(item))}
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50"
            >
              {t("common.resetForm")}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-transparent bg-slate-100/70 p-4">
          <p className="text-sm font-semibold text-slate-900">{t("customer.preview.title")}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              <span className="text-slate-500">{t("field.nama")}:</span> {form.nama || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.alamat")}:</span> {form.alamat || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.atasNama")}:</span> {form.atasNama || "-"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
