"use client";

import { useMemo } from "react";
import { useI18n } from "../../../_i18n/provider";
import { formatAppUppercaseDate } from "../../../_lib/date";
import { type SuratJalanItem } from "../../_lib/surat-jalan";

type ExportCustomer = {
  nama?: string;
  alamat?: string;
  atasNama?: string;
} | null;

const companyProfile = {
  name: "CV. PRIMA PUTRA PERKASA",
  addressLines: [
    "Jl. Hayam Wuruk No.127",
    "Lindeteves Trade Centre Lt. 2 Blok B20 No. 6",
    "Tel. 021. 6246441, 62320362",
  ],
};

const meiloonCustomerName = "PT. MEILOON TECHNOLOGY INDONESIA";
const defaultRowsPerPage = 9;
const meiloonRowsPerPage = 9;

type TemplateRow = {
  no: string;
  namaBarang: string;
  kodeDepartemen: string;
  jumlah: string;
};

type MeiloonTemplateRow = {
  no: string;
  namaBarang: string;
  spesifikasi: string;
  qty: string;
  unit: string;
  kodeDepartemen: string;
  ttdPenerima: string;
  note: string;
};

function toUpperText(value: string) {
  return String(value || "").trim().toUpperCase();
}

function getSingleLineCustomerNameFontSize(value: string) {
  const length = String(value || "").trim().length;

  if (length > 58) {
    return "10px";
  }

  if (length > 48) {
    return "11px";
  }

  if (length > 40) {
    return "12px";
  }

  if (length > 34) {
    return "13px";
  }

  return "14px";
}

function normalizeCustomerName(value: string) {
  return String(value || "").trim().toUpperCase();
}

function formatTemplateDate(value: string, locale: "id" | "en") {
  return formatAppUppercaseDate(value, locale);
}

function formatExportKendaraan(value: string) {
  return String(value || "")
    .trim()
    .replace(/^\((.*)\)$/, "$1")
    .trim()
    .toUpperCase();
}

function buildTemplateRows(suratJalan: SuratJalanItem, minimumRows = defaultRowsPerPage): TemplateRow[] {
  const filledRows = (suratJalan.barang || []).map((barang, index) => {
    const namaBarang = String(barang.nama || "").trim();
    const spesifikasi = String(barang.spesifikasi || "").trim();
    const kodeDepartemen = String(barang.kodeDepartemen || suratJalan.kodeDepartemen || "").trim();
    const namaBarangDisplay =
      namaBarang && spesifikasi ? `${namaBarang} (${spesifikasi})` : namaBarang;

    return {
      no: String(index + 1),
      namaBarang: namaBarangDisplay,
      kodeDepartemen,
      jumlah: `${barang.jumlah} ${String(barang.unit || "").trim().toUpperCase()}`.trim(),
    };
  });

  const totalRows = Math.max(minimumRows, filledRows.length);
  const rows = [...filledRows];

  while (rows.length < totalRows) {
    rows.push({
      no: "",
      namaBarang: "",
      kodeDepartemen: "",
      jumlah: "",
    });
  }

  return rows;
}

function buildMeiloonTemplateRows(suratJalan: SuratJalanItem, minimumRows = meiloonRowsPerPage): MeiloonTemplateRow[] {
  const filledRows = (suratJalan.barang || []).map((barang, index) => ({
    no: String(index + 1),
    namaBarang: String(barang.nama || "").trim(),
    spesifikasi: String(barang.spesifikasi || "").trim(),
    qty: String(barang.jumlah || "").trim(),
    unit: String(barang.unit || "").trim().toUpperCase(),
    kodeDepartemen: String(barang.kodeDepartemen || suratJalan.kodeDepartemen || "").trim(),
    ttdPenerima: "",
    note: "",
  }));

  const totalRows = Math.max(minimumRows, filledRows.length);
  const rows = [...filledRows];

  while (rows.length < totalRows) {
    rows.push({
      no: "",
      namaBarang: "",
      spesifikasi: "",
      qty: "",
      unit: "",
      kodeDepartemen: "",
      ttdPenerima: "",
      note: "",
    });
  }

  return rows;
}

