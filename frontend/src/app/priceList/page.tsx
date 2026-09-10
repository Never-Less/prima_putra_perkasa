"use client";

import { Filter, ImagePlus, PackageSearch, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppDateInput } from "../_components/app-date-input";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { ListViewHeader } from "../_components/list-view-header";
import { PaginationControls } from "../_components/pagination-controls";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError } from "../_lib/api-client";
import { buildListRouteWithPagination, normalizeStringFilterQueryState } from "../_lib/pagination";
import BulkProductDraft from "./_components/bulk-product-draft";
import { PriceListImage } from "./_components/price-list-image";
import {
  createPriceListItem, defaultPriceListFilter, defaultPriceListForm,
  deletePriceListImage, deletePriceListItem, fetchPriceList, fetchPriceListOptions,
  toPriceListForm, updatePriceListItem, uploadPriceListImages,
  type PriceListFilter, type PriceListFormState, type PriceListItem,
} from "./_lib/price-list";

type ConfirmAction = { type: "save" } | { type: "delete" } | null;
const maxImages = 4;
const maxImageSize = 2 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const filterKeys = Object.keys(defaultPriceListFilter) as Array<keyof PriceListFilter>;

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function readUrlState(query: string) {
  const params = new URLSearchParams(query);
  const filter = normalizeStringFilterQueryState(params, defaultPriceListFilter);
  return { filter, page: parsePositiveInteger(params.get("page"), 1), limit: parsePositiveInteger(params.get("limit"), 10), item: String(params.get("item") || "").trim(), bulk: params.get("bulk") === "1" };
}

