"use client";

import { AppShell } from "@/components/app-shell";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { Bus, ExpenseKey, SheetInput } from "@/lib/types";
import { cn, expenseLabel, money } from "@/lib/utils";
import { BusFront, Camera, CheckCircle2, FileImage, Loader2, Plus, Save, ScanLine, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const keys: ExpenseKey[] = ["diesel", "oil", "tyre", "spare_parts", "workshop", "stand_fee", "washing", "others"];
const STAND_FEE = 60;
const queueSteps = ["Uploading", "Processing", "Review", "Done"] as const;
const blankBus = (): Bus => ({ id: crypto.randomUUID(), bus_number: "", vehicle_number: "", route_name: "", driver_name: "", conductor_name: "", status: "active" });

function crewBatha(col: number) {
  const d = Math.round(col * .10), c = Math.round(col * .09), ch = Math.round(col * .08);
  return { driver: d, conductor: c, checker: ch, total: d + c + ch };
}

export default function ScannerPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [data, setData] = useState<SheetInput>();
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busDraft, setBusDraft] = useState<Bus | null>(null);
  const [busError, setBusError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.buses().then(b => { setBuses(b); if (b.length > 0) setSelectedBusId(b[0].id); }).catch(() => setError("Start the FastAPI server before scanning."));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedBus = buses.find(b => b.id === selectedBusId);
  const hasBuses = buses.length > 0;
  const crew = useMemo(() => {
    if (!data) return { driver: 0, conductor: 0, checker: 0, total: 0 };
    const derived = crewBatha(Number(data.collection));
    const driver = Number(data.driver_collection) || derived.driver;
    const conductor = Number(data.conductor_collection) || derived.conductor;
    const checker = Number(data.checker_collection) || derived.checker;
    return { driver, conductor, checker, total: Number(data.batha) || driver + conductor + checker };
  }, [data?.collection, data?.driver_collection, data?.conductor_collection, data?.checker_collection, data?.batha]);
  const expenseItems = useMemo(() => data ? Object.entries(data.expenses).reduce((a, [k, v]) => a + (k === "stand_fee" ? STAND_FEE : Number(v || 0)), 0) : 0, [data?.expenses]);
  const totalExpense = crew.total + expenseItems;
  const balance = data ? Number(data.collection) - totalExpense : 0;
  const mismatch = data && Math.abs(balance - (Number(data.balance) || 0)) > 2;

  const applyRules = (base: SheetInput, busId: string): SheetInput => {
    const c = crewBatha(Number(base.collection));
    const driver = Number(base.driver_collection) || c.driver;
    const conductor = Number(base.conductor_collection) || c.conductor;
    const checker = Number(base.checker_collection) || c.checker;
    const batha = Number(base.batha) || driver + conductor + checker;
    return { ...base, bus_id: busId, driver_collection: driver, conductor_collection: conductor, checker_collection: checker, batha, total: Number(base.total) || batha, expenses: { ...base.expenses, stand_fee: base.expenses.stand_fee ?? STAND_FEE } };
  };

  const beginManual = () => {
    if (!selectedBusId) {
      setError("Register at least one bus before entering a collection sheet.");
      return;
    }
    setData({ bus_id: selectedBusId, service_date: new Date().toISOString().slice(0, 10), driver_name: selectedBus?.driver_name || "", conductor_name: selectedBus?.conductor_name || "", batha: 0, driver_collection: 0, conductor_collection: 0, checker_collection: 0, total: 0, collection: 0, expense: 0, balance: 0, expenses: { diesel: 0, oil: 0, tyre: 0, spare_parts: 0, workshop: 0, stand_fee: STAND_FEE, washing: 0, others: 0 }, confidence: 0 });
    setError("");
  };

  const pickFile = (chosen?: File | null) => {
    if (!hasBuses) {
      setError("Register at least one bus before uploading a collection sheet.");
      return;
    }
    if (!chosen) return;
    setFile(chosen);
    setError("");
    setSaved(false);
  };

  const scan = async () => {
    if (!hasBuses || !selectedBusId) {
      setError("Register at least one bus before scanning.");
      return;
    }
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const extracted = await api.extract(file);
      const bus = buses.find(b => b.id === selectedBusId);
      const d = applyRules({ ...extracted, driver_name: bus?.driver_name || extracted.driver_name, conductor_name: bus?.conductor_name || extracted.conductor_name }, selectedBusId);
      setData(d);
      setToast("Sheet is ready for review.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not scan image");
    } finally {
      setBusy(false);
    }
  };

  const update = (key: keyof SheetInput, value: string) => setData(d => {
    if (!d) return d;
    const updated = { ...d, [key]: key === "bus_id" || key === "service_date" || key === "driver_name" || key === "conductor_name" ? value : Number(value) };
    if (key === "collection") {
      const c = crewBatha(Number(value));
      updated.driver_collection = c.driver;
      updated.conductor_collection = c.conductor;
      updated.checker_collection = c.checker;
      updated.batha = c.total;
      updated.total = c.total;
    }
    return updated;
  });
  const updateExpense = (k: ExpenseKey, v: string) => { if (k === "stand_fee") return; setData(d => d ? { ...d, expenses: { ...d.expenses, [k]: Number(v) } } : d); };
  const save = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await api.saveSheet({ ...data, bus_id: selectedBusId || data.bus_id, driver_collection: crew.driver, conductor_collection: crew.conductor, checker_collection: crew.checker, batha: crew.total, total: crew.total, expenses: { ...data.expenses, stand_fee: STAND_FEE }, expense: totalExpense, balance });
      setSaved(true);
      setToast("Collection sheet saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const saveBus = async () => {
    if (!busDraft) return;
    const required = [busDraft.bus_number, busDraft.vehicle_number, busDraft.route_name, busDraft.driver_name, busDraft.conductor_name];
    if (required.some((value) => !value.trim())) {
      setBusError("Fill all bus details before saving.");
      return;
    }
    setBusy(true);
    setBusError("");
    try {
      const savedBus = await api.addBus(busDraft);
      setBuses((items) => [...items, savedBus]);
      setSelectedBusId(savedBus.id);
      setBusDraft(null);
      setError("");
      setToast("Bus registered. You can scan its sheet now.");
    } catch (e) {
      setBusError(e instanceof Error ? e.message : "Could not add bus");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-7">
        <PageHeader
          eyebrow="Upload and review"
          title="Scan a collection sheet"
          description="Choose the bus, upload or capture the sheet, review the extracted totals, then save the clean record."
        />

        {toast ? <div className="fixed right-4 top-20 z-50"><Notice>{toast}</Notice></div> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}

        {!hasBuses && !saved && !data ? (
          <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
            <div className="card p-6">
              <span className="grid size-12 place-items-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700"><BusFront size={24} /></span>
              <h2 className="mt-5 text-xl font-semibold text-charcoal">Register a bus first</h2>
              <p className="mt-2 text-sm leading-6 text-muted">FleetMind needs at least one bus so every scanned collection sheet can be assigned to the correct vehicle, route, driver, and conductor.</p>
              <button type="button" className="btn-primary mt-6 w-full" onClick={() => setBusDraft(blankBus())}><Plus size={17} /> Add first bus</button>
            </div>
            <div className="card-static p-6 opacity-60">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="label text-brand-700">Sheet image</p>
                  <h2 className="mt-2 font-semibold text-charcoal">Upload locked</h2>
                </div>
                <StatusBadge tone="warning">Bus required</StatusBadge>
              </div>
              <div className="mt-5 rounded-lg border border-dashed border-line bg-canvas px-5 py-10 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-lg border border-line bg-surface text-muted"><UploadCloud size={26} /></span>
                <p className="mt-5 font-semibold text-charcoal">Add a bus to unlock scanning</p>
                <p className="mt-2 text-sm text-muted">Uploads are disabled until the fleet has at least one bus.</p>
              </div>
            </div>
          </div>
        ) : saved ? (
          <div className="card p-10 text-center">
            <CheckCircle2 className="mx-auto text-brand-700" size={44} />
            <h2 className="mt-4 text-xl font-semibold text-charcoal">Collection sheet saved</h2>
            <p className="mt-2 text-sm text-muted">Dashboard and reports now include the reviewed figures.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a className="btn-primary" href="/">View dashboard</a>
              <button className="btn-ghost" onClick={() => { setSaved(false); setData(undefined); setFile(undefined); }}>Upload another</button>
            </div>
          </div>
        ) : !data ? (
          <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label text-brand-700">Bus assignment</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Pick the bus before upload so the review panel starts with the right crew.</p>
                </div>
                <button type="button" className="icon-btn shrink-0" onClick={() => setBusDraft(blankBus())} aria-label="Add bus"><Plus size={17} /></button>
              </div>
              <select className="field mt-5 text-base" value={selectedBusId} onChange={e => setSelectedBusId(e.target.value)} aria-label="Select bus">
                {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number} / {b.vehicle_number} / {b.route_name}</option>)}
              </select>
              {selectedBus && (
                <div className="mt-4 rounded-lg border border-line bg-canvas p-4 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-muted">Driver</span><span className="font-medium text-charcoal">{selectedBus.driver_name}</span></div>
                  <div className="mt-2 flex justify-between gap-4"><span className="text-muted">Conductor</span><span className="font-medium text-charcoal">{selectedBus.conductor_name}</span></div>
                </div>
              )}
              <button type="button" onClick={beginManual} className="btn-ghost mt-5 w-full">Enter manually</button>
            </div>

            <div className={cn("card p-5 sm:p-6", !selectedBusId && "pointer-events-none opacity-50")}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="label text-brand-700">Sheet image</p>
                  <h2 className="mt-2 font-semibold text-charcoal">Upload queue</h2>
                </div>
                <StatusBadge tone={busy ? "brand" : file ? "warning" : "neutral"}>{busy ? "Processing" : file ? "Ready" : "Waiting"}</StatusBadge>
              </div>
              <div
                className="mt-5 rounded-lg border border-dashed border-brand-100 bg-brand-50/60 px-5 py-10 text-center transition hover:bg-brand-50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
              >
                <input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={e => pickFile(e.target.files?.[0])} />
                <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={e => pickFile(e.target.files?.[0])} />
                <span className="mx-auto grid size-14 place-items-center rounded-lg border border-brand-100 bg-surface text-brand-700">{file ? <FileImage size={26} /> : <UploadCloud size={26} />}</span>
                <p className="mt-5 font-semibold text-charcoal">{file ? file.name : "Drop the collection sheet here"}</p>
                <p className="mt-2 text-sm text-muted">PNG, JPG, or HEIC up to 10MB</p>
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}><UploadCloud size={17} /> Browse file</button>
                  <button type="button" className="btn-ghost" onClick={() => cameraRef.current?.click()}><Camera size={17} /> Use camera</button>
                </div>
              </div>
              <QueueProgress busy={busy} file={Boolean(file)} error={Boolean(error)} />
              <button disabled={!file || !selectedBusId || busy} onClick={scan} className="btn-primary mt-5 w-full">
                {busy ? <><Loader2 className="animate-spin" size={17} /> Reading sheet</> : <><ScanLine size={17} /> Extract collection details</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
            <ReviewPanel data={data} buses={buses} crew={crew} update={update} updateExpense={updateExpense} />
            <aside className="space-y-5">
              <TotalsPanel data={data} crew={crew} expenseItems={expenseItems} totalExpense={totalExpense} balance={balance} mismatch={Boolean(mismatch)} save={save} busy={busy} error={error} />
              <div className="card-static p-5">
                <p className="text-sm font-semibold text-charcoal">Batha rules</p>
                <div className="mt-3 grid gap-2 text-sm text-muted">
                  <Rule label="Driver" value="10%" />
                  <Rule label="Conductor" value="9%" />
                  <Rule label="Checker" value="8%" />
                  <Rule label="Stand fee" value={money(STAND_FEE)} />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
      {busDraft ? <BusModal draft={busDraft} setDraft={setBusDraft} save={saveBus} busy={busy} error={busError} /> : null}
    </AppShell>
  );
}

