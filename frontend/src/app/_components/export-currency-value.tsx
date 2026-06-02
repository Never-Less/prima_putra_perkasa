type ExportCurrencyLocale = "id" | "en";

type ExportCurrencyValueProps = {
  value: number | string | null | undefined;
  locale?: ExportCurrencyLocale;
  className?: string;
  emptyValue?: string;
};

function formatExportCurrencyNumber(value: number, locale: ExportCurrencyLocale) {
  const numberLocale = locale === "en" ? "en-US" : "id-ID";

  return new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeCurrencyValue(value: ExportCurrencyValueProps["value"], locale: ExportCurrencyLocale) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return formatExportCurrencyNumber(numberValue, locale);
}

export function ExportCurrencyValue({
  value,
  locale = "id",
  className = "",
  emptyValue = "",
}: ExportCurrencyValueProps) {
  const amount = normalizeCurrencyValue(value, locale);

  if (!amount) {
    return <span>{emptyValue}</span>;
  }

  return (
    <span className={`flex w-full items-center justify-between gap-1 tabular-nums ${className}`.trim()}>
      <span className="shrink-0 text-left">Rp</span>
      <span className="min-w-0 flex-1 text-right">{amount}</span>
    </span>
  );
}
