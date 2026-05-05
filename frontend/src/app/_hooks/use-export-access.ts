"use client";

import { useSyncExternalStore } from "react";
import { canCurrentUserExport, subscribeAuthSession } from "../_lib/auth-session";

export function useExportAccess() {
  return useSyncExternalStore(
    subscribeAuthSession,
    () => canCurrentUserExport(),
    () => false
  );
}
