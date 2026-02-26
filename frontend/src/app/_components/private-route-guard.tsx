"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiLoadingState } from "./api-loading-state";
import {
  clearAuthSession,
  getStoredAccessToken,
  isAccessTokenExpired,
  refreshAuthSession,
} from "../_lib/auth-session";

type PrivateRouteGuardProps = {
  children: ReactNode;
};

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function PrivateRouteGuard({ children }: PrivateRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const isPublicRoute = useMemo(() => isPublicPath(pathname), [pathname]);

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

      if (mounted) {
        setIsChecking(false);
      }
    }

    void verifySession();

    return () => {
      mounted = false;
    };
  }, [isPublicRoute, router]);

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
