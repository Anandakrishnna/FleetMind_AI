"use client";

import { AppShell } from "@/components/app-shell";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { AlertTriangle, Bell, Building2, CheckCircle2, CreditCard, Shield, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "fleet", label: "Fleet/Buses", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "team", label: "Team & Roles", icon: Shield },
] as const;

type TabId = typeof tabs[number]["id"];

export default function SettingsPage() {
  const [active, setActive] = useState<TabId>("profile");
  const [toast, setToast] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    for (const key of ["name", "email"]) {
      const value = String(form.get(key) || "");
      if (!value.trim()) nextErrors[key] = "Required";
    }
    const email = String(form.get("email") || "");
    if (email && !email.includes("@")) nextErrors.email = "Use a valid email";
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setToast("Settings saved.");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-7">
        <PageHeader eyebrow="Settings" title="Workspace settings" description="Manage profile details, fleet defaults, notifications, billing, and team roles." />
        {toast ? <div className="fixed right-4 top-20 z-50"><Notice>{toast}</Notice></div> : null}

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="card-static p-3">
            <nav className="space-y-1" aria-label="Settings sections">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted transition hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/25", active === id && "bg-brand-50 text-brand-700")} onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined}>
                  <Icon size={17} /> {label}
                </button>
              ))}
            </nav>
          </aside>

          <form onSubmit={save} className="space-y-5">
            {active === "profile" && <ProfileSection errors={errors} />}
            {active === "fleet" && <FleetSection />}
            {active === "notifications" && <NotificationsSection />}
            {active === "billing" && <BillingSection />}
            {active === "team" && <TeamSection />}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary"><CheckCircle2 size={17} /> Save changes</button>
            </div>

            <DangerZone onOpen={() => setConfirmOpen(true)} />
          </form>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/45 p-4" role="dialog" aria-modal="true" aria-labelledby="danger-title">
          <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-lift">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="danger-title" className="text-lg font-semibold text-charcoal">Delete workspace data?</h2>
                <p className="mt-2 text-sm leading-6 text-muted">This confirmation is part of the UI flow. It does not call a delete API.</p>
              </div>
              <button className="icon-btn size-9" onClick={() => setConfirmOpen(false)} aria-label="Close confirmation"><X size={17} /></button>
            </div>
            <Notice tone="warning"><span>Only continue when you are certain this is the intended workspace.</span></Notice>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button className="btn-ghost" onClick={() => setConfirmOpen(false)}>Keep data</button>
              <button className="btn-danger" onClick={() => { setConfirmOpen(false); setToast("Danger action confirmed."); }}><Trash2 size={17} /> Confirm</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function ProfileSection({ errors }: { errors: Record<string, string> }) {
  return (
    <Section title="Profile" description="Operator identity and contact details for account notifications.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Full name" defaultValue="Arun Kumar" error={errors.name} />
        <Field name="email" label="Email" defaultValue="arun@malabartransit.in" error={errors.email} />
        <Field name="phone" label="Phone" defaultValue="+91 98765 43210" />
        <label><span className="label">Language</span><select className="field mt-1.5" defaultValue="en"><option value="en">English</option><option value="ml">Malayalam</option></select></label>
      </div>
    </Section>
  );
}

function FleetSection() {
  return (
    <Section title="Fleet/Buses" description="Defaults used when adding buses and reviewing collection sheets.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="fleetName" label="Fleet name" defaultValue="Malabar Transit" />
        <Field name="homeDepot" label="Home depot" defaultValue="Kozhikode" />
        <Field name="standFee" label="Default stand fee" defaultValue="60" type="number" />
        <Field name="settlementTime" label="Daily close time" defaultValue="21:30" type="time" />
      </div>
    </Section>
  );
}

function NotificationsSection() {
  return (
    <Section title="Notifications" description="Choose which alerts should reach the operator team.">
      <div className="space-y-3">
        <Toggle title="Pending sheet reminders" body="Alert when a scanned sheet waits for review." defaultChecked />
        <Toggle title="Low route collection" body="Notify when a route is below its normal collection range." defaultChecked />
        <Toggle title="Weekly reports" body="Send a summary after the weekly close." />
      </div>
    </Section>
  );
}

function BillingSection() {
  return (
    <Section title="Billing" description="Plan, invoice, and payment method details.">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-canvas p-4"><p className="label">Plan</p><p className="mt-2 font-semibold">FleetMind Pro</p><StatusBadge tone="success">Active</StatusBadge></div>
        <div className="rounded-lg border border-line bg-canvas p-4"><p className="label">Next invoice</p><p className="mt-2 font-semibold">Aug 1, 2026</p><p className="mt-1 text-sm text-muted">INR 4,999</p></div>
        <div className="rounded-lg border border-line bg-canvas p-4"><p className="label">Payment</p><p className="mt-2 font-semibold">Visa ending 4242</p><button type="button" className="mt-3 text-sm font-semibold text-brand-700">Update</button></div>
      </div>
    </Section>
  );
}

function TeamSection() {
  const members = [
    { name: "Arun Kumar", role: "Owner", status: "Active" },
    { name: "Meera Nair", role: "Manager", status: "Active" },
    { name: "Shaji P", role: "Reviewer", status: "Invited" },
  ];
  return (
    <Section title="Team & Roles" description="Keep access clear for operators, managers, and reviewers.">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="table-head"><tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Action</th></tr></thead>
          <tbody>{members.map((member) => <tr key={member.name} className="table-row"><td className="px-4 py-4 font-medium text-charcoal">{member.name}</td><td className="px-4 py-4"><select className="field w-36 py-2" defaultValue={member.role}><option>Owner</option><option>Manager</option><option>Reviewer</option></select></td><td className="px-4 py-4"><StatusBadge tone={member.status === "Active" ? "success" : "warning"}>{member.status}</StatusBadge></td><td className="px-4 py-4"><button type="button" className="text-sm font-semibold text-brand-700">Edit</button></td></tr>)}</tbody>
        </table>
      </div>
    </Section>
  );
}

function DangerZone({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="rounded-lg border border-red-100 bg-red-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-1 shrink-0 text-red-700" size={18} />
          <div><h2 className="font-semibold text-red-700">Danger zone</h2><p className="mt-1 text-sm leading-6 text-red-700/80">Separate destructive controls from everyday settings.</p></div>
        </div>
        <button type="button" className="btn-danger" onClick={onOpen}><Trash2 size={17} /> Delete data</button>
      </div>
    </section>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="card-static p-5"><div className="mb-5"><h2 className="font-semibold text-charcoal">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div>{children}</section>;
}

function Field({ name, label, defaultValue, type = "text", error }: { name: string; label: string; defaultValue: string; type?: string; error?: string }) {
  return <label><span className="label">{label}</span><input name={name} className={cn("field mt-1.5", error && "border-red-500 focus:border-red-500 focus:ring-red-500/20")} defaultValue={defaultValue} type={type} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />{error ? <p id={`${name}-error`} className="mt-1 text-xs font-medium text-red-700">{error}</p> : null}</label>;
}

function Toggle({ title, body, defaultChecked }: { title: string; body: string; defaultChecked?: boolean }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4"><span><span className="block font-medium text-charcoal">{title}</span><span className="mt-1 block text-sm text-muted">{body}</span></span><input className="size-5 accent-brand-600" type="checkbox" defaultChecked={defaultChecked} /></label>;
}