function buildPath(filter: PriceListFilter, page: number, limit: number, view?: { item?: string; bulk?: boolean }) {
  return buildListRouteWithPagination("/priceList", { page, limit }, {
    ...filter, item: view?.item, bulk: view?.bulk ? "1" : undefined,
  });
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function PendingImage({ file }: { file: File }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    void Promise.resolve().then(() => {
      if (!active) return;
      objectUrl = URL.createObjectURL(file);
      setSrc(objectUrl);
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={file.name} className="h-full w-full object-cover" /> : null;
}

export default function PriceListPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const query = useSearchParams().toString();
  const initial = readUrlState(query);
  const [rows, setRows] = useState<PriceListItem[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; nama: string }>>([]);
  const [filterDraft, setFilterDraft] = useState(initial.filter);
  const [filter, setFilter] = useState(initial.filter);
  const [form, setForm] = useState<PriceListFormState>(defaultPriceListForm);
  const [selectedId, setSelectedId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(Boolean(initial.item));
  const [isBulkOpen, setIsBulkOpen] = useState(initial.bulk);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [toast, setToast] = useState<{ id: number; message: string; variant: "success" | "error" } | null>(null);
  const [pagination, setPagination] = useState({ page: initial.page, limit: initial.limit, totalItems: 0, totalPages: 1 });
  const loadVersion = useRef(0);

  const selectedItem = useMemo(() => rows.find((row) => row.id === selectedId) || null, [rows, selectedId]);
  const visibleImages = useMemo(() => (selectedItem?.images || []).filter((name) => !removedImages.includes(name)), [removedImages, selectedItem]);
  const activeFilters = useMemo(() => filterKeys.filter((key) => filter[key].trim()).length, [filter]);
  const customerOptions = useMemo(() => !form.namaCustomer || customers.some((item) => item.nama === form.namaCustomer) ? customers : [{ id: "", nama: form.namaCustomer }, ...customers], [customers, form.namaCustomer]);
  const notify = useCallback((message: string, variant: "success" | "error") => setToast({ id: Date.now(), message, variant }), []);

  const loadRows = useCallback(async () => {
    const version = ++loadVersion.current;
    setIsLoading(true); setError("");
    try {
      const result = await fetchPriceList(filter, pagination.page, pagination.limit);
      if (version !== loadVersion.current) return;
      setRows(result.items); setPagination(result.pagination);
    }
    catch (loadError) {
      if (version !== loadVersion.current) return;
      setRows([]); setError(loadError instanceof ApiRequestError ? loadError.message : t("priceList.apiLoadError"));
    }
    finally { if (version === loadVersion.current) setIsLoading(false); }
  }, [filter, pagination.limit, pagination.page, t]);

  useEffect(() => { void loadRows(); return () => { loadVersion.current += 1; }; }, [loadRows]);
  useEffect(() => {
    const state = readUrlState(query);
    setFilterDraft(state.filter); setFilter(state.filter);
    setPagination((current) => ({ ...current, page: state.page, limit: state.limit }));
    setIsBulkOpen(state.bulk);
    if (state.bulk) { setIsFormOpen(false); return; }
    if (!state.item) { setIsFormOpen(false); setSelectedId(""); return; }
    setIsFormOpen(true);
    if (state.item === "new") { setSelectedId(""); setForm({ ...defaultPriceListForm, riwayatPembelian: [] }); setPendingImages([]); setRemovedImages([]); }
  }, [query]);
  useEffect(() => {
    const itemId = String(new URLSearchParams(query).get("item") || "").trim();
    if (!itemId || itemId === "new") return;
    const item = rows.find((row) => row.id === itemId);
    if (item) { setSelectedId(item.id); setForm(toPriceListForm(item)); }
  }, [query, rows]);
  useEffect(() => { void fetchPriceListOptions().then(setCustomers).catch(() => notify(t("priceList.optionsLoadError"), "error")); }, [notify, t]);

  const resetImages = () => { setPendingImages([]); setRemovedImages([]); };
  const applyFilter = (nextFilter: PriceListFilter) => {
    const normalized = normalizeStringFilterQueryState(new URLSearchParams(nextFilter), defaultPriceListFilter);
    loadVersion.current += 1;
    setFilterDraft(normalized);
    setFilter(normalized);
    setPagination((current) => ({ ...current, page: 1 }));
    router.push(buildPath(normalized, 1, pagination.limit), { scroll: false });
  };
  const openNew = () => { setSelectedId(""); setForm({ ...defaultPriceListForm, riwayatPembelian: [] }); resetImages(); setIsFormOpen(true); router.push(buildPath(filter, pagination.page, pagination.limit, { item: "new" })); };
  const openItem = (item: PriceListItem) => { setSelectedId(item.id); setForm(toPriceListForm(item)); resetImages(); setIsFormOpen(true); router.push(buildPath(filter, pagination.page, pagination.limit, { item: item.id })); };
  const closeView = () => { setIsFormOpen(false); setIsBulkOpen(false); resetImages(); router.replace(buildPath(filter, pagination.page, pagination.limit)); };
  const updateForm = (key: keyof PriceListFormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateHistory = (index: number, key: "sumber" | "tanggal" | "hargaBeli", value: string) => setForm((current) => ({ ...current, riwayatPembelian: current.riwayatPembelian.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row) }));

  const addImages = (files: FileList | null) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (selected.some((file) => !allowedImageTypes.includes(file.type))) return notify(t("priceList.image.invalidType"), "error");
    if (selected.some((file) => file.size > maxImageSize)) return notify(t("priceList.image.tooLarge"), "error");
    if (selected.length > maxImages - visibleImages.length - pendingImages.length) return notify(t("priceList.image.tooMany"), "error");
    setPendingImages((current) => [...current, ...selected]);
  };

  const executeSave = async () => {
    setIsSaving(true);
    try {
      const wasUpdate = Boolean(selectedId);
      let saved = wasUpdate ? await updatePriceListItem(selectedId, form) : await createPriceListItem(form);
      if (!saved) throw new Error("Invalid response");
      if (!wasUpdate) {
        setSelectedId(saved.id);
        router.replace(buildPath(filter, pagination.page, pagination.limit, { item: saved.id }));
      }
      for (const filename of removedImages) saved = await deletePriceListImage(saved.id, filename) || saved;
      if (pendingImages.length) saved = await uploadPriceListImages(saved.id, pendingImages) || saved;
      notify(t(wasUpdate ? "priceList.toast.updateSuccess" : "priceList.toast.createSuccess"), "success");
      setConfirmAction(null); setSelectedId(saved.id); closeView(); await loadRows();
    } catch (saveError) { notify(saveError instanceof ApiRequestError ? saveError.message : t("priceList.mutationError"), "error"); }
    finally { setIsSaving(false); }
  };
  const executeDelete = async () => {
    if (!selectedId) return; setIsSaving(true);
    try { await deletePriceListItem(selectedId); notify(t("priceList.toast.deleteSuccess"), "success"); setConfirmAction(null); setSelectedId(""); closeView(); await loadRows(); }
    catch (deleteError) { notify(deleteError instanceof ApiRequestError ? deleteError.message : t("priceList.mutationError"), "error"); }
    finally { setIsSaving(false); }
  };

  const filterField = (key: keyof PriceListFilter, inputMode?: "numeric") => <label className="text-xs font-medium text-slate-600 dark:text-slate-300"><span>{t(`priceList.field.${key}`)}</span><input className="erp-field mt-1 w-full" inputMode={inputMode} value={filterDraft[key]} onChange={(event) => setFilterDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>;

  return <>
    <main className="erp-page">
      <ListViewHeader title={t("nav.priceList")} addLabel={t("common.addPageData", { page: t("nav.priceList") })} onAdd={isFormOpen || isBulkOpen ? undefined : openNew} />
      {isLoading ? <ApiLoadingState /> : null}
      {!isLoading && error ? <section className="erp-panel border-red-200 p-4 text-sm text-red-700">{error}</section> : null}

      {!isLoading && !error && !isFormOpen && !isBulkOpen ? <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <Summary icon={<PackageSearch className="h-5 w-5" />} color="blue" label={t("priceList.summary.total")} value={pagination.totalItems.toLocaleString(locale === "en" ? "en-US" : "id-ID")} />
          <Summary icon={<Search className="h-5 w-5" />} color="emerald" label={t("priceList.summary.shown")} value={String(rows.length)} />
          <Summary icon={<Filter className="h-5 w-5" />} color="violet" label={t("priceList.summary.filters")} value={String(activeFilters)} />
        </section>
        <section className="erp-panel overflow-hidden">
          <form className="border-b border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40" onSubmit={(event) => { event.preventDefault(); applyFilter(filterDraft); }}>
            <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Filter className="h-4 w-4 text-blue-600" />{t("priceList.filter.title")}</h2><p className="mt-0.5 text-xs text-slate-500">{t("priceList.filter.description")}</p></div><button type="button" className="erp-button" onClick={() => router.push(buildPath(filter, pagination.page, pagination.limit, { bulk: true }))}><Plus className="h-4 w-4" />{t("priceList.bulk.open")}</button></div>
            <div className="mb-3 grid">{filterField("search")}</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{filterField("namaBarang")}{filterField("namaCustomer")}{filterField("unit")}{filterField("sumber")}{filterField("hargaJualMin", "numeric")}{filterField("hargaJualMax", "numeric")}</div>
            <div className="mt-3 flex gap-2"><button type="submit" className="erp-button erp-button-primary"><Search className="h-4 w-4" />{t("common.applyFilter")}</button><button type="button" className="erp-button" onClick={() => applyFilter(defaultPriceListFilter)}>{t("common.resetFilter")}</button></div>
          </form>
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th className="w-20 px-4 py-3">{t("priceList.field.photo")}</th><th className="px-4 py-3">{t("priceList.field.namaBarang")}</th><th className="px-4 py-3">{t("priceList.field.customer")}</th><th className="px-4 py-3">{t("priceList.field.unit")}</th><th className="px-4 py-3 text-right">{t("priceList.field.hargaJual")}</th><th className="px-4 py-3">{t("priceList.field.latestPurchase")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-14 text-center"><PackageSearch className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p className="font-medium text-slate-600 dark:text-slate-300">{t("priceList.empty")}</p></td></tr> : rows.map((item) => { const latest = item.riwayatPembelian[0]; return <tr key={item.id} tabIndex={0} onClick={() => openItem(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openItem(item); }} className="cursor-pointer transition-colors hover:bg-blue-50/60 focus:bg-blue-50/60 focus:outline-none dark:hover:bg-blue-950/20">
              <td className="px-4 py-3"><PriceListImage filename={item.images[0]} alt={item.namaBarang} className="h-12 w-12 rounded-lg border border-slate-200 dark:border-slate-700" /></td>
              <td className="max-w-[300px] px-4 py-3"><p className="font-semibold text-slate-950 dark:text-slate-100">{item.namaBarang}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.deskripsi || item.tanggalJual.slice(0, 10)}</p></td>
              <td className="px-4 py-3"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-800">{item.namaCustomer || "-"}</span></td><td className="px-4 py-3 font-medium">{item.unit || "-"}</td>
              <td className="px-4 py-3 text-right"><p className="font-semibold tabular-nums text-blue-700 dark:text-blue-300">{formatCurrency(item.hargaJual, locale)}</p><p className="mt-0.5 text-xs text-slate-500">{item.tanggalJual.slice(0, 10)}</p></td>
              <td className="px-4 py-3"><p className="font-medium tabular-nums">{latest ? formatCurrency(latest.hargaBeli, locale) : "-"}</p><p className="mt-0.5 text-xs text-slate-500">{latest?.sumber || "-"}</p></td>
            </tr>; })}</tbody>
          </table></div>
          <PaginationControls currentPage={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} pageSize={pagination.limit} from={pagination.totalItems ? (pagination.page - 1) * pagination.limit + 1 : 0} to={Math.min(pagination.page * pagination.limit, pagination.totalItems)} onPageChange={(page) => router.push(buildPath(filter, page, pagination.limit))} onPageSizeChange={(limit) => router.push(buildPath(filter, 1, limit))} />
        </section>
      </div> : null}

      {!isLoading && !error && isBulkOpen ? <section className="erp-panel overflow-hidden p-4 sm:p-5"><div className="mb-3 flex justify-end"><button type="button" className="erp-button" onClick={closeView}><X className="h-4 w-4" />{t("common.close")}</button></div><BulkProductDraft /></section> : null}

      {!isLoading && !error && isFormOpen ? <form className="space-y-4" onSubmit={(event: FormEvent) => { event.preventDefault(); setConfirmAction({ type: "save" }); }}>
        <section className="erp-panel overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5"><div><h2 className="text-lg font-semibold">{t("priceList.form.title")}</h2><p className="mt-1 text-sm text-slate-500">{selectedItem ? selectedItem.namaBarang : t("priceList.form.newDescription")}</p></div><button type="button" className="erp-button" onClick={closeView}><X className="h-4 w-4" />{t("common.close")}</button></div>
          <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[310px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center justify-between gap-2"><div><h3 className="font-semibold">{t("priceList.image.title")}</h3><p className="mt-0.5 text-xs text-slate-500">{t("priceList.image.help")}</p></div><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-800">{visibleImages.length + pendingImages.length}/{maxImages}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2">{visibleImages.map((filename, index) => <ImageTile key={filename} onRemove={() => setRemovedImages((current) => [...current, filename])} removeLabel={t("priceList.image.remove")}><PriceListImage filename={filename} alt={`${form.namaBarang} ${index + 1}`} className="h-full w-full" /></ImageTile>)}{pendingImages.map((file, index) => <ImageTile key={`${file.name}-${file.lastModified}-${index}`} onRemove={() => setPendingImages((current) => current.filter((_, fileIndex) => fileIndex !== index))} removeLabel={t("priceList.image.remove")} badge={t("priceList.image.new")}><PendingImage file={file} /></ImageTile>)}</div>
              {visibleImages.length + pendingImages.length < maxImages ? <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"><ImagePlus className="h-5 w-5" />{t("priceList.image.add")}<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { addImages(event.target.files); event.currentTarget.value = ""; }} /></label> : null}
            </aside>
            <section><h3 className="font-semibold">{t("priceList.form.itemInfo")}</h3><p className="mt-1 text-xs text-slate-500">{t("priceList.form.itemInfoDescription")}</p><div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label={t("priceList.field.namaBarang")}><input required className="erp-field mt-1 w-full" value={form.namaBarang} onChange={(event) => updateForm("namaBarang", event.target.value)} /></Field>
              <Field label={t("priceList.field.customer")}><select required className="erp-field mt-1 w-full" value={form.idCustomer ? `id:${form.idCustomer}` : form.namaCustomer ? `name:${form.namaCustomer}` : ""} onChange={(event) => { const [kind, ...parts] = event.target.value.split(":"); const value = parts.join(":"); const option = kind === "id" ? customers.find((item) => item.id === value) : customerOptions.find((item) => item.nama === value); setForm((current) => ({ ...current, idCustomer: option?.id || "", namaCustomer: option?.nama || "" })); }}><option value="">{t("common.placeholder.select", { field: t("priceList.field.customer") })}</option>{customerOptions.map((item) => <option key={`${item.id}-${item.nama}`} value={item.id ? `id:${item.id}` : `name:${item.nama}`}>{item.nama}</option>)}</select></Field>
              <Field label={t("priceList.field.hargaJual")}><MoneyInput value={form.hargaJual} onChange={(value) => updateForm("hargaJual", value)} /></Field>
              <Field label={t("priceList.field.tanggalJual")}><AppDateInput required className="erp-field mt-1 w-full" value={form.tanggalJual} onValueChange={(value) => updateForm("tanggalJual", value)} /></Field>
              <Field label={t("priceList.field.unit")}><input required className="erp-field mt-1 w-full" value={form.unit} onChange={(event) => updateForm("unit", event.target.value)} /></Field>
              <label className="text-sm font-medium md:col-span-2">{t("priceList.field.deskripsi")}<textarea className="erp-field mt-1 min-h-24 w-full resize-y" value={form.deskripsi} onChange={(event) => updateForm("deskripsi", event.target.value)} /></label>
            </div></section>
          </div>
        </section>
        <section className="erp-panel p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{t("priceList.purchaseHistory.title")}</h3><p className="mt-1 text-xs text-slate-500">{t("priceList.purchaseHistory.description")}</p></div><button type="button" className="erp-button" onClick={() => setForm((current) => ({ ...current, riwayatPembelian: [...current.riwayatPembelian, { id: `new-${Date.now()}`, sumber: "", tanggal: "", hargaBeli: "" }] }))}><Plus className="h-4 w-4" />{t("priceList.purchaseHistory.add")}</button></div>
          <div className="mt-4 space-y-2">{form.riwayatPembelian.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">{t("priceList.purchaseHistory.empty")}</div> : form.riwayatPembelian.map((row, index) => <div key={row.id || index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30 md:grid-cols-[1fr_190px_210px_38px]"><Field small label={t("priceList.field.sumber")}><input required className="erp-field mt-1 w-full" value={row.sumber} onChange={(event) => updateHistory(index, "sumber", event.target.value)} /></Field><Field small label={t("priceList.field.tanggalBeli")}><AppDateInput required className="erp-field mt-1 w-full" value={row.tanggal} onValueChange={(value) => updateHistory(index, "tanggal", value)} /></Field><Field small label={t("priceList.field.hargaBeli")}><MoneyInput value={row.hargaBeli} onChange={(value) => updateHistory(index, "hargaBeli", value)} /></Field><button type="button" className="erp-icon-button self-end text-red-600" title={t("common.delete")} onClick={() => setForm((current) => ({ ...current, riwayatPembelian: current.riwayatPembelian.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 className="h-4 w-4" /></button></div>)}</div>
        </section>
        <section className="erp-panel flex flex-wrap justify-between gap-3 p-4"><div>{selectedId ? <button type="button" className="erp-button erp-button-danger" onClick={() => setConfirmAction({ type: "delete" })}><Trash2 className="h-4 w-4" />{t("common.delete")}</button> : null}</div><div className="flex gap-2"><button type="button" className="erp-button" onClick={closeView}>{t("common.cancel")}</button><button type="submit" className="erp-button erp-button-primary">{t("common.saveChanges")}</button></div></section>
      </form> : null}
    </main>
    <ConfirmationModal isOpen={Boolean(confirmAction)} title={t(confirmAction?.type === "delete" ? "priceList.confirmDeleteTitle" : "priceList.confirmSaveTitle")} description={t(confirmAction?.type === "delete" ? "priceList.confirmDeleteDescription" : "priceList.confirmSaveDescription")} confirmLabel={t(confirmAction?.type === "delete" ? "common.delete" : "common.saveChanges")} cancelLabel={t("common.cancel")} isLoading={isSaving} variant={confirmAction?.type === "delete" ? "danger" : "default"} onConfirm={() => void (confirmAction?.type === "delete" ? executeDelete() : executeSave())} onCancel={() => setConfirmAction(null)} />
    <AppToast isOpen={Boolean(toast)} message={toast?.message || ""} variant={toast?.variant || "success"} closeLabel={t("common.close")} toastKey={toast?.id} onClose={() => setToast(null)} />
  </>;
}

function Summary({ icon, color, label, value }: { icon: React.ReactNode; color: "blue" | "emerald" | "violet"; label: string; value: string }) {
  const colors = { blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40", emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40", violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40" };
  return <article className="erp-panel flex items-center gap-3 p-4"><span className={`rounded-lg p-2.5 ${colors[color]}`}>{icon}</span><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></div></article>;
}

function Field({ label, small, children }: { label: string; small?: boolean; children: React.ReactNode }) { return <label className={small ? "text-xs font-medium" : "text-sm font-medium"}>{label}{children}</label>; }
function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span><input required min="0" type="number" className="erp-field w-full pl-9 text-right tabular-nums" value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function ImageTile({ children, onRemove, removeLabel, badge }: { children: React.ReactNode; onRemove: () => void; removeLabel: string; badge?: string }) { return <div className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">{children}{badge ? <span className="absolute bottom-2 left-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{badge}</span> : null}<button type="button" title={removeLabel} onClick={onRemove} className="absolute right-2 top-2 rounded-full bg-slate-950/75 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"><X className="h-3.5 w-3.5" /></button></div>; }