function BusModal({ draft, setDraft, save, busy, error }: { draft: Bus; setDraft: (bus: Bus | null) => void; save: () => void; busy: boolean; error: string; }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-charcoal/45 p-4" role="dialog" aria-modal="true" aria-labelledby="add-bus-title">
      <div className="w-full max-w-xl rounded-lg border border-line bg-surface p-6 shadow-lift">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-bus-title" className="text-lg font-semibold text-charcoal">Add bus</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Register the bus once, then scan collection sheets against it.</p>
          </div>
          <button className="icon-btn size-9" onClick={() => setDraft(null)} aria-label="Close add bus form"><X size={17} /></button>
        </div>
        {error ? <div className="mt-4"><Notice tone="error">{error}</Notice></div> : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <BusField label="Bus number" value={draft.bus_number} onChange={(value) => setDraft({ ...draft, bus_number: value })} placeholder="KL Bus 01" />
          <BusField label="Vehicle number" value={draft.vehicle_number} onChange={(value) => setDraft({ ...draft, vehicle_number: value })} placeholder="KL 11 AB 1234" />
          <BusField label="Route name" value={draft.route_name} onChange={(value) => setDraft({ ...draft, route_name: value })} placeholder="Route 14" wide />
          <BusField label="Driver name" value={draft.driver_name} onChange={(value) => setDraft({ ...draft, driver_name: value })} placeholder="Driver" />
          <BusField label="Conductor name" value={draft.conductor_name} onChange={(value) => setDraft({ ...draft, conductor_name: value })} placeholder="Conductor" />
          <label>
            <span className="label">Status</span>
            <select className="field mt-1.5" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Bus["status"] })}>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />} Save bus</button>
        </div>
      </div>
    </div>
  );
}

