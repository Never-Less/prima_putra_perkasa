"use client";

import { Bell, CheckCheck, ChevronDown, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { releaseNotes } from "../_data/release-notes";
import { useCurrentUserId } from "../_hooks/use-current-user";
import { useI18n } from "../_i18n/provider";

export function ReleaseNotesNotificationCenter() {
  const { locale, t } = useI18n();
  const userId = useCurrentUserId();
  const panelRef = useRef<HTMLDivElement>(null);
  const storageKey = `ppp_release_notes_read_${userId || "anonymous"}`;
  const storageEvent = `${storageKey}_changed`;
  const [isOpen, setIsOpen] = useState(false);
  const storedReadIds = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(storageEvent, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(storageEvent, onStoreChange);
      };
    },
    () => window.localStorage.getItem(storageKey) || "[]",
    () => "[]"
  );
  const readIds = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(storedReadIds);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [storedReadIds]);
  const [expandedId, setExpandedId] = useState(releaseNotes[0]?.id || "");

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  const unreadIds = useMemo(
    () => releaseNotes.map((note) => note.id).filter((id) => !readIds.includes(id)),
    [readIds]
  );

  const saveReadIds = (ids: string[]) => {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
    window.dispatchEvent(new Event(storageEvent));
  };

  const markAllRead = () => saveReadIds(releaseNotes.map((note) => note.id));

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="erp-icon-button relative"
        aria-label={t("releaseNotes.title")}
        title={t("releaseNotes.title")}
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadIds.length > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white dark:ring-slate-950">
            {Math.min(unreadIds.length, 9)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section className="fixed inset-x-3 top-16 z-[80] max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950 sm:left-auto sm:right-4 sm:w-[30rem] lg:top-14">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-blue-600" />
                <h2 className="font-semibold text-slate-950 dark:text-white">{t("releaseNotes.title")}</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("releaseNotes.description")}</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="erp-icon-button" aria-label={t("common.close")}>
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </header>

          {releaseNotes.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">{t("releaseNotes.empty")}</p>
          ) : (
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-3">
              {unreadIds.length > 0 ? (
                <div className="mb-3 flex justify-end">
                  <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
                    <CheckCheck aria-hidden="true" className="h-4 w-4" />
                    {t("releaseNotes.markAllRead")}
                  </button>
                </div>
              ) : null}

              <div className="space-y-3">
                {releaseNotes.map((note) => {
                  const isUnread = unreadIds.includes(note.id);
                  const isExpanded = expandedId === note.id;
                  return (
                    <article key={note.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(isExpanded ? "" : note.id);
                          if (isUnread) saveReadIds([...readIds, note.id]);
                        }}
                        className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">v{note.version}</span>
                            <time className="text-slate-500">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${note.date}T00:00:00`))}</time>
                            {isUnread ? <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">{t("releaseNotes.new")}</span> : null}
                          </div>
                          <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{note.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{note.summary}</p>
                        </div>
                        <ChevronDown aria-hidden="true" className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isExpanded ? (
                        <div className="space-y-4 border-t border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                          {note.sections.map((section) => (
                            <div key={section.title}>
                              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">{section.title}</h4>
                              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600 dark:text-slate-400">
                                {section.changes.map((change) => <li key={change}>{change}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
