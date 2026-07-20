"use client";

import { cn } from "@/lib/utils";
import { BarChart3, Bell, Building2, ChevronLeft, ChevronRight, LayoutDashboard, ScanLine, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scanner", label: "Upload", icon: ScanLine },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/buses", label: "Fleet", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="shell">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="FleetMind dashboard">
            <span className="grid size-10 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">FM</span>
            <span>
              <strong className="block text-sm tracking-tight text-charcoal">FleetMind AI</strong>
              <small className="text-xs text-muted">Malabar Transit</small>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <select className="field hidden w-40 py-2 sm:block" aria-label="Select fleet" defaultValue="malabar">
              <option value="malabar">Malabar Transit</option>
              <option value="kochi">Kochi Fleet</option>
            </select>
            <select className="field hidden w-36 py-2 md:block" aria-label="Select date range" defaultValue="today">
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>
            <button className="icon-btn" aria-label="Notifications"><Bell size={18} /></button>
            <button className="icon-btn" aria-label="Profile"><UserRound size={18} /></button>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className={cn("sticky top-[65px] hidden h-[calc(100vh-65px)] shrink-0 border-r border-line bg-[#fbf7ee]/80 py-4 transition-all md:block", collapsed ? "w-[76px]" : "w-64")}>
          <div className="flex justify-end px-3">
            <button className="icon-btn size-9" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          </div>
          <nav className="mt-4 space-y-1 px-3" aria-label="Primary navigation">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/25",
                  active(href) && "bg-brand-50 text-brand-700",
                  collapsed && "justify-center"
                )}
                title={collapsed ? label : undefined}
                aria-current={active(href) ? "page" : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>
          {!collapsed && (
            <div className="mx-4 mt-8 rounded-lg border border-line bg-surface p-4">
              <p className="text-sm font-semibold text-charcoal">Daily close</p>
              <p className="mt-1 text-xs leading-5 text-muted">Review pending sheets before saving them to reports.</p>
              <Link href="/scanner" className="mt-3 inline-flex text-xs font-semibold text-brand-700">Open upload</Link>
            </div>
          )}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8">{children}</main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-lg border border-line bg-surface p-1.5 shadow-lift md:hidden" aria-label="Mobile navigation">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn("grid place-items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium text-muted", active(href) && "bg-brand-50 text-brand-700")} aria-current={active(href) ? "page" : undefined}>
            <Icon size={17} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
