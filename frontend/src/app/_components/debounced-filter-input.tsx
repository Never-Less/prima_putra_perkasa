"use client";

import { type ComponentPropsWithoutRef } from "react";

type DebouncedFilterInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "defaultValue" | "onChange" | "value"
> & {
  onValueChange: (value: string) => void;
  value: string;
};

export function DebouncedFilterInput({
  onValueChange,
  value,
  ...props
}: DebouncedFilterInputProps) {
  return (
    <input
      {...props}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}
