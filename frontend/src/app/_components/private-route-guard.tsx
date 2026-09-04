"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiLoadingState } from "./api-loading-state";
import {
  canCurrentUserExport,
  clearAuthSession,
  getStoredAccessToken,
  isAccessTokenExpired,
  isCurrentUserAdmin,
  refreshAuthSession,
} from "../_lib/auth-session";

type PrivateRouteGuardProps = {
  children: ReactNode;
};

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isExportPath(pathname: string) {
  return (
    pathname.startsWith("/suratJalan/export/") ||
    pathname === "/invoice/export" ||
    pathname.startsWith("/invoice/export/") ||
    pathname.startsWith("/salesOrder/export")
  );
}

function isAdminOnlyPath(pathname: string) {
  return (
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname === "/laporanKeuangan" ||
    pathname.startsWith("/laporanKeuangan/")
  );
}

function getExportFallbackPath(pathname: string) {
  if (pathname.startsWith("/suratJalan/export/")) {
    return "/suratJalan";
  }

  if (pathname.startsWith("/invoice/export")) {
    return "/invoice";
  }

  if (pathname.startsWith("/salesOrder/export")) {
    return "/salesOrder";
  }

  return "/";
}

export function PrivateRouteGuard({ children }: PrivateRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const isPublicRoute = useMemo(() => isPublicPath(pathname), [pathname]);
  const isExportRoute = useMemo(() => isExportPath(pathname), [pathname]);
  const isAdminOnlyRoute = useMemo(() => isAdminOnlyPath(pathname), [pathname]);

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      if (isPublicRoute) {
        if (mounted) {
          setIsChecking(false);
        }
        return;
      }

      const accessToken = getStoredAccessToken();

      if (!accessToken) {
        clearAuthSession();
        router.replace("/login");
        return;
      }

      if (!isAccessTokenExpired(accessToken)) {
        if (isAdminOnlyRoute && !isCurrentUserAdmin()) {
          router.replace("/");
          return;
        }

        if (isExportRoute && !canCurrentUserExport()) {
          router.replace(getExportFallbackPath(pathname));
          return;
        }

        if (mounted) {
          setIsChecking(false);
        }
        return;
      }

      const refreshedAccessToken = await refreshAuthSession();

      if (!refreshedAccessToken) {
        clearAuthSession();
        router.replace("/login");
        return;
      }

      if (isAdminOnlyRoute && !isCurrentUserAdmin()) {
        router.replace("/");
        return;
      }

      if (isExportRoute && !canCurrentUserExport()) {
        router.replace(getExportFallbackPath(pathname));
        return;
      }

      if (mounted) {
        setIsChecking(false);
      }
    }

    void verifySession();

    return () => {
      mounted = false;
    };
  }, [isAdminOnlyRoute, isExportRoute, isPublicRoute, pathname, router]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ApiLoadingState />
      </main>
    );
  }

  return <>{children}</>;
}
