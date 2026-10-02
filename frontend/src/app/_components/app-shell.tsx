"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AppNavbar } from "./app-navbar";
import { PrivateRouteGuard } from "./private-route-guard";
import { UnsavedChangesModal } from "./unsaved-changes-modal";

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
    pathname.startsWith("/salesOrder/export") ||
    pathname.startsWith("/tagihanBelumDibayar/export")
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLoginRoute = isLoginPath(pathname);
  const isChromelessRoute = isChromelessPath(pathname);
  const isSupplierFormRoute = pathname === "/supplier-registration";
  const hideAppChrome = isLoginRoute || isChromelessRoute || isSupplierFormRoute;

  return (
    <PrivateRouteGuard key={pathname}>
      {hideAppChrome ? null : <AppNavbar />}
      <div
        className={hideAppChrome ? "" : "min-h-screen lg:pl-64 print:!pl-0"}
        data-app-tables={!isLoginRoute && !isSupplierFormRoute && !pathname.split("/").includes("export") ? "spreadsheet" : undefined}
      >{children}</div>
      <UnsavedChangesModal />
    </PrivateRouteGuard>
  );
}
