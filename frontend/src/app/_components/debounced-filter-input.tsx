"use client";

import { type ComponentPropsWithoutRef, useEffect, useState } from "react";
import { useDebouncedValue } from "../_hooks/use-debounced-value";

type DebouncedFilterInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "defaultValue" | "onChange" | "value"
> & {
  delayMs?: number;
  onValueChange: (value: string) => void;
  value: string;
};

export function DebouncedFilterInput({
  delayMs = 350,
  onValueChange,
  value,
  ...props
}: DebouncedFilterInputProps) {
  const [draftValue, setDraftValue] = useState(value);
  const debouncedValue = useDebouncedValue(draftValue, delayMs);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (debouncedValue !== value) {
      onValueChange(debouncedValue);
    }
  }, [debouncedValue, onValueChange, value]);

  return (
    <input
      {...props}
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
    />
  );
}
