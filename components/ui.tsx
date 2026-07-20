"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="label text-brand-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-lg border border-line bg-canvas text-brand-700">{icon}</span>
      <h2 className="mt-4 text-lg font-semibold text-charcoal">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Notice({
  tone = "success",
  children,
}: {
  tone?: "success" | "warning" | "error" | "loading";
  children: React.ReactNode;
}) {
  const Icon = tone === "loading" ? Loader2 : tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className={cn("notice", `notice-${tone}`)} role={tone === "error" ? "alert" : "status"}>
      <Icon className={tone === "loading" ? "animate-spin" : ""} size={18} />
      <span>{children}</span>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "error" | "neutral" | "brand";
}) {
  return <span className={cn("status-badge", `status-${tone}`)}>{children}</span>;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
