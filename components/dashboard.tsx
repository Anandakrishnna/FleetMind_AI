"use client";

import { EmptyState, Notice, PageHeader, SkeletonBlock, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { CollectionSheet, Dashboard as DashboardData } from "@/lib/types";
import { cn, money, shortDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, BusFront, CalendarDays, ClipboardCheck, ReceiptText, Route, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function Dashboard() {
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("");
  const [dayLabel, setDayLabel] = useState("Live operations");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setDayLabel(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }));
    api.dashboard().then(setData).catch(() => setError("Start the FastAPI server to load live fleet data."));
  }, []);

  const routeRows = useMemo(() => buildRouteRows(data?.recent || []), [data?.recent]);

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow="Dashboard" title="Fleet overview" description="Collection, route, and scan status in one place." />
        <Notice tone="error">{error}</Notice>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const weeklyCollection = data.chart.reduce((sum, point) => sum + Number(point.revenue || 0), 0);
  const pendingSheets = data.recent.filter((sheet) => Number(sheet.confidence || 0) < 0.8).length;
  const metrics = [
    { label: "Today collection", value: money(data.metrics.revenue), detail: "vs yesterday", delta: "12.4%", up: true, icon: ReceiptText },
    { label: "Week collection", value: money(weeklyCollection), detail: "7 day total", delta: "8.1%", up: true, icon: CalendarDays },
    { label: "Active buses", value: String(data.metrics.bus_count), detail: "currently on route", delta: "steady", up: true, icon: BusFront },
    { label: "Pending sheets", value: String(pendingSheets), detail: "need review", delta: pendingSheets ? "attention" : "clear", up: pendingSheets === 0, icon: ClipboardCheck },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader
        eyebrow={`${dayLabel} / Live operations`}
        title={`${greeting}, Arun`}
        description="A calm view of collection, route performance, and sheets waiting for review."
        action={<a href="/scanner" className="btn-primary"><UploadCloud size={17} /> Upload sheet</a>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Fleet summary">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
            <div className="flex items-start justify-between">
              <span className="label">{m.label}</span>
              <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><m.icon size={17} /></span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight text-charcoal tabular-nums">{m.value}</p>
            <p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", m.up ? "text-brand-700" : "text-amber-700")}>
              {m.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {m.delta}
              <span className="font-normal text-muted">{m.detail}</span>
            </p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-charcoal">Revenue trend</h2>
              <p className="mt-1 text-sm text-muted">Collection and expense over the last 7 days</p>
            </div>
            <StatusBadge tone="brand">Weekly</StatusBadge>
          </div>
          <div className="mt-7 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart}>
                <defs>
                  <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0f5f3a" stopOpacity=".22" /><stop offset="100%" stopColor="#0f5f3a" stopOpacity="0" /></linearGradient>
                  <linearGradient id="expense" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b7791f" stopOpacity=".18" /><stop offset="100%" stopColor="#b7791f" stopOpacity="0" /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e6dfd1" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#66706a", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#fffdf8", border: "1px solid #e6dfd1", borderRadius: 8, color: "#1f2522" }} formatter={(v: number) => money(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#0f5f3a" strokeWidth={3} fill="url(#revenue)" />
                <Area type="monotone" dataKey="expense" stroke="#b7791f" strokeWidth={2} fill="url(#expense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="font-semibold text-charcoal">Plain-language insights</h2>
            <p className="mt-1 text-sm text-muted">Signals worth checking before the day closes</p>
          </div>
          {data.insights.length ? data.insights.map((insight) => (
            <div key={insight.title} className="border-b border-line p-5 last:border-0">
              <StatusBadge tone={insight.kind === "success" ? "success" : insight.kind === "warning" ? "warning" : "neutral"}>{insight.kind}</StatusBadge>
              <p className="mt-3 font-medium text-charcoal">{insight.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{insight.body}</p>
            </div>
          )) : <EmptyState icon={<Route size={20} />} title="No insights yet" body="Upload reviewed collection sheets and this panel will summarize what changed." />}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_.95fr]">
        <RoutePerformance rows={routeRows} />
        <RecentScans sheets={data.recent} />
      </section>
    </div>
  );
}

function RoutePerformance({ rows }: { rows: ReturnType<typeof buildRouteRows> }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-5">
        <div>
          <h2 className="font-semibold text-charcoal">Route performance</h2>
          <p className="mt-1 text-sm text-muted">Top routes stay green; low balance routes are flagged amber.</p>
        </div>
        <StatusBadge tone="neutral">{rows.length} routes</StatusBadge>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="table-head">
              <tr><th className="px-5 py-3 font-medium">Route</th><th className="px-5 py-3 font-medium">Collection</th><th className="px-5 py-3 font-medium">Balance</th><th className="px-5 py-3 font-medium">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.route} className="table-row">
                  <td className="px-5 py-4"><p className="font-medium text-charcoal">{row.route}</p><p className="mt-0.5 text-xs text-muted">{row.sheets} sheets</p></td>
                  <td className="px-5 py-4 font-semibold tabular-nums">{money(row.collection)}</td>
                  <td className="px-5 py-4 font-semibold tabular-nums">{money(row.balance)}</td>
                  <td className="px-5 py-4"><StatusBadge tone={index === 0 ? "success" : row.flag ? "warning" : "neutral"}>{index === 0 ? "Top route" : row.flag ? "Review" : "Healthy"}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState icon={<Route size={20} />} title="No route data" body="Reviewed sheets will appear here grouped by route or bus." />}
    </div>
  );
}

