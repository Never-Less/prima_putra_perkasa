"use client";

import { type CSSProperties, useMemo } from "react";
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
const halfPageRowsPerPage = 7;
const fullPageRowsPerPage = 15;
const halfPageWidth = "24cm";
const halfPageHeight = "14cm";
const fullPageWidth = "21.59cm";
const fullPageHeight = "27.94cm";

export type SuratJalanExportPaperSize = "half" | "full";

type SuratJalanPrintPageStyle = CSSProperties & {
  "--surat-jalan-page-height": string;
  "--surat-jalan-page-width": string;
};

type MeiloonColumnWidths = {
  no: string;
  namaBarang: string;
  spesifikasi: string;
  qty: string;
  unit: string;
  kodeDepartemen: string;
  ttdPenerima: string;
  note: string;
};

type DefaultColumnWidths = {
  no: string;
  jumlah: string;
};

const halfMeiloonColumnWidths: MeiloonColumnWidths = {
  no: "4%",
  namaBarang: "18%",
  spesifikasi: "40%",
  qty: "5%",
  unit: "9%",
  kodeDepartemen: "10%",
  ttdPenerima: "10%",
  note: "7%",
};

const fullMeiloonColumnWidths: MeiloonColumnWidths = {
  no: "4%",
  namaBarang: "18%",
  spesifikasi: "38%",
  qty: "5%",
  unit: "9%",
  kodeDepartemen: "10%",
  ttdPenerima: "12%",
  note: "7%",
};

const halfDefaultColumnWidths: DefaultColumnWidths = {
  no: "40px",
  jumlah: "90px",
};

const fullDefaultColumnWidths: DefaultColumnWidths = {
  no: "40px",
  jumlah: "90px",
};

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

function resolveRowsPerPage(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullPageRowsPerPage : halfPageRowsPerPage;
}

function resolvePageHeight(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullPageHeight : halfPageHeight;
}

function resolvePageWidth(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullPageWidth : halfPageWidth;
}

function resolveMeiloonColumnWidths(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullMeiloonColumnWidths : halfMeiloonColumnWidths;
}

function resolveDefaultColumnWidths(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullDefaultColumnWidths : halfDefaultColumnWidths;
}