function BusField({ label, value, onChange, placeholder, wide }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; wide?: boolean }) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="label">{label}</span>
      <input className="field mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function QueueProgress({ busy, file, error }: { busy: boolean; file: boolean; error: boolean }) {
  const activeIndex = error ? -1 : busy ? 1 : file ? 0 : -1;
  return (
    <div className="mt-5 grid grid-cols-4 gap-2" aria-label="Upload queue status">
      {queueSteps.map((step, i) => (
        <div key={step} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold", i <= activeIndex ? "border-brand-100 bg-brand-50 text-brand-700" : "border-line bg-surface text-muted", error && i === 1 && "border-red-100 bg-red-50 text-red-700")}>{step}</div>
      ))}
    </div>
  );
}

function ReviewPanel({ data, buses, crew, update, updateExpense }: { data: SheetInput; buses: Bus[]; crew: ReturnType<typeof crewBatha>; update: (key: keyof SheetInput, value: string) => void; updateExpense: (k: ExpenseKey, v: string) => void; }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-charcoal">Review before save</h2>
          <p className="mt-1 text-sm text-muted">Confidence {Math.round(data.confidence * 100)}%. Edit any value before it becomes part of reports.</p>
        </div>
        <StatusBadge tone="success">Review</StatusBadge>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Bus" value={data.bus_id} onChange={v => update("bus_id", v)} select options={buses.map(b => ({ value: b.id, label: `${b.bus_number} / ${b.vehicle_number}` }))} />
        <Field label="Service date" value={data.service_date} onChange={v => update("service_date", v)} type="date" />
        <Field label="Driver" value={data.driver_name} onChange={v => update("driver_name", v)} />
        <Field label="Conductor" value={data.conductor_name} onChange={v => update("conductor_name", v)} />
        <Field label="Total collection (INR)" value={data.collection} onChange={v => update("collection", v)} />
      </div>
      <div className="mt-5 rounded-lg border border-brand-100 bg-brand-50 p-4">
        <p className="label text-brand-700">Auto batha</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <CalcRow label="Driver 10%" value={crew.driver} />
          <CalcRow label="Conductor 9%" value={crew.conductor} />
          <CalcRow label="Checker 8%" value={crew.checker} />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-brand-100 pt-3"><span className="text-sm font-semibold">Total batha</span><span className="font-semibold text-brand-700">{money(crew.total)}</span></div>
      </div>
      <p className="label mt-7">Expense breakdown</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{keys.map(k => k === "stand_fee" ? <CalcFieldRow key={k} label="Stand fee fixed" value={STAND_FEE} /> : <Field key={k} label={expenseLabel(k)} value={data.expenses[k] || 0} onChange={v => updateExpense(k, v)} />)}</div>
    </div>
  );
}

