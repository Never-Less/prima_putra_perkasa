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
    pathname.startsWith("/salesOrder/export")
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
      <div
        className={hideAppChrome ? "" : "min-h-screen lg:pl-64"}
        data-app-tables={!isLoginRoute && !pathname.split("/").includes("export") ? "spreadsheet" : undefined}
      >{children}</div>
      <UnsavedChangesModal />
    </PrivateRouteGuard>
  );
}
