"use client";

import { useState } from "react";
import { canCurrentUserExport } from "../_lib/auth-session";

export function useExportAccess() {
  const [canExport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return canCurrentUserExport();
  });

  return canExport;
}