function TotalsPanel({ data, crew, expenseItems, totalExpense, balance, mismatch, save, busy, error }: { data: SheetInput; crew: ReturnType<typeof crewBatha>; expenseItems: number; totalExpense: number; balance: number; mismatch: boolean; save: () => void; busy: boolean; error: string; }) {
  return (
    <div className="card p-6">
      <p className="label">Validated totals</p>
      <div className="mt-5 space-y-3">
        <TotalRow label="Total collection" value={data.collection} />
        <TotalRow label="Batha" value={crew.total} sub />
        <TotalRow label="Other expenses" value={expenseItems - STAND_FEE} sub />
        <TotalRow label="Stand fee" value={STAND_FEE} sub />
        <div className="border-t border-line pt-3"><TotalRow label="Total expense" value={totalExpense} amber /></div>
        <div className="border-t border-line pt-3"><TotalRow label="Balance" value={balance} strong /></div>
      </div>
      <div className="mt-5">
        {mismatch ? <Notice tone="warning">Sheet total differs from calculated balance. Review figures.</Notice> : <Notice>All figures are consistent.</Notice>}
      </div>
      <button disabled={busy} onClick={save} className="btn-primary mt-5 w-full">{busy ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />} Save reviewed sheet</button>
      {error ? <div className="mt-3"><Notice tone="error">{error}</Notice></div> : null}
    </div>
  );
}

