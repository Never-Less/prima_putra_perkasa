"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { buildListQueryString } from "../_lib/pagination";

type PersistentQueryValuesOptions<TValues extends Record<string, string>> = {
  enabled?: boolean;
  basePath: string;
  values: TValues;
  defaults: TValues;
  onRestore: (values: TValues) => void;
};

export function readPersistentQueryValues<TValues extends Record<string, string>>(
  searchParams: { get(name: string): string | null },
  defaults: TValues
) {
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, String(searchParams.get(key) ?? fallback)])
  ) as TValues;
}

export function usePersistentQueryValues<TValues extends Record<string, string>>({
  enabled = true,
  basePath,
  values,
  defaults,
  onRestore,
}: PersistentQueryValuesOptions<TValues>) {
  const router = useRouter();
  const applyingBrowserHistory = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const applyLocation = () => {
      applyingBrowserHistory.current = true;
      onRestore(readPersistentQueryValues(new URLSearchParams(window.location.search), defaults));
    };
    window.addEventListener("popstate", applyLocation);
    return () => window.removeEventListener("popstate", applyLocation);
  }, [defaults, enabled, onRestore]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (applyingBrowserHistory.current) {
      applyingBrowserHistory.current = false;
      return;
    }
    const target = `${basePath}${buildListQueryString(values)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== target) router.replace(target, { scroll: false });
  }, [basePath, enabled, router, values]);
}