function RecentScans({ sheets }: { sheets: CollectionSheet[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-5">
        <div>
          <h2 className="font-semibold text-charcoal">Recent scans</h2>
          <p className="mt-1 text-sm text-muted">Latest reviewed collection sheets</p>
        </div>
        <a href="/scanner" className="text-sm font-semibold text-brand-700">New scan</a>
      </div>
      {sheets.length ? sheets.slice(0, 5).map((sheet) => {
        const confidence = Number(sheet.confidence || 0);
        const done = confidence >= 0.8;
        return (
          <div key={sheet.id} className="border-b border-line p-5 last:border-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-charcoal">{sheet.bus_number}</p>
                <p className="mt-1 text-xs text-muted">{sheet.vehicle_number} / {shortDate(sheet.service_date)}</p>
              </div>
              <StatusBadge tone={done ? "success" : "warning"}>{done ? "Done" : "Review"}</StatusBadge>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <span><span className="block text-muted">Collection</span><strong className="mt-1 block text-charcoal tabular-nums">{money(sheet.collection)}</strong></span>
              <span><span className="block text-muted">Expense</span><strong className="mt-1 block text-amber-700 tabular-nums">{money(sheet.expense)}</strong></span>
              <span><span className="block text-muted">Balance</span><strong className="mt-1 block text-brand-700 tabular-nums">{money(sheet.balance)}</strong></span>
            </div>
          </div>
        );
      }) : <EmptyState icon={<ReceiptText size={20} />} title="No scans yet" body="Upload your first collection sheet to see status and totals here." />}
    </div>
  );
}

function buildRouteRows(sheets: CollectionSheet[]) {
  const map = new Map<string, { route: string; collection: number; balance: number; sheets: number }>();
  sheets.forEach((sheet) => {
    const route = sheet.bus_number || "Unassigned route";
    const current = map.get(route) || { route, collection: 0, balance: 0, sheets: 0 };
    current.collection += Number(sheet.collection || 0);
    current.balance += Number(sheet.balance || 0);
    current.sheets += 1;
    map.set(route, current);
  });
  const rows = Array.from(map.values()).sort((a, b) => b.balance - a.balance);
  const average = rows.length ? rows.reduce((sum, row) => sum + row.balance, 0) / rows.length : 0;
  return rows.map((row) => ({ ...row, flag: row.balance < average * 0.8 }));
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-48" />
        <SkeletonBlock className="h-10 w-80" />
        <SkeletonBlock className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((x) => <SkeletonBlock key={x} className="h-36" />)}</div>
      <div className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]"><SkeletonBlock className="h-96" /><SkeletonBlock className="h-96" /></div>
    </div>
  );
}
