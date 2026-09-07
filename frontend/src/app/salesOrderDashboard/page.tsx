"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppDateInput } from "../_components/app-date-input";
import { ApiLoadingState } from "../_components/api-loading-state";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError, requestApi } from "../_lib/api-client";
import {
  formatRupiah,
  toInvoiceItem,
  type InvoiceItem,
} from "../invoice/_lib/invoice";
import {
  formatTanggal as formatPurchaseOrderTanggal,
  toPurchaseOrderCustomerOption,
  toPurchaseOrderItem,
  type PurchaseOrderCustomerOption,
  type PurchaseOrderItem,
} from "../salesOrder/_lib/purchase-order";
import { toSuratJalanItem, type SuratJalanItem } from "../suratJalan/_lib/surat-jalan";
import { calculatePaymentDueDate } from "../_lib/payment-term";
import { readPersistentQueryValues, usePersistentQueryValues } from "../_hooks/use-persistent-query-values";

type SalesOrderKanbanStatus =
  | "toDeliver"
  | "deliveredToBilled"
  | "partlyDelivered"
  | "partlyBilled"
  | "billed"
  | "paid";

type SalesOrderKanbanCard = {
  purchaseOrder: PurchaseOrderItem;
  status: SalesOrderKanbanStatus;
  customerName: string;
  suratJalanRows: SuratJalanItem[];
  invoiceRows: InvoiceItem[];
  deliveredSummary: {
    deliveredItems: number;
    totalItems: number;
    deliveredQty: number;
    orderedQty: number;
  };
};

type SalesOrderDashboardResponse = {
  purchaseOrders?: unknown[];
  suratJalan?: unknown[];
  invoices?: unknown[];
  customerOptions?: unknown[];
};

type SalesOrderDashboardFilter = {
  month: string;
  customerId: string;
  status: "" | SalesOrderKanbanStatus;
  nominalMin: string;
  nominalMax: string;
};

type StatusColumnConfig = {
  status: SalesOrderKanbanStatus;
  titleKey: string;
  descriptionKey: string;
  accentClassName: string;
};

type ReminderLevel = "normal" | "attention" | "warning" | "critical";

function utcDay(value: string | null | undefined) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? null
    : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function dayDifference(from: string | null | undefined, to = new Date()) {
  const fromDay = utcDay(from);
  const toDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return fromDay === null ? 0 : Math.floor((toDay - fromDay) / 86400000);
}

function reminderLevel(days: number): ReminderLevel {
  if (days > 7) return "critical";
  if (days > 3) return "warning";
  if (days > 0) return "attention";
  return "normal";
}

const reminderClasses: Record<ReminderLevel, string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  attention: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  critical: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

const statusColumns: StatusColumnConfig[] = [
  {
    status: "toDeliver",
    titleKey: "salesOrderDashboard.status.toDeliver",
    descriptionKey: "salesOrderDashboard.status.toDeliver.description",
    accentClassName: "border-t-slate-400",
  },
  {
    status: "partlyDelivered",
    titleKey: "salesOrderDashboard.status.partlyDelivered",
    descriptionKey: "salesOrderDashboard.status.partlyDelivered.description",
    accentClassName: "border-t-amber-500",
  },
  {
    status: "deliveredToBilled",
    titleKey: "salesOrderDashboard.status.deliveredToBilled",
    descriptionKey: "salesOrderDashboard.status.deliveredToBilled.description",
    accentClassName: "border-t-emerald-500",
  },
  {
    status: "partlyBilled",
    titleKey: "salesOrderDashboard.status.partlyBilled",
    descriptionKey: "salesOrderDashboard.status.partlyBilled.description",
    accentClassName: "border-t-indigo-500",
  },
  {
    status: "billed",
    titleKey: "salesOrderDashboard.status.billed",
    descriptionKey: "salesOrderDashboard.status.billed.description",
    accentClassName: "border-t-sky-500",
  },
  {
    status: "paid",
    titleKey: "salesOrderDashboard.status.paid",
    descriptionKey: "salesOrderDashboard.status.paid.description",
    accentClassName: "border-t-teal-500",
  },
];

const defaultDashboardFilter: SalesOrderDashboardFilter = {
  month: "",
  customerId: "",
  status: "",
  nominalMin: "",
  nominalMax: "",
};
const dashboardQueryDefaults = { ...defaultDashboardFilter, search: "" };

