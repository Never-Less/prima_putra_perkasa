import type { Metadata } from "next";
import { defaultLocale, messages } from "./_i18n/messages";
import { AppShell } from "./_components/app-shell";
import { AppPageTitle } from "./_components/app-page-title";
import { I18nProvider } from "./_i18n/provider";
import { ThemeProvider } from "./_theme/provider";
import "react-datepicker/dist/react-datepicker.css";
import "jsuites/dist/jsuites.css";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "./globals.css";
import "./_components/app-spreadsheet.css";

export const metadata: Metadata = {
  title: {
    default: `${messages[defaultLocale]["nav.home"]} | ${messages[defaultLocale]["pageTitle.brand"]}`,
    template: `%s | ${messages[defaultLocale]["pageTitle.brand"]}`,
  },
  description: "Sistem ERP Prima Putra Perkasa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased transition-colors duration-300">
        <ThemeProvider>
          <I18nProvider>
            <AppPageTitle />
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
