import { endOfDay, format as formatDateFns, isValid, parseISO } from "date-fns";
import { enUS, id as localeId } from "date-fns/locale";

type AppLocale = "id" | "en";

function getDateLocale(locale: AppLocale) {
  return locale === "en" ? enUS : localeId;
}

export function parseAppDate(value: string | null | undefined) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const parsedIsoDate = parseISO(text);

  if (isValid(parsedIsoDate)) {
    return parsedIsoDate;
  }

  const fallbackDate = new Date(text);
  return isValid(fallbackDate) ? fallbackDate : null;
}

export function parseAppDateRangeStart(value: string | null | undefined) {
  return parseAppDate(value);
}

export function parseAppDateRangeEnd(value: string | null | undefined) {
  const date = parseAppDate(value);
  return date ? endOfDay(date) : null;
}

export function formatAppDate(
  value: string | null | undefined,
  locale: AppLocale = "id",
  pattern = "dd MMM yyyy"
) {
  const date = parseAppDate(value);

  if (!date) {
    return "-";
  }

  return formatDateFns(date, pattern, {
    locale: getDateLocale(locale),
  });
}

export function formatAppUppercaseDate(
  value: string | null | undefined,
  locale: AppLocale = "id",
  pattern = "dd MMMM yyyy"
) {
  return formatAppDate(value, locale, pattern).toUpperCase();
}

export function toInputDateValue(value: string | null | undefined) {
  const date = parseAppDate(value);

  if (!date) {
    return "";
  }

  return formatDateFns(date, "yyyy-MM-dd");
}
