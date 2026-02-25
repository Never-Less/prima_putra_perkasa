"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Beranda" },
  { href: "/suratJalan", label: "Surat Jalan" },
  { href: "/invoice", label: "Invoice" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-sm lg:hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/" className="mr-auto text-sm font-semibold tracking-wide text-slate-900">
            PRIMA PUTRA PERKASA
          </Link>

          <nav className="flex flex-wrap gap-2 text-xs" aria-label="Mobile navigation">
            {navItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-2.5 py-1.5 transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200/70 lg:bg-white/90 lg:backdrop-blur-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/" className="text-sm font-semibold tracking-wide text-slate-900">
            PRIMA PUTRA PERKASA
          </Link>
          <p className="mt-1 text-xs text-slate-500">Dashboard Surat Jalan</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-4 text-sm" aria-label="Desktop sidebar navigation">
          {navItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
