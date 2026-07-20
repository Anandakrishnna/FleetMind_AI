"use client";

import { AppShell } from "@/components/app-shell";
import { EmptyState, Notice, PageHeader, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { Bus, CollectionSheet } from "@/lib/types";
import { cn, money, shortDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, BusFront, Download, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SortKey = "service_date" | "bus_number" | "collection" | "expense" | "balance";

export default function ReportsPage() {
  const [sheets, setSheets] = useState<CollectionSheet[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState("all");
  const [busId, setBusId] = useState("all");
  const [range, setRange] = useState("7");
  const [compare, setCompare] = useState("previous");
  const [sort, setSort] = useState<SortKey>("service_date");
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([api.sheets(), api.buses()])
      .then(([sheetRows, busRows]) => { setSheets(sheetRows); setBuses(busRows); })
      .catch(() => setError("Start the FastAPI server to load reports."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const routeByBus = useMemo(() => new Map(buses.map((bus) => [bus.bus_number, bus.route_name])), [buses]);
  const busByNumber = useMemo(() => new Map(buses.map((bus) => [bus.bus_number, bus])), [buses]);
  const selectedBus = useMemo(() => buses.find((bus) => bus.id === busId), [buses, busId]);
  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    return sheets
      .filter((sheet) => {
        const routeName = routeByBus.get(sheet.bus_number) || sheet.bus_number;
        const sheetBus = busByNumber.get(sheet.bus_number);
        const serviceDate = new Date(sheet.service_date.includes("T") ? sheet.service_date : `${sheet.service_date}T00:00:00`);
        const inRange = serviceDate >= cutoff;
        const routeMatch = route === "all" || routeName === route;
        const busMatch = busId === "all" || sheetBus?.id === busId;
        const searchMatch = !lower || [sheet.bus_number, sheet.vehicle_number, sheet.driver_name, sheet.conductor_name, routeName].join(" ").toLowerCase().includes(lower);
        return inRange && routeMatch && busMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sort === "service_date") return new Date(b.service_date).getTime() - new Date(a.service_date).getTime();
        if (sort === "bus_number") return a.bus_number.localeCompare(b.bus_number);
        return Number(b[sort]) - Number(a[sort]);
      });
  }, [sheets, query, route, busId, range, sort, routeByBus, busByNumber]);

  const routeOptions = useMemo(() => Array.from(new Set(buses.map((bus) => bus.route_name))).filter(Boolean), [buses]);
  const routeRows = useMemo(() => {
    const map = new Map<string, { route: string; collection: number; expense: number; balance: number; sheets: number }>();
    filtered.forEach((sheet) => {
      const routeName = routeByBus.get(sheet.bus_number) || sheet.bus_number;
      const row = map.get(routeName) || { route: routeName, collection: 0, expense: 0, balance: 0, sheets: 0 };
      row.collection += Number(sheet.collection || 0);
      row.expense += Number(sheet.expense || 0);
      row.balance += Number(sheet.balance || 0);
      row.sheets += 1;
      map.set(routeName, row);
    });
    return Array.from(map.values()).sort((a, b) => b.collection - a.collection);
  }, [filtered, routeByBus]);
  const busRows = useMemo(() => {
    const map = new Map<string, { bus: string; vehicle: string; route: string; collection: number; expense: number; balance: number; sheets: number }>();
    filtered.forEach((sheet) => {
      const routeName = routeByBus.get(sheet.bus_number) || "Unassigned";
      const row = map.get(sheet.bus_number) || { bus: sheet.bus_number, vehicle: sheet.vehicle_number, route: routeName, collection: 0, expense: 0, balance: 0, sheets: 0 };
      row.collection += Number(sheet.collection || 0);
      row.expense += Number(sheet.expense || 0);
      row.balance += Number(sheet.balance || 0);
      row.sheets += 1;
      map.set(sheet.bus_number, row);
    });
    return Array.from(map.values()).sort((a, b) => b.collection - a.collection);
  }, [filtered, routeByBus]);
  const chartRows = busId === "all" ? busRows : filtered.map((sheet) => ({
    bus: shortDate(sheet.service_date),
    vehicle: sheet.vehicle_number,
    route: routeByBus.get(sheet.bus_number) || "Unassigned",
    collection: Number(sheet.collection || 0),
    expense: Number(sheet.expense || 0),
    balance: Number(sheet.balance || 0),
    sheets: 1,
  })).reverse();

  const totals = filtered.reduce((acc, sheet) => ({
    collection: acc.collection + Number(sheet.collection || 0),
    expense: acc.expense + Number(sheet.expense || 0),
    balance: acc.balance + Number(sheet.balance || 0),
  }), { collection: 0, expense: 0, balance: 0 });

  const exportCsv = () => {
    const header = ["Date", "Bus", "Vehicle", "Route", "Driver", "Conductor", "Collection", "Expense", "Balance"];
    const rows = filtered.map((sheet) => [sheet.service_date, sheet.bus_number, sheet.vehicle_number, routeByBus.get(sheet.bus_number) || "", sheet.driver_name, sheet.conductor_name, sheet.collection, sheet.expense, sheet.balance]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fleetmind-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Report exported.");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader eyebrow="Reports" title="Route and collection reports" description="Filter the reviewed sheets, compare performance, and export clean rows for accounting." action={<button className="btn-primary" onClick={exportCsv} disabled={!filtered.length}><Download size={17} /> Export CSV</button>} />
        {toast ? <div className="fixed right-4 top-20 z-50"><Notice>{toast}</Notice></div> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}

        <section className="card-static grid gap-3 p-4 md:grid-cols-[1fr_170px_170px_170px_170px]">
          <label className="relative">
            <span className="label">Search</span>
            <Search className="pointer-events-none absolute bottom-3 left-3 text-muted" size={16} />
            <input className="field mt-1.5 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Bus, route, crew" aria-label="Search reports" />
          </label>
          <label><span className="label">Date range</span><select className="field mt-1.5" value={range} onChange={(e) => setRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
          <label><span className="label">Bus</span><select className="field mt-1.5" value={busId} onChange={(e) => setBusId(e.target.value)}><option value="all">All buses</option>{buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.bus_number}</option>)}</select></label>
          <label><span className="label">Route</span><select className="field mt-1.5" value={route} onChange={(e) => setRoute(e.target.value)}><option value="all">All routes</option>{routeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span className="label">Compare</span><select className="field mt-1.5" value={compare} onChange={(e) => setCompare(e.target.value)}><option value="previous">Previous period</option><option value="fleet">Fleet average</option></select></label>
        </section>

        {loading ? <ReportsSkeleton /> : filtered.length ? (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <InsightCard title={selectedBus ? `${selectedBus.bus_number} report` : busRows[0] ? `${busRows[0].bus} leading` : "Buses ready"} body={selectedBus ? `${selectedBus.vehicle_number} on ${selectedBus.route_name} collected ${money(totals.collection)} in this view.` : `${busRows[0]?.bus || "Selected buses"} collected ${money(busRows[0]?.collection || 0)} in this view.`} tone="success" />
              <InsightCard title={selectedBus ? "Bus balance" : lowestBus(busRows).bus ? `${lowestBus(busRows).bus} needs review` : "No low bus"} body={selectedBus ? `Net balance is ${money(totals.balance)} after expenses.` : lowestBus(busRows).bus ? `Balance is ${money(lowestBus(busRows).balance)} after expenses.` : "No underperforming bus in the current filters."} tone="warning" />
              <InsightCard title={compare === "fleet" ? "Compared with fleet" : "Compared with previous period"} body={`Net balance is ${money(totals.balance)} across ${filtered.length} reviewed sheets.`} tone="neutral" />
            </section>

            <BusSummary selectedBus={selectedBus} rows={busRows} />

            <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div><h2 className="font-semibold text-charcoal">{selectedBus ? `${selectedBus.bus_number} sheet history` : "Collection by bus"}</h2><p className="mt-1 text-sm text-muted">{selectedBus ? "Each bar is one reviewed collection sheet for this bus" : "Revenue and expense split separately for each bus"}</p></div>
                  <StatusBadge tone="brand">{money(totals.collection)}</StatusBadge>
                </div>
                <div className="mt-7 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows}>
                      <CartesianGrid vertical={false} stroke="#e6dfd1" />
                      <XAxis dataKey="bus" axisLine={false} tickLine={false} tick={{ fill: "#66706a", fontSize: 12 }} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ background: "#fffdf8", border: "1px solid #e6dfd1", borderRadius: 8 }} formatter={(v: number) => money(v)} />
                      <Bar dataKey="collection" fill="#0f5f3a" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expense" fill="#b7791f" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <TotalsCard totals={totals} sheets={filtered.length} />
            </section>

            <ReportTable rows={filtered} sort={sort} setSort={setSort} routeByBus={routeByBus} title={selectedBus ? `${selectedBus.bus_number} reviewed sheets` : "Reviewed sheets"} />
          </>
        ) : <EmptyState icon={<FileText size={20} />} title="No report rows" body="Try a wider date range or upload reviewed sheets first." />}
      </div>
    </AppShell>
  );
}

function BusSummary({ selectedBus, rows }: { selectedBus?: Bus; rows: { bus: string; vehicle: string; route: string; collection: number; expense: number; balance: number; sheets: number }[] }) {
  if (selectedBus) {
    const row = rows.find((item) => item.bus === selectedBus.bus_number);
    return (
      <section className="card-static grid gap-4 p-5 md:grid-cols-[1fr_repeat(3,160px)]">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-700"><BusFront size={21} /></span>
          <div><p className="label text-brand-700">Selected bus</p><h2 className="mt-1 font-semibold text-charcoal">{selectedBus.bus_number} / {selectedBus.vehicle_number}</h2><p className="mt-1 text-sm text-muted">{selectedBus.route_name} / {selectedBus.driver_name} and {selectedBus.conductor_name}</p></div>
        </div>
        <MiniMetric label="Collection" value={money(row?.collection || 0)} />
        <MiniMetric label="Balance" value={money(row?.balance || 0)} brand />
        <MiniMetric label="Sheets" value={String(row?.sheets || 0)} />
      </section>
    );
  }
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {rows.slice(0, 3).map((row) => (
        <div key={row.bus} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-semibold text-charcoal">{row.bus}</p><p className="mt-1 text-xs text-muted">{row.vehicle} / {row.route}</p></div>
            <StatusBadge tone={row.balance >= 0 ? "success" : "warning"}>{row.sheets} sheets</StatusBadge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><MiniMetric label="Collection" value={money(row.collection)} /><MiniMetric label="Balance" value={money(row.balance)} brand /></div>
        </div>
      ))}
    </section>
  );
}

