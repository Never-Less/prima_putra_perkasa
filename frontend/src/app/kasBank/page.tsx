"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, Plus, Trash2, WalletCards } from "lucide-react";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppDateInput } from "../_components/app-date-input";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError, requestApi } from "../_lib/api-client";
import { formatRupiah, formatTanggal } from "../invoice/_lib/invoice";

type Option = { id: string; label: string; type?: "cash" | "bank" };
type Account = Option & { name: string; openingBalance: number; balance: number; isActive: boolean };
type Transaction = { id: string; date: string; account: Option; type: "in" | "out"; category: string; amount: number; description: string; documentNo: string; salesOrder?: Option; pettyCashBatch: string };
type ProfitRow = { id: string; noPo: string; customerName: string; revenue: number; actualCost: number; grossProfit: number; marginPercent: number; hasActualCost: boolean };
type OptionsResponse = { accounts: Option[]; salesOrders: Option[]; invoices: Option[]; purchases: Option[]; suppliers: Option[]; customers: Option[] };

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

export default function KasBankPage() {
  const { locale, t } = useI18n();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [options, setOptions] = useState<OptionsResponse>({ accounts: [], salesOrders: [], invoices: [], purchases: [], suppliers: [], customers: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profitRows, setProfitRows] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accountForm, setAccountForm] = useState({ name: "", type: "cash", openingBalance: "" });
  const [form, setForm] = useState({ date: today(), accountId: "", type: "out", category: "Pembelian barang", amount: "", description: "", documentNo: "", paymentMethod: "cash", purchaseOrderId: "", invoiceId: "", pembelianId: "", supplierId: "", customerId: "", isPpn: false, pettyCashBatch: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [accountData, optionData, transactionData, profitData] = await Promise.all([
        requestApi<{ accounts: Account[] }>("/api/cash-ledger/accounts"),
        requestApi<OptionsResponse>("/api/cash-ledger/options"),
        requestApi<{ transactions: Transaction[] }>("/api/cash-ledger/transactions?limit=200"),
        requestApi<{ rows: ProfitRow[] }>("/api/cash-ledger/profitability"),
      ]);
      setAccounts(accountData.accounts || []); setOptions(optionData); setTransactions(transactionData.transactions || []); setProfitRows(profitData.rows || []);
      setForm((prev) => ({ ...prev, accountId: prev.accountId || optionData.accounts?.[0]?.id || "" }));
    } catch (loadError) { setError(loadError instanceof ApiRequestError ? loadError.message : t("cashLedger.loadError")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  const totals = useMemo(() => transactions.reduce((sum, row) => ({ in: sum.in + (row.type === "in" ? row.amount : 0), out: sum.out + (row.type === "out" ? row.amount : 0) }), { in: 0, out: 0 }), [transactions]);

  async function saveAccount() {
    setSaving(true); setError("");
    try {
      await requestApi("/api/cash-ledger/accounts", { method: "POST", body: { ...accountForm, openingBalance: Number(accountForm.openingBalance || 0) }, invalidateCachePaths: "/api/cash-ledger" });
      setAccountForm({ name: "", type: "cash", openingBalance: "" }); await load();
    } catch (saveError) { setError(saveError instanceof ApiRequestError ? saveError.message : t("cashLedger.saveError")); }
    finally { setSaving(false); }
  }

  async function saveTransaction() {
    setSaving(true); setError("");
    try {
      await requestApi("/api/cash-ledger/transactions", { method: "POST", body: { ...form, amount: Number(form.amount), purchaseOrderId: form.purchaseOrderId || null, invoiceId: form.invoiceId || null, pembelianId: form.pembelianId || null, supplierId: form.supplierId || null, customerId: form.customerId || null }, invalidateCachePaths: ["/api/cash-ledger", "/api/dashboards/finance"] });
      setForm((prev) => ({ ...prev, amount: "", description: "", documentNo: "", purchaseOrderId: "", invoiceId: "", pembelianId: "", supplierId: "", customerId: "", isPpn: false })); await load();
    } catch (saveError) { setError(saveError instanceof ApiRequestError ? saveError.message : t("cashLedger.saveError")); }
    finally { setSaving(false); }
  }

  async function removeTransaction(id: string) {
    if (!window.confirm(t("cashLedger.deleteConfirm"))) return;
    await requestApi(`/api/cash-ledger/transactions/${id}`, { method: "DELETE", invalidateCachePaths: ["/api/cash-ledger", "/api/dashboards/finance"] });
    await load();
  }

  const select = (key: keyof typeof form, rows: Option[], label: string) => <label className="text-sm">{label}<select className="erp-field mt-1 w-full" value={String(form[key])} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}><option value="">{t("common.optional")}</option>{rows.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>;

  return <main className="erp-page space-y-5">
    <header><h1 className="text-2xl font-semibold">{t("cashLedger.title")}</h1><p className="mt-1 text-sm text-slate-500">{t("cashLedger.description")}</p></header>
    {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    {loading ? <ApiLoadingState /> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {accounts.map((row) => <article key={row.id} className="erp-panel p-4"><div className="flex items-center gap-2 text-sm text-slate-500">{row.type === "bank" ? <Landmark className="h-4 w-4" /> : <WalletCards className="h-4 w-4" />}{row.name}</div><p className="mt-2 text-xl font-semibold">{formatRupiah(row.balance, locale)}</p></article>)}
        <article className="erp-panel p-4"><p className="text-sm text-emerald-600">{t("cashLedger.totalIn")}</p><p className="mt-2 text-xl font-semibold">{formatRupiah(totals.in, locale)}</p></article>
        <article className="erp-panel p-4"><p className="text-sm text-red-600">{t("cashLedger.totalOut")}</p><p className="mt-2 text-xl font-semibold">{formatRupiah(totals.out, locale)}</p></article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <article className="erp-panel p-5"><h2 className="font-semibold">{t("cashLedger.newTransaction")}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">{t("field.tanggal")}<AppDateInput value={form.date} onValueChange={(date) => setForm((prev) => ({ ...prev, date }))} className="erp-field mt-1 w-full" /></label>
          <label className="text-sm">{t("cashLedger.account")}<select className="erp-field mt-1 w-full" value={form.accountId} onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}>{options.accounts.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
          <label className="text-sm">{t("cashLedger.type")}<select className="erp-field mt-1 w-full" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}><option value="in">{t("cashLedger.in")}</option><option value="out">{t("cashLedger.out")}</option></select></label>
          <label className="text-sm">{t("cashLedger.category")}<input className="erp-field mt-1 w-full" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} /></label>
          <label className="text-sm">{t("cashLedger.amount")}<input type="number" min="1" className="erp-field mt-1 w-full" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} /></label>
          <label className="text-sm">{t("cashLedger.documentNo")}<input className="erp-field mt-1 w-full" value={form.documentNo} onChange={(event) => setForm((prev) => ({ ...prev, documentNo: event.target.value }))} /></label>
          {select("purchaseOrderId", options.salesOrders, t("cashLedger.salesOrder"))}{select("invoiceId", options.invoices, t("nav.invoice"))}{select("pembelianId", options.purchases, t("nav.pembelian"))}
          {select("supplierId", options.suppliers, t("nav.supplier"))}{select("customerId", options.customers, t("nav.customer"))}
          <label className="text-sm">{t("cashLedger.batch")}<input className="erp-field mt-1 w-full" value={form.pettyCashBatch} onChange={(event) => setForm((prev) => ({ ...prev, pettyCashBatch: event.target.value }))} /></label>
          <label className="text-sm sm:col-span-2 lg:col-span-3">{t("field.note")}<textarea className="erp-field mt-1 min-h-20 w-full" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPpn} onChange={(event) => setForm((prev) => ({ ...prev, isPpn: event.target.checked }))} />{t("cashLedger.ppn")}</label>
        </div><button type="button" onClick={() => void saveTransaction()} disabled={saving || !form.accountId} className="erp-button erp-button-primary mt-4"><Plus className="h-4 w-4" />{saving ? t("common.loading") : t("common.saveChanges")}</button></article>
        <article className="erp-panel p-5"><h2 className="font-semibold">{t("cashLedger.newAccount")}</h2><div className="mt-4 space-y-3"><label className="block text-sm">{t("cashLedger.accountName")}<input className="erp-field mt-1 w-full" value={accountForm.name} onChange={(event) => setAccountForm((prev) => ({ ...prev, name: event.target.value }))} /></label><label className="block text-sm">{t("cashLedger.accountType")}<select className="erp-field mt-1 w-full" value={accountForm.type} onChange={(event) => setAccountForm((prev) => ({ ...prev, type: event.target.value }))}><option value="cash">{t("cashLedger.cash")}</option><option value="bank">{t("cashLedger.bank")}</option></select></label><label className="block text-sm">{t("cashLedger.openingBalance")}<input type="number" className="erp-field mt-1 w-full" value={accountForm.openingBalance} onChange={(event) => setAccountForm((prev) => ({ ...prev, openingBalance: event.target.value }))} /></label><button type="button" onClick={() => void saveAccount()} disabled={saving || !accountForm.name} className="erp-button">{t("common.saveChanges")}</button></div></article>
      </section>

      <article className="erp-panel overflow-hidden"><div className="border-b p-4 dark:border-slate-800"><h2 className="font-semibold">{t("cashLedger.recent")}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="p-3">{t("field.tanggal")}</th><th className="p-3">{t("cashLedger.account")}</th><th className="p-3">{t("cashLedger.category")}</th><th className="p-3">{t("cashLedger.salesOrder")}</th><th className="p-3 text-right">{t("cashLedger.amount")}</th><th className="p-3" /></tr></thead><tbody className="divide-y dark:divide-slate-800">{transactions.map((row) => <tr key={row.id}><td className="p-3">{formatTanggal(row.date, locale)}</td><td className="p-3">{row.account?.label}</td><td className="p-3"><p className="font-medium">{row.category}</p><p className="text-xs text-slate-500">{row.description}</p></td><td className="p-3">{row.salesOrder?.label || "-"}</td><td className={`p-3 text-right font-semibold ${row.type === "in" ? "text-emerald-600" : "text-red-600"}`}>{row.type === "in" ? "+" : "-"}{formatRupiah(row.amount, locale)}</td><td className="p-3"><button type="button" className="erp-icon-button" title={t("common.delete")} onClick={() => void removeTransaction(row.id)}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></article>
      <article className="erp-panel overflow-hidden"><div className="border-b p-4 dark:border-slate-800"><h2 className="font-semibold">{t("cashLedger.profitability")}</h2><p className="text-sm text-slate-500">{t("cashLedger.profitabilityHint")}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="p-3">SO</th><th className="p-3">{t("nav.customer")}</th><th className="p-3 text-right">{t("cashLedger.revenue")}</th><th className="p-3 text-right">{t("cashLedger.actualCost")}</th><th className="p-3 text-right">{t("cashLedger.grossProfit")}</th></tr></thead><tbody className="divide-y dark:divide-slate-800">{profitRows.map((row) => <tr key={row.id}><td className="p-3 font-medium">{row.noPo}</td><td className="p-3">{row.customerName}</td><td className="p-3 text-right">{formatRupiah(row.revenue, locale)}</td><td className="p-3 text-right">{row.hasActualCost ? formatRupiah(row.actualCost, locale) : t("cashLedger.noCost")}</td><td className={`p-3 text-right font-semibold ${row.grossProfit < 0 ? "text-red-600" : "text-emerald-600"}`}>{row.hasActualCost ? `${formatRupiah(row.grossProfit, locale)} (${row.marginPercent.toFixed(1)}%)` : "-"}</td></tr>)}</tbody></table></div></article>
    </>}
  </main>;
}
