"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  buildListRouteWithPagination,
  normalizePaginationQueryState,
  normalizeStringFilterQueryState,
  type PaginationQueryState,
} from "../_lib/pagination";

type PersistentListUrlOptions<TFilter extends Record<string, string>> = {
  enabled: boolean;
  basePath: string;
  defaultFilter: TFilter;
  defaultPagination: PaginationQueryState;
  defaultSort: string;
  filter: TFilter;
  pagination: PaginationQueryState;
  sort: string;
  setFilter: (value: TFilter) => void;
  setPagination: (value: PaginationQueryState) => void;
  setSort: (value: string) => void;
};

export function usePersistentListUrl<TFilter extends Record<string, string>>({
  enabled,
  basePath,
  defaultFilter,
  defaultPagination,
  defaultSort,
  filter,
  pagination,
  sort,
  setFilter,
  setPagination,
  setSort,
}: PersistentListUrlOptions<TFilter>) {
  const router = useRouter();
  const applyingBrowserHistory = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const applyLocation = () => {
      const params = new URLSearchParams(window.location.search);
      applyingBrowserHistory.current = true;
      setFilter(normalizeStringFilterQueryState(params, defaultFilter));
      setPagination(normalizePaginationQueryState({ page: params.get("page"), limit: params.get("limit") }, defaultPagination));
      setSort(String(params.get("sort") || defaultSort));
    };
    window.addEventListener("popstate", applyLocation);
    return () => window.removeEventListener("popstate", applyLocation);
  }, [defaultFilter, defaultPagination, defaultSort, enabled, setFilter, setPagination, setSort]);

  useEffect(() => {
    if (!enabled) return;
    if (applyingBrowserHistory.current) {
      applyingBrowserHistory.current = false;
      return;
    }
    const target = buildListRouteWithPagination(basePath, pagination, { ...filter, sort });
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== target) router.replace(target, { scroll: false });
  }, [basePath, enabled, filter, pagination, router, sort]);
}