function MiniMetric({ label, value, brand }: { label: string; value: string; brand?: boolean }) {
  return <div><p className="label">{label}</p><p className={cn("mt-1 font-semibold tabular-nums", brand ? "text-brand-700" : "text-charcoal")}>{value}</p></div>;
}

function InsightCard({ title, body, tone }: { title: string; body: string; tone: "success" | "warning" | "neutral" }) {
  const Icon = tone === "success" ? ArrowUpRight : tone === "warning" ? ArrowDownRight : FileText;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge tone={tone}>{tone === "neutral" ? "Insight" : tone}</StatusBadge>
        <Icon className={tone === "warning" ? "text-amber-700" : "text-brand-700"} size={18} />
      </div>
      <p className="mt-4 font-semibold text-charcoal">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function TotalsCard({ totals, sheets }: { totals: { collection: number; expense: number; balance: number }; sheets: number }) {
  return (
    <div className="card p-5">
      <h2 className="font-semibold text-charcoal">Report totals</h2>
      <div className="mt-5 space-y-4">
        <Total label="Collection" value={totals.collection} />
        <Total label="Expenses" value={totals.expense} amber />
        <Total label="Balance" value={totals.balance} strong />
        <Total label="Reviewed sheets" value={sheets} count />
      </div>
    </div>
  );
}

function ReportTable({ rows, sort, setSort, routeByBus, title }: { rows: CollectionSheet[]; sort: SortKey; setSort: (key: SortKey) => void; routeByBus: Map<string, string>; title: string }) {
  const headers: { key: SortKey; label: string }[] = [
    { key: "service_date", label: "Date" },
    { key: "bus_number", label: "Bus" },
    { key: "collection", label: "Collection" },
    { key: "expense", label: "Expense" },
    { key: "balance", label: "Balance" },
  ];
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line p-5"><h2 className="font-semibold text-charcoal">{title}</h2><p className="mt-1 text-sm text-muted">Sortable rows for the selected filters</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="table-head">
            <tr>{headers.map((h) => <th key={h.key} className="px-5 py-3 font-medium"><button className={cn("font-medium", sort === h.key && "text-brand-700")} onClick={() => setSort(h.key)}>{h.label}</button></th>)}<th className="px-5 py-3 font-medium">Route</th><th className="px-5 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((sheet) => <tr key={sheet.id} className="table-row"><td className="px-5 py-4">{shortDate(sheet.service_date)}</td><td className="px-5 py-4"><p className="font-medium text-charcoal">{sheet.bus_number}</p><p className="text-xs text-muted">{sheet.vehicle_number}</p></td><td className="px-5 py-4 font-semibold tabular-nums">{money(sheet.collection)}</td><td className="px-5 py-4 font-semibold text-amber-700 tabular-nums">{money(sheet.expense)}</td><td className="px-5 py-4 font-semibold text-brand-700 tabular-nums">{money(sheet.balance)}</td><td className="px-5 py-4 text-muted">{routeByBus.get(sheet.bus_number) || "Unassigned"}</td><td className="px-5 py-4"><StatusBadge tone={Number(sheet.confidence || 0) >= .8 ? "success" : "warning"}>{Number(sheet.confidence || 0) >= .8 ? "Reviewed" : "Check"}</StatusBadge></td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Total({ label, value, amber, strong, count }: { label: string; value: number; amber?: boolean; strong?: boolean; count?: boolean }) {
  return <div className="flex items-center justify-between border-b border-line pb-3 last:border-0"><span className="text-sm text-muted">{label}</span><span className={cn("font-semibold tabular-nums", amber ? "text-amber-700" : strong ? "text-xl text-brand-700" : "text-charcoal")}>{count ? value : money(value)}</span></div>;
}

function lowestRoute(rows: { route: string; balance: number }[]) {
  return rows.length ? rows.reduce((low, row) => row.balance < low.balance ? row : low, rows[0]) : { route: "", balance: 0 };
}

function lowestBus(rows: { bus: string; balance: number }[]) {
  return rows.length ? rows.reduce((low, row) => row.balance < low.balance ? row : low, rows[0]) : { bus: "", balance: 0 };
}

function ReportsSkeleton() {
  return <div className="space-y-5"><div className="grid gap-3 md:grid-cols-3">{[1, 2, 3].map((x) => <SkeletonBlock key={x} className="h-36" />)}</div><div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><SkeletonBlock className="h-80" /><SkeletonBlock className="h-80" /></div><SkeletonBlock className="h-96" /></div>;
}
