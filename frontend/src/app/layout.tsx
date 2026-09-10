import type { Metadata } from "next";
import { AppShell } from "./_components/app-shell";
import { I18nProvider } from "./_i18n/provider";
import { ThemeProvider } from "./_theme/provider";
import "react-datepicker/dist/react-datepicker.css";
import "jsuites/dist/jsuites.css";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "./globals.css";
import "./_components/app-spreadsheet.css";

export const metadata: Metadata = {
  title: {
    default: "ERP Prima Putra Perkasa",
    template: "%s | Prima Putra Perkasa",
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
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
