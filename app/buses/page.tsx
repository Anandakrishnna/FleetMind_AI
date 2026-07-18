"use client";

import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import type { Bus, BusReport } from "@/lib/types";
import { money, shortDate } from "@/lib/utils";
import { BusFront, ChartNoAxesCombined, FileText, Fuel, Pencil, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const blank = (): Bus => ({ id: crypto.randomUUID(), bus_number: "", vehicle_number: "", route_name: "", driver_name: "", conductor_name: "", status: "active" });

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [report, setReport] = useState<BusReport | null>(null);
  const [draft, setDraft] = useState<Bus | null>(null);
  const [error, setError] = useState("");

  const load = () => api.buses().then(items => {
    setBuses(items);
    setSelectedId(current => current || items[0]?.id || "");
  }).catch(() => setError("Start the FastAPI server to manage buses."));

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!selectedId) return;
    setReport(null);
    setError("");
    api.busReport(selectedId).then(setReport).catch(e => setError(e instanceof Error ? e.message : "Could not load bus report"));
  }, [selectedId]);

  const save = async () => {
    if (!draft) return;
    try {
      const exists = buses.some(b => b.id === draft.id);
      await (exists ? api.updateBus(draft) : api.addBus(draft));
      setDraft(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save bus");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this bus?")) return;
    try {
      await api.deleteBus(id);
      if (selectedId === id) setSelectedId("");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete bus");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label text-blue-300">Fleet reports</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Every bus, separately.</h1>
            <p className="mt-2 text-sm text-slate-400">Open any bus to see its own revenue, expenses, profit trend, and recent collection sheets.</p>
          </div>
          <button onClick={() => setDraft(blank())} className="btn-primary"><Plus size={17} /> Add bus</button>
        </section>

        {error && <p className="mt-5 text-sm text-rose-300">{error}</p>}

        <div className="mt-7 grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-3">
            {buses.map(bus => (
              <div key={bus.id} role="button" tabIndex={0} onClick={() => setSelectedId(bus.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedId(bus.id); }} className={`card w-full cursor-pointer p-4 text-left transition hover:border-blue-400/35 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${selectedId === bus.id ? "border-blue-400/45 bg-blue-500/[.08]" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-400/10 text-blue-300"><BusFront size={19} /></span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button className="btn-ghost p-2" onClick={() => setDraft(bus)} aria-label={`Edit ${bus.bus_number}`}><Pencil size={15} /></button>
                    <button className="btn-ghost p-2 text-rose-300" onClick={() => remove(bus.id)} aria-label={`Delete ${bus.bus_number}`}><Trash2 size={15} /></button>
                  </div>
                </div>
                <p className="mt-4 text-lg font-bold">{bus.bus_number}</p>
                <p className="mt-1 text-sm text-slate-400">{bus.vehicle_number} | {bus.route_name}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-3 text-xs">
                  <span className="text-slate-500">{bus.driver_name} | {bus.conductor_name}</span>
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 font-semibold text-emerald-300">{bus.status}</span>
                </div>
              </div>
            ))}
          </aside>

          <main className="min-w-0">
            {report ? <BusReportPanel report={report} /> : <div className="card p-8 text-slate-400">Select a bus to view its report.</div>}
          </main>
        </div>

        {draft && <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{buses.some(b => b.id === draft.id) ? "Edit bus" : "Add a bus"}</h2>
              <button onClick={() => setDraft(null)} className="text-slate-500"><X /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(["bus_number", "vehicle_number", "route_name", "driver_name", "conductor_name"] as (keyof Bus)[]).map(k => (
                <label key={k} className={k === "route_name" ? "sm:col-span-2" : ""}>
                  <span className="label">{k.replace("_", " ")}</span>
                  <input className="field mt-1.5" value={String(draft[k])} onChange={e => setDraft({ ...draft, [k]: e.target.value })} />
                </label>
              ))}
              <label>
                <span className="label">Status</span>
                <select className="field mt-1.5" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Bus["status"] })}>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <button disabled={!draft.bus_number || !draft.vehicle_number} onClick={save} className="btn-primary mt-6 w-full">Save bus</button>
          </div>
        </div>}
      </div>
    </AppShell>
  );
}

function BusReportPanel({ report }: { report: BusReport }) {
  const metrics = [
    { label: "Revenue", value: money(report.metrics.revenue), icon: ChartNoAxesCombined },
    { label: "Expenses", value: money(report.metrics.expense), icon: Fuel },
    { label: "Profit", value: money(report.metrics.profit), icon: TrendingUp },
    { label: "Sheets", value: String(report.metrics.sheet_count), icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="label text-blue-300">{report.bus.vehicle_number}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">{report.bus.bus_number} report</h2>
            <p className="mt-1 text-sm text-slate-400">{report.bus.route_name} | {report.bus.driver_name} and {report.bus.conductor_name}</p>
          </div>
          <div className="rounded-lg border border-white/[.08] bg-white/[.035] px-4 py-3 text-right">
            <p className="label">Top expense</p>
            <p className="mt-1 font-semibold text-amber-300">{report.top_expense.label} | {money(report.top_expense.value)}</p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <span className="label">{label}</span>
              <span className="rounded-lg bg-blue-400/10 p-2 text-blue-300"><Icon size={16} /></span>
            </div>
            <p className="mt-5 text-2xl font-bold tracking-tight">{value}</p>
            <p className="mt-2 text-xs text-slate-500">{report.metrics.margin}% operating margin</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.9fr]">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">Bus performance trend</p>
              <p className="mt-1 text-sm text-slate-500">Revenue, expense, and profit for this bus only</p>
            </div>
            <span className="rounded-lg bg-white/[.05] px-3 py-1.5 text-xs text-slate-400">7 days</span>
          </div>
          <div className="mt-7 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.chart}>
                <defs>
                  <linearGradient id="busRevenue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#58a6ff" stopOpacity=".35" /><stop offset="100%" stopColor="#58a6ff" stopOpacity="0" /></linearGradient>
                  <linearGradient id="busProfit" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity=".24" /><stop offset="100%" stopColor="#34d399" stopOpacity="0" /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#ffffff12" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0d192a", border: "1px solid #ffffff16", borderRadius: 12 }} formatter={(v: number) => money(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#58a6ff" strokeWidth={3} fill="url(#busRevenue)" />
                <Area type="monotone" dataKey="profit" stroke="#34d399" strokeWidth={2} fill="url(#busProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-white/[.07] p-5">
            <p className="font-semibold">Recent sheets</p>
            <p className="mt-1 text-sm text-slate-500">Only records assigned to {report.bus.bus_number}</p>
          </div>
          {report.recent.map(sheet => (
            <div key={sheet.id} className="border-b border-white/[.06] p-5 last:border-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{shortDate(sheet.service_date)}</p>
                  <p className="mt-1 text-xs text-slate-500">{sheet.driver_name} | {sheet.conductor_name}</p>
                </div>
                <p className="font-semibold text-emerald-300">{money(sheet.balance)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400">
                <span>Collection {money(sheet.collection)}</span>
                <span>Expense {money(sheet.expense)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