function normalizeKeyPart(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createBarangKey(nama: string, spesifikasi: string, unit: string) {
  return [
    normalizeKeyPart(nama),
    normalizeKeyPart(spesifikasi),
    normalizeKeyPart(unit),
  ].join("::");
}

function normalizeNoPo(value: unknown) {
  return normalizeKeyPart(value);
}

function parseNominalFilterValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const normalizedValue = value
    .replace(/rp\.?/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function sumDeliveredQuantities(suratJalanRows: SuratJalanItem[]) {
  const deliveredByKey = new Map<string, number>();

  suratJalanRows.forEach((suratJalan) => {
    suratJalan.barang.forEach((barang) => {
      const key = createBarangKey(barang.nama, barang.spesifikasi || "", barang.unit);
      deliveredByKey.set(key, (deliveredByKey.get(key) || 0) + barang.jumlah);
    });
  });

  return deliveredByKey;
}

function buildDeliveredSummary(
  purchaseOrder: PurchaseOrderItem,
  suratJalanRows: SuratJalanItem[]
) {
  const deliveredByKey = sumDeliveredQuantities(suratJalanRows);
  let deliveredItems = 0;
  let deliveredQty = 0;
  let orderedQty = 0;

  purchaseOrder.barang.forEach((barang) => {
    const key = createBarangKey(barang.namaBarang, barang.spesifikasi, barang.unit);
    const itemDeliveredQty = deliveredByKey.get(key) || 0;

    orderedQty += barang.kuantitas;
    deliveredQty += Math.min(itemDeliveredQty, barang.kuantitas);

    if (itemDeliveredQty >= barang.kuantitas) {
      deliveredItems += 1;
    }
  });

  return {
    deliveredItems,
    totalItems: purchaseOrder.barang.length,
    deliveredQty,
    orderedQty,
  };
}

function isDeliveryComplete(
  purchaseOrder: PurchaseOrderItem,
  suratJalanRows: SuratJalanItem[],
  deliveredSummary: SalesOrderKanbanCard["deliveredSummary"]
) {
  if (suratJalanRows.length === 0) {
    return false;
  }

  if (purchaseOrder.barang.length === 0) {
    return suratJalanRows.some((suratJalan) => suratJalan.tipe === "non partial");
  }

  return deliveredSummary.deliveredItems === purchaseOrder.barang.length;
}

function isBillingComplete(
  purchaseOrder: PurchaseOrderItem,
  suratJalanRows: SuratJalanItem[],
  invoiceRows: InvoiceItem[],
  deliveredSummary: SalesOrderKanbanCard["deliveredSummary"]
) {
  if (!isDeliveryComplete(purchaseOrder, suratJalanRows, deliveredSummary)) {
    return false;
  }

  const purchaseOrderKey = normalizeNoPo(purchaseOrder.noPo);
  const linkedSuratJalanIds = new Set(
    suratJalanRows.map((suratJalan) => String(suratJalan.id || "").trim()).filter(Boolean)
  );
  const billedByItemKey = new Map<string, number>();
  let hasTrackedSources = false;

  invoiceRows.forEach((invoice) => {
    invoice.barang.forEach((barang) => {
      const itemKey = createBarangKey(barang.namaBarang, barang.spesifikasi, barang.unit);

      barang.sources.forEach((source) => {
        const sourceSuratJalanId = String(source.suratJalanId || "").trim();
        const belongsToSalesOrder =
          normalizeNoPo(source.noPo) === purchaseOrderKey ||
          linkedSuratJalanIds.has(sourceSuratJalanId);

        if (!belongsToSalesOrder) {
          return;
        }

        hasTrackedSources = true;
        billedByItemKey.set(
          itemKey,
          (billedByItemKey.get(itemKey) || 0) + Number(source.kuantitas || 0)
        );
      });
    });
  });

  if (hasTrackedSources && purchaseOrder.barang.length > 0) {
    return purchaseOrder.barang.every((barang) => {
      const itemKey = createBarangKey(barang.namaBarang, barang.spesifikasi, barang.unit);
      return (billedByItemKey.get(itemKey) || 0) >= barang.kuantitas;
    });
  }

  const invoicedSuratJalanIds = new Set(
    invoiceRows.flatMap((invoice) =>
      invoice.barang.flatMap((barang) =>
        barang.sources.map((source) => String(source.suratJalanId || "").trim())
      )
    )
  );
  const invoicedSuratJalanNumbers = new Set(
    invoiceRows.flatMap((invoice) => invoice.noSuratJalan.map(normalizeKeyPart))
  );

  return suratJalanRows.every((suratJalan) => {
    const id = String(suratJalan.id || "").trim();
    const number = normalizeKeyPart(suratJalan.noSuratJalan);

    return (
      (Boolean(id) && invoicedSuratJalanIds.has(id)) ||
      (Boolean(number) && invoicedSuratJalanNumbers.has(number))
    );
  });
}

function resolveSalesOrderStatus(
  purchaseOrder: PurchaseOrderItem,
  suratJalanRows: SuratJalanItem[],
  invoiceRows: InvoiceItem[],
  deliveredSummary: SalesOrderKanbanCard["deliveredSummary"]
): SalesOrderKanbanStatus {
  if (invoiceRows.length > 0) {
    if (!isBillingComplete(purchaseOrder, suratJalanRows, invoiceRows, deliveredSummary)) {
      return "partlyBilled";
    }

    if (invoiceRows.every((invoice) => invoice.isPaid)) {
      return "paid";
    }

    return "billed";
  }

  if (suratJalanRows.length === 0) {
    return "toDeliver";
  }

  if (isDeliveryComplete(purchaseOrder, suratJalanRows, deliveredSummary)) {
    return "deliveredToBilled";
  }

  return "partlyDelivered";
}

function indexSuratJalanByNoPo(suratJalanRows: SuratJalanItem[]) {
  const map = new Map<string, SuratJalanItem[]>();

  suratJalanRows.forEach((suratJalan) => {
    const key = normalizeNoPo(suratJalan.noPo);

    if (!key) {
      return;
    }

    map.set(key, [...(map.get(key) || []), suratJalan]);
  });

  return map;
}

function indexInvoiceByNoPo(invoiceRows: InvoiceItem[]) {
  const map = new Map<string, InvoiceItem[]>();

  invoiceRows.forEach((invoice) => {
    invoice.noPoList.forEach((noPo) => {
      const key = normalizeNoPo(noPo);

      if (!key) {
        return;
      }

      map.set(key, [...(map.get(key) || []), invoice]);
    });
  });

  return map;
}

export default function SalesOrderDashboardPage() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const initialQuery = readPersistentQueryValues(searchParams, dashboardQueryDefaults);
  const [rows, setRows] = useState<SalesOrderKanbanCard[]>([]);
  const [customerOptions, setCustomerOptions] = useState<PurchaseOrderCustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchValue, setSearchValue] = useState(initialQuery.search);
  const [filter, setFilter] = useState<SalesOrderDashboardFilter>(
    { ...initialQuery, status: statusColumns.some((column) => column.status === initialQuery.status) ? initialQuery.status as SalesOrderKanbanStatus : "" }
  );
  const restoreQuery = useCallback((values: typeof dashboardQueryDefaults) => {
    setSearchValue(values.search);
    setFilter({ ...values, status: statusColumns.some((column) => column.status === values.status) ? values.status as SalesOrderKanbanStatus : "" });
  }, []);
  usePersistentQueryValues({ basePath: "/salesOrderDashboard", values: { ...filter, search: searchValue }, defaults: dashboardQueryDefaults, onRestore: restoreQuery });

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await requestApi<SalesOrderDashboardResponse>(
        "/api/purchase-orders/dashboard"
      );
      const purchaseOrderRows = (response.purchaseOrders || [])
        .map(toPurchaseOrderItem)
        .filter((row): row is PurchaseOrderItem => Boolean(row));
      const suratJalanRows = (response.suratJalan || [])
        .map(toSuratJalanItem)
        .filter((row): row is SuratJalanItem => Boolean(row));
      const invoiceRows = (response.invoices || [])
        .map(toInvoiceItem)
        .filter((row): row is InvoiceItem => Boolean(row));
      const dashboardCustomerOptions = (response.customerOptions || [])
        .map(toPurchaseOrderCustomerOption)
        .filter((row): row is PurchaseOrderCustomerOption => Boolean(row));
      const suratJalanByNoPo = indexSuratJalanByNoPo(suratJalanRows);
      const invoiceByNoPo = indexInvoiceByNoPo(invoiceRows);
      const customerLabelMap = new Map(
        dashboardCustomerOptions.map((option) => [option.id, option.nama])
      );

      const kanbanRows = purchaseOrderRows.map((purchaseOrder) => {
        const noPoKey = normalizeNoPo(purchaseOrder.noPo);
        const linkedSuratJalanRows = suratJalanByNoPo.get(noPoKey) || [];
        const linkedInvoiceRows = invoiceByNoPo.get(noPoKey) || [];
        const deliveredSummary = buildDeliveredSummary(
          purchaseOrder,
          linkedSuratJalanRows
        );

        return {
          purchaseOrder,
          status:
            purchaseOrder.workflow?.status ||
            resolveSalesOrderStatus(
              purchaseOrder,
              linkedSuratJalanRows,
              linkedInvoiceRows,
              deliveredSummary
            ),
          customerName:
            customerLabelMap.get(purchaseOrder.namaCustomer) ||
            purchaseOrder.namaCustomer ||
            "-",
          suratJalanRows: linkedSuratJalanRows,
          invoiceRows: linkedInvoiceRows,
          deliveredSummary,
        };
      });

      setRows(kanbanRows);
      setCustomerOptions(dashboardCustomerOptions);
    } catch (error) {
      setRows([]);
      setCustomerOptions([]);

      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message || t("salesOrderDashboard.loadError"));
        return;
      }

      setErrorMessage(t("salesOrderDashboard.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const customerLabelMap = useMemo(() => {
    return new Map(customerOptions.map((option) => [option.id, option.nama]));
  }, [customerOptions]);

  const filteredRows = useMemo(() => {
    const query = normalizeKeyPart(searchValue);
    const nominalMin = parseNominalFilterValue(filter.nominalMin);
    const nominalMax = parseNominalFilterValue(filter.nominalMax);

    return rows.filter((row) => {
      const purchaseOrder = row.purchaseOrder;
      const matchMonth =
        !filter.month || String(purchaseOrder.tanggalPo || "").startsWith(filter.month);
      const matchCustomer =
        !filter.customerId || purchaseOrder.namaCustomer === filter.customerId;
      const matchStatus = !filter.status || row.status === filter.status;
      const nominalPo = Number(purchaseOrder.nominalPo || 0);
      const matchNominalMin = nominalMin === null || nominalPo >= nominalMin;
      const matchNominalMax = nominalMax === null || nominalPo <= nominalMax;

      if (
        !matchMonth ||
        !matchCustomer ||
        !matchStatus ||
        !matchNominalMin ||
        !matchNominalMax
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        purchaseOrder.noPo,
        row.customerName,
        customerLabelMap.get(purchaseOrder.namaCustomer),
        ...row.suratJalanRows.map((suratJalan) => suratJalan.noSuratJalan),
        ...row.invoiceRows.map((invoice) => invoice.noInvoice),
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeKeyPart(haystack).includes(query);
    });
  }, [customerLabelMap, filter, rows, searchValue]);

  const rowsByStatus = useMemo(() => {
    const map = new Map<SalesOrderKanbanStatus, SalesOrderKanbanCard[]>();

    statusColumns.forEach((column) => {
      map.set(column.status, []);
    });

    filteredRows.forEach((row) => {
      map.set(row.status, [...(map.get(row.status) || []), row]);
    });

    return map;
  }, [filteredRows]);

  const totalNominal = useMemo(() => {
    return filteredRows.reduce(
      (total, row) => total + Number(row.purchaseOrder.nominalPo || 0),
      0
    );
  }, [filteredRows]);

  const paidCount = rowsByStatus.get("paid")?.length || 0;
  const billedCount = rowsByStatus.get("billed")?.length || 0;
  const partlyBilledCount = rowsByStatus.get("partlyBilled")?.length || 0;
  const activeDeliveryCount =
    (rowsByStatus.get("toDeliver")?.length || 0) +
    (rowsByStatus.get("partlyDelivered")?.length || 0);
  const hasActiveFilter =
    Boolean(searchValue.trim()) ||
    Object.values(filter).some((value) => String(value || "").trim());

  return (
    <main className="erp-page mx-auto max-w-[96rem]">
      <section className="erp-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {t("salesOrderDashboard.title")}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              {t("salesOrderDashboard.description")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[34rem] sm:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("salesOrderDashboard.summary.activeDelivery")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {activeDeliveryCount}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("salesOrderDashboard.summary.partlyBilled")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {partlyBilledCount}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("salesOrderDashboard.summary.billed")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {billedCount}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("salesOrderDashboard.summary.paid")}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {paidCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="erp-panel mt-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t("salesOrderDashboard.totalData", { count: filteredRows.length })}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatRupiah(totalNominal, locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              setFilter(defaultDashboardFilter);
            }}
            disabled={!hasActiveFilter}
            className="erp-button w-full sm:w-auto"
          >
            {t("common.resetFilter")}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block self-end xl:col-span-2">
            <span className="sr-only">{t("salesOrderDashboard.searchLabel")}</span>
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("nav.purchaseOrder")}
              className="erp-field w-full px-3 py-2"
            />
          </label>

          <label className="block self-end">
            <span className="sr-only">{t("salesOrderDashboard.filter.month")}</span>
            <AppDateInput
              mode="month"
              value={filter.month}
              onValueChange={(value) =>
                setFilter((prevFilter) => ({
                  ...prevFilter,
                  month: value,
                }))
              }
              placeholder={t("salesOrderDashboard.filter.month")}
              className="erp-field w-full px-3 py-2"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {t("field.idCustomer")}
            <select
              value={filter.customerId}
              onChange={(event) =>
                setFilter((prevFilter) => ({
                  ...prevFilter,
                  customerId: event.target.value,
                }))
              }
              className="erp-field mt-1 w-full px-3 py-2"
            >
              <option value="">{t("common.all")}</option>
              {customerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nama}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {t("salesOrderDashboard.filter.status")}
            <select
              value={filter.status}
              onChange={(event) =>
                setFilter((prevFilter) => ({
                  ...prevFilter,
                  status: event.target.value as SalesOrderDashboardFilter["status"],
                }))
              }
              className="erp-field mt-1 w-full px-3 py-2"
            >
              <option value="">{t("common.all")}</option>
              {statusColumns.map((column) => (
                <option key={column.status} value={column.status}>
                  {t(column.titleKey)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-1">
            <label className="block self-end">
              <span className="sr-only">{t("field.nominalPoMin")}</span>
              <input
                inputMode="numeric"
                value={filter.nominalMin}
                onChange={(event) =>
                  setFilter((prevFilter) => ({
                    ...prevFilter,
                    nominalMin: event.target.value,
                  }))
                }
                placeholder={t("field.nominalPoMin")}
                className="erp-field w-full px-3 py-2"
              />
            </label>
            <label className="block self-end">
              <span className="sr-only">{t("field.nominalPoMax")}</span>
              <input
                inputMode="numeric"
                value={filter.nominalMax}
                onChange={(event) =>
                  setFilter((prevFilter) => ({
                    ...prevFilter,
                    nominalMax: event.target.value,
                  }))
                }
                placeholder={t("field.nominalPoMax")}
                className="erp-field w-full px-3 py-2"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="mt-5">
        {isLoading ? <ApiLoadingState /> : null}

        {!isLoading && errorMessage ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950/40"
            >
              {t("common.retry")}
            </button>
          </section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <section
            className="erp-panel overflow-x-auto p-3"
            aria-label={t("salesOrderDashboard.title")}
          >
            <div className="flex min-h-[34rem] w-max gap-4 pb-2">
              {statusColumns.map((column) => {
                const columnRows = rowsByStatus.get(column.status) || [];

                return (
                  <div
                    key={column.status}
                    className={`flex w-[19rem] shrink-0 flex-col rounded-lg border border-sky-100 border-t-4 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/70 ${column.accentClassName}`}
                  >
                    <div className="border-b border-sky-100 p-3 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {t(column.titleKey)}
                          </h2>
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {t(column.descriptionKey)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                          {columnRows.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                      {columnRows.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                          {t("salesOrderDashboard.emptyColumn")}
                        </p>
                      ) : null}

                      {columnRows.map((row) => {
                        const purchaseOrder = row.purchaseOrder;
                        const deliveredText =
                          row.deliveredSummary.orderedQty > 0
                            ? t("salesOrderDashboard.card.deliveryProgressQty", {
                                delivered: row.deliveredSummary.deliveredQty,
                                ordered: row.deliveredSummary.orderedQty,
                              })
                            : t("salesOrderDashboard.card.deliveryProgressItems", {
                                delivered: row.deliveredSummary.deliveredItems,
                                ordered: row.deliveredSummary.totalItems,
                              });
                        const unpaidInvoices = row.invoiceRows
                          .filter((invoice) => !invoice.isPaid)
                          .sort((left, right) => String(left.dueDate).localeCompare(String(right.dueDate)));
                        const activeInvoice = unpaidInvoices[0] || null;
                        const salesOrderDueDate = calculatePaymentDueDate(
                          purchaseOrder.tanggalPo,
                          purchaseOrder.paymentTerm
                        );
                        const displayedDueDate = activeInvoice?.dueDate || salesOrderDueDate;
                        let reminderText = t("salesOrderDashboard.card.onTrack");
                        let activeReminderLevel: ReminderLevel = "normal";

                        if (row.suratJalanRows.length === 0) {
                          const waitingDays = Math.max(0, dayDifference(purchaseOrder.tanggalPo));
                          activeReminderLevel = reminderLevel(waitingDays);
                          reminderText = t("salesOrderDashboard.card.notShippedDays", { days: waitingDays });
                        } else if (activeInvoice) {
                          const overdueDays = dayDifference(activeInvoice.dueDate);
                          activeReminderLevel = reminderLevel(Math.max(0, overdueDays));
                          reminderText = overdueDays > 0
                            ? t("salesOrderDashboard.card.invoiceOverdueDays", { days: overdueDays })
                            : overdueDays === 0
                              ? t("salesOrderDashboard.card.dueToday")
                              : t("salesOrderDashboard.card.dueInDays", { days: Math.abs(overdueDays) });
                        } else if (row.invoiceRows.length > 0) {
                          reminderText = t("salesOrderDashboard.card.paid");
                        } else {
                          const latestDeliveryDate = [...row.suratJalanRows]
                            .map((suratJalan) => suratJalan.tanggal)
                            .sort()
                            .at(-1);
                          const waitingInvoiceDays = Math.max(0, dayDifference(latestDeliveryDate));
                          activeReminderLevel = reminderLevel(waitingInvoiceDays);
                          reminderText = t("salesOrderDashboard.card.notInvoicedDays", { days: waitingInvoiceDays });
                        }

                        return (
                          <article
                            key={purchaseOrder.id}
                            className="rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-700"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/salesOrder/form?id=${encodeURIComponent(purchaseOrder.id)}`}
                                  className="block truncate text-sm font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                                >
                                  {purchaseOrder.noPo || "-"}
                                </Link>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                  {row.customerName}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 dark:bg-slate-800 dark:text-sky-200">
                                {purchaseOrder.barang.length}
                              </span>
                            </div>

                            <dl className="mt-3 space-y-2 text-xs">
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500 dark:text-slate-400">
                                  {t("field.tanggalPo")}
                                </dt>
                                <dd className="text-right text-slate-700 dark:text-slate-200">
                                  {formatPurchaseOrderTanggal(purchaseOrder.tanggalPo, locale)}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500 dark:text-slate-400">{t("field.dueDate")}</dt>
                                <dd className="text-right font-medium text-slate-800 dark:text-slate-100">{formatPurchaseOrderTanggal(displayedDueDate, locale)}</dd>
                              </div>
                              <div className={`rounded-md border px-2.5 py-2 text-xs font-semibold ${reminderClasses[activeReminderLevel]}`}>
                                {reminderText}
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500 dark:text-slate-400">
                                  {t("field.nominalPo")}
                                </dt>
                                <dd className="text-right font-medium text-slate-800 dark:text-slate-100">
                                  {formatRupiah(purchaseOrder.nominalPo, locale)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500 dark:text-slate-400">
                                  {t("salesOrderDashboard.card.deliveryProgress")}
                                </dt>
                                <dd className="mt-1 text-slate-700 dark:text-slate-200">
                                  {deliveredText}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500 dark:text-slate-400">
                                  {t("field.noSuratJalan")}
                                </dt>
                                <dd className="mt-1 flex flex-wrap gap-1.5">
                                  {row.suratJalanRows.length > 0
                                    ? row.suratJalanRows.map((suratJalan) => (
                                        <Link
                                          key={suratJalan.id}
                                          href={`/suratJalan/form?id=${encodeURIComponent(suratJalan.id)}`}
                                          className="rounded bg-emerald-50 px-1.5 py-1 font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                                        >
                                          {suratJalan.noSuratJalan || "-"}
                                        </Link>
                                      ))
                                    : <span className="text-slate-400">-</span>}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500 dark:text-slate-400">
                                  {t("field.noInvoice")}
                                </dt>
                                <dd className="mt-1 flex flex-wrap gap-1.5">
                                  {row.invoiceRows.length > 0
                                    ? row.invoiceRows.map((invoice) => (
                                        <Link
                                          key={invoice.id}
                                          href={`/invoice/form?id=${encodeURIComponent(invoice.id)}`}
                                          className="rounded bg-indigo-50 px-1.5 py-1 font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
                                        >
                                          {invoice.noInvoice || "-"}
                                        </Link>
                                      ))
                                    : <span className="text-slate-400">-</span>}
                                </dd>
                              </div>
                            </dl>

                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
