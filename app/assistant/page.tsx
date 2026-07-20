"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { Bot, CornerDownLeft, User } from "lucide-react";
import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
const prompts = ["What is today's profit?", "Which expense was highest?", "Show today's diesel expense.", "How much was spent on washing?"];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "I am ready with today's fleet numbers. Ask about collection, expenses, profit, or any bus." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = async (e?: FormEvent, question = input) => {
    e?.preventDefault();
    if (!question.trim() || busy) return;
    setMessages(m => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const r = await api.chat(question);
      setMessages(m => [...m, { role: "assistant", content: r.answer }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "I could not reach your data service. Please ensure the FastAPI server is running." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col space-y-7">
        <PageHeader eyebrow="Fleet answers" title="Ask FleetMind" description="Clear answers from reviewed collection sheets." />
        <div className="card flex min-h-[460px] flex-col overflow-hidden">
          <div className="flex-1 space-y-5 p-5 sm:p-7">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${m.role === "assistant" ? "order-0 bg-brand-700 text-white" : "order-2 border border-line bg-canvas text-muted"}`}>{m.role === "assistant" ? <Bot size={16} /> : <User size={16} />}</span>
                <div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 ${m.role === "assistant" ? "bg-canvas text-charcoal" : "bg-brand-700 text-white"}`}>{m.content}</div>
              </div>
            ))}
            {busy && <div className="flex gap-3"><span className="grid size-8 place-items-center rounded-lg bg-brand-700 text-white"><Bot size={16} /></span><div className="rounded-lg bg-canvas px-4 py-3 text-sm text-muted">Calculating from your collection sheets...</div></div>}
          </div>
          <form onSubmit={ask} className="border-t border-line p-4">
            <div className="flex gap-2">
              <input autoFocus value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about today's fleet performance..." className="field flex-1" />
              <button className="btn-primary px-3" aria-label="Send"><CornerDownLeft size={19} /></button>
            </div>
          </form>
        </div>
        <div className="flex flex-wrap justify-center gap-2">{prompts.map(p => <button key={p} onClick={() => ask(undefined, p)} className="rounded-full border border-line bg-surface px-3 py-2 text-xs text-muted transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700">{p}</button>)}</div>
      </div>
    </AppShell>
  );
}