function Field({ label, value, onChange, select, options, type }: { label: string; value: string | number; onChange: (v: string) => void; select?: boolean; options?: { value: string; label: string }[]; type?: string }) {
  return <label><span className="label">{label}</span>{select ? <select className="field mt-1.5" value={value} onChange={e => onChange(e.target.value)}>{options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : <input className="field mt-1.5" type={type || (typeof value === "number" ? "number" : "text")} min="0" value={value} onChange={e => onChange(e.target.value)} />}</label>;
}
function CalcRow({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-brand-100 bg-surface px-3 py-2"><p className="text-xs text-muted">{label}</p><p className="mt-0.5 font-semibold text-brand-700">{money(value)}</p></div>; }
function CalcFieldRow({ label, value }: { label: string; value: number }) { return <label><span className="label">{label}</span><div className="field mt-1.5 flex items-center justify-between bg-canvas"><span className="font-semibold">{money(value)}</span><span className="text-xs text-muted">fixed</span></div></label>; }
function TotalRow({ label, value, amber, strong, sub }: { label: string; value: number; amber?: boolean; strong?: boolean; sub?: boolean }) { return <div className="flex items-center justify-between"><span className={strong ? "font-semibold" : sub ? "text-xs text-muted" : "text-sm text-muted"}>{label}</span><span className={cn(strong ? "text-xl font-semibold text-brand-700" : amber ? "font-semibold text-amber-700" : sub ? "text-xs text-muted" : "font-semibold text-charcoal", "tabular-nums")}>{money(value)}</span></div>; }
function Rule({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2"><span>{label}</span><span className="font-semibold text-charcoal">{value}</span></div>; }
