"use client";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import type { Bus, ExpenseKey, SheetInput } from "@/lib/types";
import { expenseLabel, money } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, FileImage, Loader2, Save, ScanLine, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
const keys:ExpenseKey[]=["diesel","oil","tyre","spare_parts","workshop","stand_fee","washing","others"];
const STAND_FEE=60;
function crewBatha(col:number){const d=Math.round(col*.10),c=Math.round(col*.09),ch=Math.round(col*.08);return{driver:d,conductor:c,checker:ch,total:d+c+ch};}
export default function ScannerPage(){
  const [buses,setBuses]=useState<Bus[]>([]),[selectedBusId,setSelectedBusId]=useState(""),[data,setData]=useState<SheetInput>(),[file,setFile]=useState<File>(),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
  useEffect(()=>{api.buses().then(b=>{setBuses(b);if(b.length>0)setSelectedBusId(b[0].id)}).catch(()=>setError("Start the FastAPI server before scanning."));},[]);
  const selectedBus=buses.find(b=>b.id===selectedBusId);
  const crew=useMemo(()=>{
    if(!data)return {driver:0,conductor:0,checker:0,total:0};
    const derived=crewBatha(Number(data.collection));
    const driver=Number(data.driver_collection)||derived.driver;
    const conductor=Number(data.conductor_collection)||derived.conductor;
    const checker=Number(data.checker_collection)||derived.checker;
    return {driver,conductor,checker,total:Number(data.batha)||driver+conductor+checker};
  },[data?.collection,data?.driver_collection,data?.conductor_collection,data?.checker_collection,data?.batha]);
  const expenseItems=useMemo(()=>data?Object.entries(data.expenses).reduce((a,[k,v])=>a+(k==="stand_fee"?STAND_FEE:Number(v||0)),0):0,[data?.expenses]);
  const totalExpense=crew.total+expenseItems;
  const balance=data?Number(data.collection)-totalExpense:0;
  const mismatch=data&&Math.abs(balance-(Number(data.balance)||0))>2;
  const applyRules=(base:SheetInput,busId:string):SheetInput=>{const c=crewBatha(Number(base.collection));const driver=Number(base.driver_collection)||c.driver;const conductor=Number(base.conductor_collection)||c.conductor;const checker=Number(base.checker_collection)||c.checker;const batha=Number(base.batha)||driver+conductor+checker;return{...base,bus_id:busId,driver_collection:driver,conductor_collection:conductor,checker_collection:checker,batha,total:Number(base.total)||batha,expenses:{...base.expenses,stand_fee:base.expenses.stand_fee??STAND_FEE}};};
  const beginManual=()=>{setData({bus_id:selectedBusId,service_date:new Date().toISOString().slice(0,10),driver_name:selectedBus?.driver_name||"",conductor_name:selectedBus?.conductor_name||"",batha:0,driver_collection:0,conductor_collection:0,checker_collection:0,total:0,collection:0,expense:0,balance:0,expenses:{diesel:0,oil:0,tyre:0,spare_parts:0,workshop:0,stand_fee:STAND_FEE,washing:0,others:0},confidence:0});setError("");};
  const scan=async()=>{if(!file||!selectedBusId)return;setBusy(true);setError("");try{const extracted=await api.extract(file);const bus=buses.find(b=>b.id===selectedBusId);const d=applyRules({...extracted,driver_name:bus?.driver_name||extracted.driver_name,conductor_name:bus?.conductor_name||extracted.conductor_name},selectedBusId);setData(d);}catch(e){setError(e instanceof Error?e.message:"Could not scan image")}finally{setBusy(false)}};
  const update=(key:keyof SheetInput,value:string)=>setData(d=>{if(!d)return d;const updated={...d,[key]:key==="bus_id"||key==="driver_name"||key==="conductor_name"?value:Number(value)};if(key==="collection"){const c=crewBatha(Number(value));updated.driver_collection=c.driver;updated.conductor_collection=c.conductor;updated.checker_collection=c.checker;updated.batha=c.total;updated.total=c.total;}return updated;});
  const updateExpense=(k:ExpenseKey,v:string)=>{if(k==="stand_fee")return;setData(d=>d?{...d,expenses:{...d.expenses,[k]:Number(v)}}:d);};
  const save=async()=>{if(!data)return;setBusy(true);try{await api.saveSheet({...data,bus_id:selectedBusId||data.bus_id,driver_collection:crew.driver,conductor_collection:crew.conductor,checker_collection:crew.checker,batha:crew.total,total:crew.total,expenses:{...data.expenses,stand_fee:STAND_FEE},expense:totalExpense,balance});setSaved(true);}catch(e){setError(e instanceof Error?e.message:"Could not save")}finally{setBusy(false)}};
  return <AppShell><div className="mx-auto max-w-5xl space-y-7">
    <section><p className="label text-blue-300">AI collection scanner</p><h1 className="mt-2 text-3xl font-bold tracking-tight">From paper to performance.</h1><p className="mt-2 text-sm text-slate-400">Select the bus, upload its handwritten sheet, and FleetMind extracts every number into a reviewed record.</p></section>
    {saved?<div className="card p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-400" size={44}/><h2 className="mt-4 text-xl font-bold">Collection sheet saved</h2><p className="mt-2 text-sm text-slate-400">Your dashboard has the latest fleet performance.</p><a className="btn-primary mt-6" href="/">View dashboard</a></div>
    :!data?<div className="space-y-4">
      <div className="card p-6"><p className="label mb-3 text-blue-300">Step 1 · Select bus</p><p className="mb-4 text-sm text-slate-400">Which bus does this collection sheet belong to?</p><select className="field w-full text-base" value={selectedBusId} onChange={e=>setSelectedBusId(e.target.value)}>{buses.map(b=><option className="bg-slate-900" key={b.id} value={b.id}>{b.bus_number} · {b.vehicle_number} — {b.route_name}</option>)}</select>{selectedBus&&<div className="mt-4 flex items-center gap-4 rounded-xl border border-white/[.07] bg-white/[.03] p-3 text-sm"><span className="text-slate-400">Driver:</span><span className="font-medium">{selectedBus.driver_name}</span><span className="ml-4 text-slate-400">Conductor:</span><span className="font-medium">{selectedBus.conductor_name}</span></div>}</div>
      <div className={`card p-6 sm:p-10 transition ${!selectedBusId?"opacity-50 pointer-events-none":""}`}><p className="label mb-4 text-blue-300">Step 2 · Upload collection sheet</p><label className="block cursor-pointer rounded-2xl border border-dashed border-blue-400/35 bg-blue-400/[.04] px-6 py-12 text-center transition hover:bg-blue-400/[.08]"><input className="sr-only" type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]);setError("")}}/><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">{file?<FileImage size={26}/>:<Upload size={26}/>}</span><p className="mt-5 font-semibold">{file?file.name:"Drop your collection sheet here"}</p><p className="mt-2 text-sm text-slate-500">PNG, JPG, or HEIC · max 10MB</p></label><button disabled={!file||!selectedBusId||busy} onClick={scan} className="btn-primary mt-5 w-full">{busy?<><Loader2 className="animate-spin" size={17}/> Reading sheet with AI…</>:<><ScanLine size={17}/> Extract collection details</>}</button>{error&&<><p className="mt-4 text-sm text-rose-300">{error}</p><button type="button" onClick={beginManual} className="btn-ghost mt-3 w-full">Enter sheet manually</button></>}<p className="mt-5 text-center text-xs text-slate-500">Vision extraction needs an OpenAI API key. Without it, the uploaded sheet opens as a blank draft for manual entry.</p></div>
    </div>
    :<div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="font-semibold">Review extraction</p><p className="mt-1 text-sm text-slate-500">Confidence {Math.round(data.confidence*100)}% · edit anything before saving</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">AI read complete</span></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Bus" value={data.bus_id} onChange={v=>update("bus_id",v)} select options={buses.map(b=>({value:b.id,label:`${b.bus_number} · ${b.vehicle_number}`}))}/>
          <Field label="Driver" value={data.driver_name} onChange={v=>update("driver_name",v)}/>
          <Field label="Conductor" value={data.conductor_name} onChange={v=>update("conductor_name",v)}/>
          <Field label="Total collection (₹)" value={data.collection} onChange={v=>update("collection",v)}/>
        </div>
        <div className="mt-5 rounded-xl border border-blue-400/15 bg-blue-500/[.04] p-4">
          <p className="label mb-3 text-blue-300">Batha breakdown <span className="font-normal text-slate-500">(auto-calculated from collection)</span></p>
          <div className="grid gap-2 sm:grid-cols-3">
            <CalcRow label="Driver (10%)" value={crew.driver}/>
            <CalcRow label="Conductor (9%)" value={crew.conductor}/>
            <CalcRow label="Cleaner (8%)" value={crew.checker}/>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[.08] pt-3"><span className="text-sm font-semibold">Total batha (27%)</span><span className="font-bold text-blue-200">{money(crew.total)}</span></div>
        </div>
        <p className="label mt-7">Expense breakdown</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{keys.map(k=>k==="stand_fee"?<CalcFieldRow key={k} label="Stand fee (fixed)" value={STAND_FEE}/>:<Field key={k} label={expenseLabel(k)} value={data.expenses[k]||0} onChange={v=>updateExpense(k,v)}/>)}</div>
      </div>
      <aside className="space-y-5">
        <div className="card p-6">
          <p className="label">Validated totals</p>
          <div className="mt-5 space-y-3">
            <TotalRow label="Total collection" value={data.collection}/>
            <TotalRow label="Batha (27%)" value={crew.total} sub/>
            <TotalRow label="Other expenses" value={expenseItems-STAND_FEE} sub/>
            <TotalRow label="Stand fee" value={STAND_FEE} sub/>
            <div className="border-t border-white/10 pt-3"><TotalRow label="Total expense" value={totalExpense} amber/></div>
            <div className="border-t border-white/10 pt-3"><TotalRow label="Balance" value={balance} strong/></div>
          </div>
          {mismatch?<div className="mt-5 flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-200"><AlertTriangle className="shrink-0" size={18}/>Sheet total differs from calculated balance. Review figures.</div>:<div className="mt-5 flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="shrink-0" size={18}/>All figures are consistent.</div>}
          <button disabled={busy} onClick={save} className="btn-primary mt-5 w-full">{busy?<Loader2 className="animate-spin" size={17}/>:<Save size={17}/>} Save reviewed sheet</button>
          {error&&<p className="mt-3 text-sm text-rose-300">{error}</p>}
        </div>
        <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[.06] p-5"><p className="text-sm font-semibold text-blue-200">Batha rules</p><ul className="mt-2 space-y-1 text-sm leading-6 text-slate-400"><li>Driver · 10% of collection</li><li>Conductor · 9% of collection</li><li>Cleaner · 8% of collection</li><li>Stand fee · fixed ₹60</li></ul></div>
      </aside>
    </div>}
  </div></AppShell>;
}
function Field({label,value,onChange,select,options}:{label:string;value:string|number;onChange:(v:string)=>void;select?:boolean;options?:{value:string;label:string}[]}){return <label><span className="label">{label}</span>{select?<select className="field mt-1.5" value={value} onChange={e=>onChange(e.target.value)}>{options?.map(o=><option className="bg-slate-900" key={o.value} value={o.value}>{o.label}</option>)}</select>:<input className="field mt-1.5" type={typeof value==="number"?"number":"text"} min="0" value={value} onChange={e=>onChange(e.target.value)}/>}</label>}
function CalcRow({label,value}:{label:string;value:number}){return <div className="rounded-lg bg-white/[.03] px-3 py-2"><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 font-semibold text-blue-200">{money(value)}</p></div>}
function CalcFieldRow({label,value}:{label:string;value:number}){return <label><span className="label">{label}</span><div className="field mt-1.5 flex items-center justify-between bg-slate-800/50 cursor-not-allowed"><span className="font-semibold">{money(value)}</span><span className="text-xs text-slate-500">fixed</span></div></label>}
function TotalRow({label,value,amber,strong,sub}:{label:string;value:number;amber?:boolean;strong?:boolean;sub?:boolean}){return <div className="flex items-center justify-between"><span className={strong?"font-semibold":sub?"text-xs text-slate-500":"text-sm text-slate-400"}>{label}</span><span className={`${strong?"text-xl font-bold text-emerald-300":amber?"text-amber-300 font-semibold":sub?"text-xs text-slate-400":"font-semibold"}`}>{money(value)}</span></div>}
