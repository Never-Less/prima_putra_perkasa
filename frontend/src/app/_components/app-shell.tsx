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

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLoginRoute = isLoginPath(pathname);

  return (
    <PrivateRouteGuard key={pathname}>
      {isLoginRoute ? null : <AppNavbar />}
      <div className={isLoginRoute ? "" : "lg:pl-64"}>{children}</div>
    </PrivateRouteGuard>
  );
}
