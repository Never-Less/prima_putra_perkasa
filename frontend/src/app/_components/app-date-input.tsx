"use client";

import DatePicker from "react-datepicker";
import { type ComponentPropsWithoutRef, type FocusEventHandler } from "react";
import { enUS, id as localeId } from "date-fns/locale";
import { useI18n } from "../_i18n/provider";
import { parseAppDate, toApiDateValue } from "../_lib/date";

type AppDateInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "defaultValue" | "onChange" | "type" | "value"
> & {
  mode?: "date" | "month";
  onValueChange: (value: string) => void;
  value: string;
};

function parseMonthValue(value: string) {
  const [yearText, monthText] = String(value || "").split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

function toApiMonthValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

export function AppDateInput({
  autoComplete = "off",
  className,
  disabled,
  id,
  name,
  mode = "date",
  onBlur,
  onFocus,
  onValueChange,
  placeholder,
  readOnly,
  required,
  title,
  value,
}: AppDateInputProps) {
  const { locale } = useI18n();
  const selectedDate = mode === "month" ? parseMonthValue(value) : parseAppDate(value);
  const dateLocale = locale === "en" ? enUS : localeId;

  return (
    <DatePicker
      autoComplete={autoComplete}
      calendarClassName="app-date-picker-calendar"
      className={className}
      dateFormat={mode === "month" ? "MMMM yyyy" : "dd-MM-yyyy"}
      disabled={disabled}
      id={id}
      isClearable={!required && !disabled && !readOnly}
      locale={dateLocale}
      name={name}
      onBlur={onBlur as FocusEventHandler<HTMLElement> | undefined}
      onChange={(date: Date | null) =>
        onValueChange(mode === "month" ? toApiMonthValue(date) : toApiDateValue(date))
      }
      onFocus={onFocus as FocusEventHandler<HTMLElement> | undefined}
      placeholderText={placeholder || (mode === "month" ? "MMMM yyyy" : "dd-MM-yyyy")}
      popperClassName="app-date-picker-popper"
      popperPlacement="bottom-start"
      readOnly={readOnly}
      required={required}
      selected={selectedDate}
      dropdownMode="select"
      showMonthDropdown={mode === "date"}
      showMonthYearPicker={mode === "month"}
      showPopperArrow={false}
      showYearDropdown={mode === "date"}
      title={title}
      wrapperClassName="w-full"
    />
  );
}