function buildTemplateRows(
  suratJalan: SuratJalanItem,
  minimumRows = halfPageRowsPerPage
): TemplateRow[] {
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

function buildMeiloonTemplateRows(
  suratJalan: SuratJalanItem,
  minimumRows = halfPageRowsPerPage
): MeiloonTemplateRow[] {
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
  paperSize?: SuratJalanExportPaperSize;
  className?: string;
};

export function SuratJalanExportDocument({
  suratJalan,
  customer,
  paperSize = "half",
  className = "",
}: SuratJalanExportDocumentProps) {
  const { t, locale } = useI18n();
  const rowsPerPage = resolveRowsPerPage(paperSize);
  const pageHeight = resolvePageHeight(paperSize);
  const pageWidth = resolvePageWidth(paperSize);
  const meiloonRowHeightClass = paperSize === "full" ? "h-[38px]" : "h-[22px]";
  const defaultRowHeightClass = paperSize === "full" ? "h-[38px]" : "h-[23px]";
  const meiloonColumnWidths = resolveMeiloonColumnWidths(paperSize);
  const defaultColumnWidths = resolveDefaultColumnWidths(paperSize);
  const printPageStyle: SuratJalanPrintPageStyle = {
    "--surat-jalan-page-height": pageHeight,
    "--surat-jalan-page-width": pageWidth,
    fontFamily: '"Courier New", Courier, monospace',
    maxWidth: pageWidth,
    width: pageWidth,
  };
  const templateRows = useMemo(
    () => buildTemplateRows(suratJalan, rowsPerPage),
    [rowsPerPage, suratJalan]
  );
  const meiloonTemplateRows = useMemo(
    () => buildMeiloonTemplateRows(suratJalan, rowsPerPage),
    [rowsPerPage, suratJalan]
  );
  const templatePages = useMemo(
    () =>
      chunkRows(templateRows, rowsPerPage, () => ({
        no: "",
        namaBarang: "",
        kodeDepartemen: "",
        jumlah: "",
      })),
    [rowsPerPage, templateRows]
  );
  const meiloonTemplatePages = useMemo(
    () =>
      chunkRows(meiloonTemplateRows, rowsPerPage, () => ({
        no: "",
        namaBarang: "",
        spesifikasi: "",
        qty: "",
        unit: "",
        kodeDepartemen: "",
        ttdPenerima: "",
        note: "",
      })),
    [meiloonTemplateRows, rowsPerPage]
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
        className={`surat-jalan-print-page mx-auto w-full max-w-[24cm] bg-white font-bold text-black shadow-xl print:max-w-none print:overflow-hidden print:shadow-none ${
          pageIndex < meiloonTemplatePages.length - 1
            ? "mb-4 print:mb-0 print:break-after-page"
            : ""
        } ${className}`.trim()}
        style={printPageStyle}
      >
        <div
          className="flex flex-col px-[5mm] py-[4mm] text-[14px] leading-[1.18] tracking-[0.05em]"
          style={{ height: pageHeight }}
        >
          <div className="grid grid-cols-[1fr_1.05fr] gap-4 pt-1">
            <div className="px-1 py-0.5">
              <p className="text-[20px] font-bold leading-tight">{companyProfile.name}</p>
              {companyProfile.addressLines.map((line) => (
                <p key={line} className="text-[14px] leading-[1.18]">
                  {line}
                </p>
              ))}
            </div>

            <div className="border-2 border-black px-2 py-1">
              <p className="text-[14px] italic leading-tight">{t("suratJalan.export.kepadaLabel")}</p>
              <p
                className="whitespace-nowrap font-bold leading-tight"
                style={{ fontSize: rawCustomerNameFontSize }}
              >
                {rawCustomerName || meiloonCustomerName}
              </p>
              <p className="whitespace-pre-line text-[14px] leading-[1.12]">
                {rawCustomerAddress || customerAddress || "-"}
              </p>
              <p className="mt-0.5 text-[14px] font-bold leading-tight">
                {t("suratJalan.export.attnLabel")} : {rawCustomerAttn || customerAttn || "-"}
              </p>
            </div>
          </div>

          <div className="mt-1 flex items-end justify-between gap-4 text-[14px] font-bold leading-tight">
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

          <p className="mt-1 text-[14px] leading-tight">
            {t("suratJalan.export.deliverySentenceStart")}{" "}
            <span className="font-bold">{kendaraan || "-"}</span>
          </p>

          <div className="mt-1 border-2 border-black">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: meiloonColumnWidths.no }} />
                <col style={{ width: meiloonColumnWidths.namaBarang }} />
                <col style={{ width: meiloonColumnWidths.spesifikasi }} />
                <col style={{ width: meiloonColumnWidths.qty }} />
                <col style={{ width: meiloonColumnWidths.unit }} />
                <col style={{ width: meiloonColumnWidths.kodeDepartemen }} />
                <col style={{ width: meiloonColumnWidths.ttdPenerima }} />
                <col style={{ width: meiloonColumnWidths.note }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                    {t("suratJalan.export.table.no")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                    {t("suratJalan.export.table.namaBarang")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                    {t("suratJalan.export.meiloon.table.spesifikasi")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[14px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.qty")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                    {t("suratJalan.export.meiloon.table.unit")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[14px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.kodeDepartemen")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[14px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.ttdPenerima")}
                  </th>
                  <th className="px-1 text-center text-[14px] font-bold leading-tight">
                    {t("suratJalan.export.meiloon.table.note")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr
                    key={`meiloon-template-row-${index}`}
                    className={`${meiloonRowHeightClass} border-b border-black last:border-b-0`}
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
            <p className="text-[14px] font-bold leading-tight">{t("suratJalan.export.returnPolicy")}</p>

            <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-[14px] font-bold">{t("suratJalan.export.signature.receiver")}</p>
                <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
              </div>
              <div>
                <p className="text-[14px] font-bold">{t("suratJalan.export.signature.sender")}</p>
                <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
              </div>
              <div>
                <p className="text-[14px] font-bold">{t("suratJalan.export.signature.regards")}</p>
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
      className={`surat-jalan-print-page mx-auto w-full max-w-[24cm] bg-white font-bold text-black shadow-xl print:max-w-none print:overflow-hidden print:shadow-none ${
        pageIndex < templatePages.length - 1
          ? "mb-4 print:mb-0 print:break-after-page"
          : ""
      } ${className}`.trim()}
      style={printPageStyle}
    >
      <div
        className="flex flex-col px-[5mm] py-[4mm] text-[14px] leading-[1.18] tracking-[0.05em]"
        style={{ height: pageHeight }}
      >
        <div className="grid grid-cols-[0.98fr_1.02fr] gap-5">
          <div className="pt-1">
            <p className="text-[20px] font-bold leading-tight">{companyProfile.name}</p>
            {companyProfile.addressLines.map((line) => (
              <p key={line} className="text-[14px] leading-[1.18]">
                {line}
              </p>
            ))}

            <div className="mt-3 grid w-full grid-cols-[150px_8px_1fr] gap-x-1 text-[14px] font-bold leading-tight">
              <span className="whitespace-nowrap">{t("suratJalan.export.noSuratJalanLabel")}</span>
              <span>:</span>
              <span className="whitespace-nowrap">{suratJalan.noSuratJalan || "-"}</span>
              <span className="whitespace-nowrap">{t("suratJalan.export.noPoLabel")}</span>
              <span>:</span>
              <span className="whitespace-nowrap">{suratJalan.noPo || "-"}</span>
            </div>
          </div>

          <div className="pt-1">
            <div className="grid grid-cols-[84px_8px_1fr] text-[14px] font-bold leading-tight">
              <span>{t("suratJalan.export.tanggalLabel")}</span>
              <span>:</span>
              <span>{templateDate}</span>
            </div>

            <div className="mt-1 min-h-[82px] border-2 border-black px-2.5 py-1.5">
              <p className="text-[14px] italic leading-tight">{t("suratJalan.export.kepadaLabel")}</p>
              <p
                className="whitespace-nowrap font-bold leading-tight"
                style={{ fontSize: customerNameFontSize }}
              >
                {customerName || "-"}
              </p>
              <p className="whitespace-pre-line text-[14px] leading-[1.12]">{customerAddress || "-"}</p>
              <p className="mt-0.5 text-[14px] font-bold leading-tight">
                {t("suratJalan.export.attnLabel")}: {customerAttn || "-"}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[14px] leading-tight">
          {t("suratJalan.export.deliverySentenceStart")}{" "}
          <span className="font-bold">{kendaraan || "-"}</span>
        </p>

        <div className="mt-1 border-2 border-black">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: defaultColumnWidths.no }} />
              <col />
              <col style={{ width: defaultColumnWidths.jumlah }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                  {t("suratJalan.export.table.no")}
                </th>
                <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                  {t("suratJalan.export.table.namaBarang")}
                </th>
                <th className="px-1 text-center text-[14px] font-bold">
                  {t("suratJalan.export.table.jumlah")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr
                  key={`template-row-${index}`}
                  className={`${defaultRowHeightClass} border-b border-black last:border-b-0`}
                >
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
          <p className="text-[14px] font-bold leading-tight">{t("suratJalan.export.returnPolicy")}</p>

          <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-[14px] font-bold">{t("suratJalan.export.signature.receiver")}</p>
              <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
            </div>
            <div>
              <p className="text-[14px] font-bold">{t("suratJalan.export.signature.sender")}</p>
              <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
            </div>
            <div>
              <p className="text-[14px] font-bold">{t("suratJalan.export.signature.regards")}</p>
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
