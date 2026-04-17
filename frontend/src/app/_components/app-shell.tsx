"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AppNavbar } from "./app-navbar";
import { PrivateRouteGuard } from "./private-route-guard";

type AppShellProps = {
  children: ReactNode;
};

function isLoginPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isChromelessPath(pathname: string) {
  return (
    pathname.startsWith("/suratJalan/export/") ||
    pathname === "/invoice/export" ||
    pathname.startsWith("/invoice/export/") ||
    pathname.startsWith("/purchaseOrder/export")
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLoginRoute = isLoginPath(pathname);
  const isChromelessRoute = isChromelessPath(pathname);
  const hideAppChrome = isLoginRoute || isChromelessRoute;

  return (
    <PrivateRouteGuard key={pathname}>
      {hideAppChrome ? null : <AppNavbar />}
      <div className={hideAppChrome ? "" : "lg:pl-64"}>{children}</div>
    </PrivateRouteGuard>
  );
}
