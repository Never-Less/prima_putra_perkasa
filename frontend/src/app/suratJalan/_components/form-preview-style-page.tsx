"use client";

import { useMemo, useState } from "react";
import { sampleSuratJalanRows } from "../_lib/surat-jalan";
import { SuratJalanEditForm } from "./surat-jalan-edit-form";
import { SuratJalanTableFilter } from "./surat-jalan-table-filter";
import { useI18n } from "../../_i18n/provider";

export function FormPreviewStylePage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState(sampleSuratJalanRows[0]?.id || "");

  const selectedRow = useMemo(() => {
    return sampleSuratJalanRows.find((row) => row.id === selectedId) || sampleSuratJalanRows[0];
  }, [selectedId]);

  return (
    <div className="space-y-5">
      <SuratJalanTableFilter
        rows={sampleSuratJalanRows}
        selectedId={selectedRow?.id}
        onSelectRow={(row) => setSelectedId(row.id)}
        colorTone="sky"
        tableStyle="compact"
      />

      {selectedRow ? (
        <SuratJalanEditForm
          key={selectedRow.id}
          item={selectedRow}
          title={t("suratJalan.form.title")}
          description={t("suratJalan.form.description")}
          showPreview={true}
          colorTone="sky"
          formStyle="soft"
        />
      ) : null}
    </div>
  );
}
