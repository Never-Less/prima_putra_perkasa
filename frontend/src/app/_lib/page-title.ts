import type { Metadata } from "next";
import { defaultLocale, messages } from "../_i18n/messages";

export const pageTitleKeys: Record<string, string> = {
  "/": "nav.home",
  "/login": "nav.login",
  "/user": "nav.user",
  "/customer": "nav.customer",
  "/supplier": "nav.supplier",
  "/supplier-registration": "supplierOnboarding.publicTitle",
  "/suratJalan": "nav.suratJalan",
  "/invoice": "nav.invoice",
  "/salesOrder": "nav.purchaseOrder",
  "/salesOrderDashboard": "nav.salesOrderDashboard",
  "/dashboardPenjualan": "nav.salesDashboard",
  "/dashboardFinance": "nav.financeDashboard",
  "/kasBank": "nav.cashLedger",
  "/pembelian": "nav.pembelian",
  "/laporanKeuangan": "nav.laporanKeuangan",
  "/pembayaranAllCustomer": "nav.pembayaranAllCustomer",
  "/tagihanBelumDibayar": "nav.piutangCustomer",
  "/hutangSupplier": "nav.hutangSupplier",
  "/priceList": "nav.priceList",
  "/rekapTagihanPembayaranPabrik": "nav.rekapTagihanPembayaranPabrik",
  "/breakGlass": "breakGlass.title",
};

export function getPageTitleKey(pathname: string) {
  return pageTitleKeys[`/${pathname.split("/").filter(Boolean)[0] || ""}`];
}

export function createPageMetadata(pathname: string): Metadata {
  const key = getPageTitleKey(pathname);
  return { title: key ? messages[defaultLocale][key] : messages[defaultLocale]["nav.home"] };
}

export function formatPageTitle(title: string, brand: string, detail?: string) {
  return `${title}${detail?.trim() ? ` - ${detail.trim()}` : ""} | ${brand}`;
}