function chunkRows<T>(rows: T[], rowsPerPage: number, createEmptyRow: () => T) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += rowsPerPage) {
    const chunk = rows.slice(index, index + rowsPerPage);

    while (chunk.length < rowsPerPage) {
      chunk.push(createEmptyRow());
    }

    chunks.push(chunk);
  }

  return chunks.length > 0 ? chunks : [rows];
}

type SuratJalanExportDocumentProps = {
  suratJalan: SuratJalanItem;
  customer: ExportCustomer;
  className?: string;
};

export function SuratJalanExportDocument({
  suratJalan,
  customer,
  className = "",
}: SuratJalanExportDocumentProps) {
  const { t, locale } = useI18n();
  const templateRows = useMemo(() => buildTemplateRows(suratJalan), [suratJalan]);
  const meiloonTemplateRows = useMemo(() => buildMeiloonTemplateRows(suratJalan), [suratJalan]);
  const templatePages = useMemo(
    () =>
      chunkRows(templateRows, defaultRowsPerPage, () => ({
        no: "",
        namaBarang: "",
        kodeDepartemen: "",
        jumlah: "",
      })),
    [templateRows]
  );
  const meiloonTemplatePages = useMemo(
    () =>
      chunkRows(meiloonTemplateRows, meiloonRowsPerPage, () => ({
        no: "",
        namaBarang: "",
        spesifikasi: "",
        qty: "",
        unit: "",
        kodeDepartemen: "",
        ttdPenerima: "",
        note: "",
      })),
    [meiloonTemplateRows]
  );
  const templateDate = useMemo(
    () => formatTemplateDate(suratJalan.tanggal || "", locale),
    [locale, suratJalan.tanggal]
  );
  const rawCustomerName = useMemo(() => String(customer?.nama || "").trim(), [customer?.nama]);
  const rawCustomerAddress = useMemo(
    () => String(customer?.alamat || "").trim(),
    [customer?.alamat]
  );
  const rawCustomerAttn = useMemo(
    () => String(customer?.atasNama || "").trim(),
    [customer?.atasNama]
  );
  const customerName = useMemo(() => toUpperText(customer?.nama || ""), [customer?.nama]);
  const rawCustomerNameFontSize = useMemo(
    () => getSingleLineCustomerNameFontSize(rawCustomerName || meiloonCustomerName),
    [rawCustomerName]
  );
  const customerNameFontSize = useMemo(
    () => getSingleLineCustomerNameFontSize(customerName || "-"),
    [customerName]
  );
  const customerAddress = useMemo(() => toUpperText(customer?.alamat || ""), [customer?.alamat]);
  const customerAttn = useMemo(() => toUpperText(customer?.atasNama || ""), [customer?.atasNama]);
  const kendaraan = useMemo(
    () => formatExportKendaraan(suratJalan.kendaraan || ""),
    [suratJalan.kendaraan]
  );
  const isMeiloonCustomer = useMemo(
    () => normalizeCustomerName(customer?.nama || "") === meiloonCustomerName,
    [customer?.nama]
  );

  if (isMeiloonCustomer) {
    return (
      <>
        {meiloonTemplatePages.map((pageRows, pageIndex) => (
      <section
        key={`meiloon-page-${pageIndex}`}
        className={`surat-jalan-print-page mx-auto w-full max-w-[24cm] bg-white text-black shadow-xl print:h-[14cm] print:w-[24cm] print:max-w-none print:overflow-hidden print:shadow-none ${
          pageIndex < meiloonTemplatePages.length - 1
            ? "mb-4 print:mb-0 print:break-after-page"
            : ""
        } ${className}`.trim()}
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div className="flex h-[14cm] flex-col px-[5mm] py-[4mm] text-[13px] leading-[1.18] tracking-[0.03em]">
          <div className="grid grid-cols-[1fr_1.05fr] gap-4 pt-1">
            <div className="px-1 py-0.5">
              <p className="text-[20px] font-bold leading-tight">{companyProfile.name}</p>
              {companyProfile.addressLines.map((line) => (
                <p key={line} className="text-[13px] leading-[1.18]">
                  {line}
                </p>
              ))}
            </div>

            <div className="border-2 border-black px-2 py-1">
              <p className="text-[13px] italic leading-tight">{t("suratJalan.export.kepadaLabel")}</p>
              <p
                className="whitespace-nowrap font-bold leading-tight"
                style={{ fontSize: rawCustomerNameFontSize }}
              >
                {rawCustomerName || meiloonCustomerName}
              </p>
              <p className="whitespace-pre-line text-[12px] leading-[1.12]">
                {rawCustomerAddress || customerAddress || "-"}
              </p>
              <p className="mt-0.5 text-[12px] font-bold leading-tight">
                {t("suratJalan.export.attnLabel")} : {rawCustomerAttn || customerAttn || "-"}
              </p>
            </div>
          </div>

          <div className="mt-1 flex items-end justify-between gap-4 text-[15px] font-bold leading-tight">
            <div className="grid grid-cols-[82px_8px_1fr] gap-x-1">
              <span>{t("suratJalan.export.meiloon.noSjLabel")}</span>
              <span>:</span>
              <span>{suratJalan.noSuratJalan || "-"}</span>
            </div>
            <div className="grid grid-cols-[72px_8px_1fr] gap-x-1">
              <span>{t("suratJalan.export.noPoLabel")}</span>
              <span>:</span>
              <span>{suratJalan.noPo || "-"}</span>
            </div>
            <div className="grid grid-cols-[84px_8px_1fr] gap-x-1">
              <span>{t("suratJalan.export.tanggalLabel")}</span>
              <span>:</span>
              <span>{templateDate}</span>
            </div>
          </div>

          <p className="mt-1 text-[13px] leading-tight">
            {t("suratJalan.export.deliverySentenceStart")}{" "}
            <span className="font-bold">{kendaraan || "-"}</span>
          </p>

          <div className="mt-1 border-2 border-black">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "40%" }} />
                <col style={{ width: "5%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "7%" }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="border-r border-black px-1 text-center text-[15px] font-bold">
                    {t("suratJalan.export.table.no")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px] font-bold">
                    {t("suratJalan.export.table.namaBarang")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px] font-bold">
                    {t("suratJalan.export.meiloon.table.spesifikasi")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[13px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.qty")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px] font-bold">
                    {t("suratJalan.export.meiloon.table.unit")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[13px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.kodeDepartemen")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[13px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.ttdPenerima")}
                  </th>
                  <th className="px-1 text-center text-[13px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.note")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr
                    key={`meiloon-template-row-${index}`}
                    className="h-[22px] border-b border-black last:border-b-0"
                  >
                    <td className="border-r border-black px-1 text-center align-middle text-[14px]">{row.no}</td>
                    <td className="whitespace-normal break-words border-r border-black px-1.5 align-middle text-[14px] leading-[1.15]">
                      {row.namaBarang}
                    </td>
                    <td className="border-r border-black px-1.5 align-middle whitespace-pre-line text-[14px] leading-[1.15]">
                      {row.spesifikasi}
                    </td>
                    <td className="border-r border-black px-1 text-center align-middle text-[14px]">{row.qty}</td>
                    <td className="border-r border-black px-1 text-center align-middle text-[14px]">{row.unit}</td>
                    <td className="border-r border-black px-1 text-center align-middle text-[14px]">{row.kodeDepartemen}</td>
                    <td className="border-r border-black px-1 text-center align-middle text-[14px]">{row.ttdPenerima}</td>
                    <td className="px-1 text-center align-middle text-[14px]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="mt-auto shrink-0 pt-1">
            <p className="text-[13px] font-bold leading-tight">{t("suratJalan.export.returnPolicy")}</p>

            <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-[15px] font-bold">{t("suratJalan.export.signature.receiver")}</p>
                <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
              </div>
              <div>
                <p className="text-[15px] font-bold">{t("suratJalan.export.signature.sender")}</p>
                <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
              </div>
              <div>
                <p className="text-[15px] font-bold">{t("suratJalan.export.signature.regards")}</p>
                <div className="mt-[58px] mx-auto w-[115px] border-t-[1.5px] border-black" />
              </div>
            </div>
          </footer>
        </div>
      </section>
        ))}
      </>
    );
  }

  return (
    <>
      {templatePages.map((pageRows, pageIndex) => (
    <section
      key={`default-page-${pageIndex}`}
      className={`surat-jalan-print-page mx-auto w-full max-w-[24cm] bg-white text-black shadow-xl print:h-[14cm] print:w-[24cm] print:max-w-none print:overflow-hidden print:shadow-none ${
        pageIndex < templatePages.length - 1
          ? "mb-4 print:mb-0 print:break-after-page"
          : ""
      } ${className}`.trim()}
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div className="flex h-[14cm] flex-col px-[5mm] py-[4mm] text-[13px] leading-[1.18] tracking-[0.03em]">
        <div className="grid grid-cols-[0.98fr_1.02fr] gap-5">
          <div className="pt-1">
            <p className="text-[20px] font-bold leading-tight">{companyProfile.name}</p>
            {companyProfile.addressLines.map((line) => (
              <p key={line} className="text-[13px] leading-[1.18]">
                {line}
              </p>
            ))}

            <div className="mt-3 grid w-full grid-cols-[150px_8px_1fr] gap-x-1 text-[15px] font-bold leading-tight">
              <span className="whitespace-nowrap">{t("suratJalan.export.noSuratJalanLabel")}</span>
              <span>:</span>
              <span className="whitespace-nowrap">{suratJalan.noSuratJalan || "-"}</span>
              <span className="whitespace-nowrap">{t("suratJalan.export.noPoLabel")}</span>
              <span>:</span>
              <span className="whitespace-nowrap">{suratJalan.noPo || "-"}</span>
            </div>
          </div>

          <div className="pt-1">
            <div className="grid grid-cols-[84px_8px_1fr] text-[15px] font-bold leading-tight">
              <span>{t("suratJalan.export.tanggalLabel")}</span>
              <span>:</span>
              <span>{templateDate}</span>
            </div>

            <div className="mt-1 min-h-[82px] border-2 border-black px-2.5 py-1.5">
              <p className="text-[13px] italic leading-tight">{t("suratJalan.export.kepadaLabel")}</p>
              <p
                className="whitespace-nowrap font-bold leading-tight"
                style={{ fontSize: customerNameFontSize }}
              >
                {customerName || "-"}
              </p>
              <p className="whitespace-pre-line text-[12px] leading-[1.12]">{customerAddress || "-"}</p>
              <p className="mt-0.5 text-[12px] font-bold leading-tight">
                {t("suratJalan.export.attnLabel")}: {customerAttn || "-"}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-tight">
          {t("suratJalan.export.deliverySentenceStart")}{" "}
          <span className="font-bold">{kendaraan || "-"}</span>
        </p>

        <div className="mt-1 border-2 border-black">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: "40px" }} />
              <col />
              <col style={{ width: "90px" }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border-r border-black px-1 text-center text-[15px] font-bold">
                  {t("suratJalan.export.table.no")}
                </th>
                <th className="border-r border-black px-1 text-center text-[15px] font-bold">
                  {t("suratJalan.export.table.namaBarang")}
                </th>
                <th className="px-1 text-center text-[15px] font-bold">
                  {t("suratJalan.export.table.jumlah")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr key={`template-row-${index}`} className="h-[23px] border-b border-black last:border-b-0">
                  <td className="border-r border-black px-1 text-center align-middle text-[14px]">{row.no}</td>
                  <td className="border-r border-black px-2 align-middle text-[14px]">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="whitespace-normal break-words leading-[1.15]">
                        {row.namaBarang}
                      </span>
                      <span className="shrink-0">{row.kodeDepartemen}</span>
                    </div>
                  </td>
                  <td className="px-2 text-center align-middle text-[14px]">{row.jumlah}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-auto shrink-0 pt-1">
          <p className="text-[13px] font-bold leading-tight">{t("suratJalan.export.returnPolicy")}</p>

          <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-[15px] font-bold">{t("suratJalan.export.signature.receiver")}</p>
              <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
            </div>
            <div>
              <p className="text-[15px] font-bold">{t("suratJalan.export.signature.sender")}</p>
              <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
            </div>
            <div>
              <p className="text-[15px] font-bold">{t("suratJalan.export.signature.regards")}</p>
              <div className="mt-[58px] mx-auto w-[115px] border-t-[1.5px] border-black" />
            </div>
          </div>
        </footer>
      </div>
    </section>
      ))}
    </>
  );
}
