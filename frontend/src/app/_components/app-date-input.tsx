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
  onValueChange: (value: string) => void;
  value: string;
};

export function AppDateInput({
  autoComplete = "off",
  className,
  disabled,
  id,
  name,
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
  const selectedDate = parseAppDate(value);
  const dateLocale = locale === "en" ? enUS : localeId;

  return (
    <DatePicker
      autoComplete={autoComplete}
      calendarClassName="app-date-picker-calendar"
      className={className}
      dateFormat="dd-MM-yyyy"
      disabled={disabled}
      id={id}
      isClearable={!required && !disabled && !readOnly}
      locale={dateLocale}
      name={name}
      onBlur={onBlur as FocusEventHandler<HTMLElement> | undefined}
      onChange={(date: Date | null) => onValueChange(toApiDateValue(date))}
      onFocus={onFocus as FocusEventHandler<HTMLElement> | undefined}
      placeholderText={placeholder || "dd-MM-yyyy"}
      popperClassName="app-date-picker-popper"
      popperPlacement="bottom-start"
      readOnly={readOnly}
      required={required}
      selected={selectedDate}
      dropdownMode="select"
      showMonthDropdown
      showPopperArrow={false}
      showYearDropdown
      title={title}
      wrapperClassName="w-full"
    />
  );
}
