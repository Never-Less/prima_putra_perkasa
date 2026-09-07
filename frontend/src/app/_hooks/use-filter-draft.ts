"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

type FilterChangeHandler<T extends object> = <K extends keyof T>(key: K, value: T[K]) => void;

export function useFilterDraft<T extends object>(
  filter: T,
  onFilterChange: FilterChangeHandler<T>,
  onResetFilter: () => void
) {
  const [draftFilter, setDraftFilter] = useState<T>(filter);

  useEffect(() => {
    setDraftFilter(filter);
  }, [filter]);

  const updateDraftFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setDraftFilter((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const applyDraftFilter = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    (Object.keys(draftFilter) as Array<keyof T>).forEach((key) => {
      onFilterChange(key, draftFilter[key]);
    });
  }, [draftFilter, onFilterChange]);

  const resetDraftFilter = useCallback(() => {
    setDraftFilter(filter);
    onResetFilter();
  }, [filter, onResetFilter]);

  return {
    draftFilter,
    updateDraftFilter,
    applyDraftFilter,
    resetDraftFilter,
  };
}
