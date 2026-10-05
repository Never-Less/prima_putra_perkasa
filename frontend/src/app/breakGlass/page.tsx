"use client";

import { useEffect, useState } from "react";
import AsyncSelect from "react-select/async";
import { useBreakGlassRole } from "../_hooks/use-current-user";
import { useI18n } from "../_i18n/provider";
import { requestApi, invalidateApiGetCache } from "../_lib/api-client";

type Session = { sessionId: string; expiresAt: string; preview: { noInvoice: string; noPoList: string[]; noSuratJalan: string[]; grandTotal: number } };
type AuditEvent = { _id: string; event: string; actorUsername: string; reason: string; targetId: string; createdAt: string };
const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const buttonClass = "rounded-md border px-4 py-2 text-sm disabled:opacity-50";

export default function BreakGlassPage() {
  const role = useBreakGlassRole();
  const { t, locale } = useI18n();
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!role) return;
    let active = true;
    requestApi<{ events: AuditEvent[] }>("/api/break-glass/history", { cache: "no-store" })
      .then((result) => { if (active) setEvents(result.events); })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : t("breakGlass.error")); });
    return () => { active = false; };
  }, [role, t]);

  async function loadInvoices(query: string) {
    try {
      const result = await requestApi<{ options: { value: string; label: string }[] }>(`/api/break-glass/invoice-options?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      return result.options;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("breakGlass.error"));
      return [];
    }
  }

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, Date.parse(session.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session]);

  async function loadHistory() {
    const result = await requestApi<{ events: AuditEvent[] }>("/api/break-glass/history", { cache: "no-store" });
    setEvents(result.events);
  }

  async function run(action: "activate" | "execute" | "revoke" | "history") {
    setBusy(true);
    setMessage("");
    try {
      if (action === "activate") {
        const result = await requestApi<Session>("/api/break-glass/sessions", { method: "POST", body: { operation: "cancelUnpaidInvoice", targetId: targetId.trim(), reason, password } });
        setExpired(false);
        setConfirmation("");
        setSession(result);
      } else if (action !== "history" && session) {
        await requestApi(`/api/break-glass/sessions/${session.sessionId}/${action}`, { method: "POST", body: { confirmation } });
        setSession(null);
        setTargetId("");
        setConfirmation("");
        setMessage(t(action === "execute" ? "breakGlass.success" : "breakGlass.revoked"));
        if (action === "execute") invalidateApiGetCache();
      }
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("breakGlass.error"));
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  if (!role) return <main className="p-6"><p>{t("breakGlass.denied")}</p></main>;

  return <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
    <header><h1 className="text-2xl font-semibold">{t("breakGlass.title")}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("breakGlass.description")}</p></header>
    {message && <p role="status" className="rounded-md border p-3">{message}</p>}
    {!session ? <form className="space-y-4 rounded-lg border p-4" onSubmit={(event) => { event.preventDefault(); void run("activate"); }}>
      <div className="text-sm"><label htmlFor="break-glass-invoice">{t("breakGlass.target")}</label><AsyncSelect inputId="break-glass-invoice" instanceId="break-glass-invoice" className="mt-1 text-slate-900" loadOptions={loadInvoices} onChange={(option) => setTargetId(option?.value || "")} placeholder={t("breakGlass.search")} noOptionsMessage={() => t("breakGlass.noOptions")} loadingMessage={() => t("breakGlass.loading")} isDisabled={busy} isClearable /></div>
      <label className="block text-sm">{t("breakGlass.reason")}<textarea className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={1000} required disabled={busy} /></label>
      <label className="block text-sm">{t("breakGlass.password")}<input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>
      <button className={`${buttonClass} bg-amber-100 text-amber-950`} disabled={busy || !targetId}>{t("breakGlass.activate")}</button>
    </form> : <section className="space-y-4 rounded-lg border border-amber-400 p-4">
      <p>{t("breakGlass.expires", { time: new Date(session.expiresAt).toLocaleString(locale) })}</p>
      <p>{t("breakGlass.impact", { invoice: session.preview.noInvoice, orders: session.preview.noPoList.join(", "), deliveries: session.preview.noSuratJalan.join(", ") })}</p>
      <p>{t("breakGlass.amount", { amount: new Intl.NumberFormat(locale, { style: "currency", currency: "IDR" }).format(session.preview.grandTotal) })}</p>
      {expired && <p role="alert">{t("breakGlass.expired")}</p>}
      <label className="block text-sm">{t("breakGlass.confirmation")}<input className={inputClass} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy || expired} /></label>
      <div className="flex flex-wrap gap-3"><button className={`${buttonClass} bg-red-700 text-white`} disabled={busy || expired || confirmation !== session.preview.noInvoice} onClick={() => void run("execute")}>{t("breakGlass.execute")}</button>
      <button className={buttonClass} disabled={busy} onClick={() => void run("revoke")}>{t("breakGlass.revoke")}</button></div>
    </section>}
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{t("breakGlass.history")}</h2><button className={buttonClass} disabled={busy} onClick={() => void run("history")}>{t("breakGlass.refresh")}</button></div>
      {events.length === 0 ? <p>{t("breakGlass.empty")}</p> : <ol className="space-y-2">{events.map((event) => <li key={event._id} className="rounded-md border p-3 text-sm"><p>{new Date(event.createdAt).toLocaleString(locale)} · {event.actorUsername} · {t(`breakGlass.event.${event.event}`)}</p><p className="break-words">{event.targetId} · {event.reason}</p></li>)}</ol>}
    </section>
  </main>;
}
