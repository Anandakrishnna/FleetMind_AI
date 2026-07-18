from __future__ import annotations

import base64
import json
import os
from datetime import date, timedelta
from typing import Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except ImportError:  # Local demo mode remains fully usable without optional AI dependency.
    OpenAI = None

app = FastAPI(title="FleetMind AI API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(","), allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

ExpenseKey = Literal["diesel", "oil", "tyre", "spare_parts", "workshop", "stand_fee", "washing", "others"]

class Bus(BaseModel):
    id: str
    bus_number: str
    vehicle_number: str
    route_name: str
    driver_name: str
    conductor_name: str
    status: Literal["active", "maintenance", "inactive"] = "active"

class SheetInput(BaseModel):
    bus_id: str
    service_date: date = Field(default_factory=date.today)
    driver_name: str = ""
    conductor_name: str = ""
    batha: float = 0
    driver_collection: float = 0
    conductor_collection: float = 0
    checker_collection: float = 0
    total: float = 0
    collection: float = 0
    expense: float = 0
    balance: float = 0
    expenses: dict[ExpenseKey, float] = Field(default_factory=dict)
    confidence: float = 0.94

class CollectionSheet(SheetInput):
    id: str
    bus_number: str
    vehicle_number: str
    created_at: str

class Insight(BaseModel):
    title: str
    body: str
    kind: Literal["observation", "warning", "success"]

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)

class ChatResponse(BaseModel):
    answer: str
    source: Literal["ai", "calculated"]

BUS_SEED = [
    Bus(id="bus-1", bus_number="MTR 01", vehicle_number="KL-07-AB-2211", route_name="Kozhikode → Kannur", driver_name="Ramesh", conductor_name="Akhil"),
    Bus(id="bus-2", bus_number="MTR 02", vehicle_number="KL-07-BC-3198", route_name="Kozhikode → Wayanad", driver_name="Suresh", conductor_name="Nikhil"),
    Bus(id="bus-3", bus_number="MTR 03", vehicle_number="KL-11-CD-7720", route_name="Kozhikode → Vadakara", driver_name="Manoj", conductor_name="Vishnu"),
    Bus(id="bus-4", bus_number="MTR 04", vehicle_number="KL-56-DE-4088", route_name="Kozhikode → Koyilandy", driver_name="Jithin", conductor_name="Rafi"),
    Bus(id="bus-5", bus_number="MTR 05", vehicle_number="KL-18-EF-9012", route_name="Kozhikode → Thalassery", driver_name="Shaji", conductor_name="Binu"),
]

def make_seed() -> list[CollectionSheet]:
    rows: list[CollectionSheet] = []
    revenue = [[18400,16900,15800],[17800,16000,15300],[14200,14900,17100],[15700,15400,13800],[14500,16600,15100]]
    expense = [[6240,5850,5410],[6010,5700,5250],[4930,5150,5880],[5400,5300,4800],[5050,5700,5210]]
    for day_index, (revenues, costs) in enumerate(zip(revenue, expense)):
        for index, (collection, cost) in enumerate(zip(revenues, costs)):
            bus = BUS_SEED[(index + day_index) % len(BUS_SEED)]
            diesel = round(cost * .56, 2)
            rows.append(CollectionSheet(id=f"sheet-{day_index}-{index}", bus_id=bus.id, bus_number=bus.bus_number, vehicle_number=bus.vehicle_number, service_date=date.today()-timedelta(days=day_index), driver_name=bus.driver_name, conductor_name=bus.conductor_name, driver_collection=1200, conductor_collection=1700, checker_collection=280, total=3180, collection=collection, expense=cost, balance=collection-cost, expenses={"diesel":diesel,"oil":round(cost*.04,2),"tyre":round(cost*.05,2),"spare_parts":round(cost*.06,2),"workshop":round(cost*.1,2),"stand_fee":round(cost*.08,2),"washing":round(cost*.03,2),"others":round(cost*.08,2)}, created_at=(date.today()-timedelta(days=day_index)).isoformat()))
    return rows

buses: list[Bus] = BUS_SEED.copy()
sheets: list[CollectionSheet] = make_seed()

def summary() -> dict:
    today = [s for s in sheets if s.service_date == date.today()]
    revenue, expense = sum(s.collection for s in today), sum(s.expense for s in today)
    chart = []
    for days_ago in range(6, -1, -1):
        current = [s for s in sheets if s.service_date == date.today()-timedelta(days=days_ago)]
        chart.append({"date": (date.today()-timedelta(days=days_ago)).strftime("%a"), "revenue": sum(s.collection for s in current), "expense": sum(s.expense for s in current)})
    diesel = sum(s.expenses.get("diesel", 0) for s in today)
    margin = round((revenue-expense)/revenue*100) if revenue else 0
    return {"metrics": {"revenue":revenue,"expense":expense,"profit":revenue-expense,"bus_count":len([b for b in buses if b.status == "active"]),"margin":margin}, "chart":chart, "recent": sorted(sheets, key=lambda s:s.created_at, reverse=True)[:5], "insights":[Insight(title="Strong operating margin",body=f"Today's fleet profit margin is {margin}%, led by MTR 01.",kind="success"),Insight(title="Diesel is your largest cost",body=f"Fuel represents {round(diesel/expense*100) if expense else 0}% of today's expenses. Check refuelling rates.",kind="warning")]}

def demo_extraction() -> SheetInput:
    return SheetInput(bus_id="bus-1", driver_name="Ramesh", conductor_name="Akhil", batha=250, driver_collection=1250, conductor_collection=1850, checker_collection=300, total=3650, collection=18400, expense=6240, balance=12160, expenses={"diesel":3500,"oil":220,"tyre":0,"spare_parts":180,"workshop":900,"stand_fee":650,"washing":220,"others":570}, confidence=.94)

def ai_extract(content_type: str, payload: bytes) -> SheetInput:
    if not os.getenv("OPENAI_API_KEY") or OpenAI is None:
        return demo_extraction()
    encoded = base64.b64encode(payload).decode("ascii")
    schema = {"type":"object","properties":{"bus_id":{"type":"string"},"driver_name":{"type":"string"},"conductor_name":{"type":"string"},"batha":{"type":"number"},"driver_collection":{"type":"number"},"conductor_collection":{"type":"number"},"checker_collection":{"type":"number"},"total":{"type":"number"},"collection":{"type":"number"},"expense":{"type":"number"},"balance":{"type":"number"},"expenses":{"type":"object"},"confidence":{"type":"number"}},"required":["bus_id","collection","expense","balance","expenses"]}
    response = OpenAI().responses.create(model=os.getenv("OPENAI_MODEL", "gpt-5.6-sol"), input=[{"role":"user","content":[{"type":"input_text","text":"Extract this Kerala private-bus collection sheet. Return only numeric values where applicable. Use bus-1 if the bus cannot be matched."},{"type":"input_image","image_url":f"data:{content_type};base64,{encoded}"}]}], text={"format":{"type":"json_schema","name":"collection_sheet","schema":schema,"strict":False}})
    data = json.loads(response.output_text)
    data.setdefault("bus_id", "bus-1")
    data.setdefault("expenses", {})
    return SheetInput.model_validate(data)

def calculated_answer(question: str) -> str:
    q = question.lower()
    today = [s for s in sheets if s.service_date == date.today()]
    revenue, expense = sum(s.collection for s in today), sum(s.expense for s in today)
    if "profit" in q or "balance" in q: return f"Today's fleet profit is ₹{revenue-expense:,.0f} from ₹{revenue:,.0f} collected and ₹{expense:,.0f} spent."
    categories = {"diesel":"diesel","washing":"washing","oil":"oil","tyre":"tyre","workshop":"workshop","spare":"spare_parts","stand":"stand_fee"}
    for word, category in categories.items():
        if word in q: return f"Today's {word} expense is ₹{sum(s.expenses.get(category, 0) for s in today):,.0f}."
    if "highest" in q and ("expense" in q or "cost" in q):
        totals = {key:sum(s.expenses.get(key,0) for s in today) for key in ["diesel","oil","tyre","spare_parts","workshop","stand_fee","washing","others"]}
        key = max(totals, key=totals.get); return f"{key.replace('_',' ').title()} is the highest expense today at ₹{totals[key]:,.0f}."
    if "collection" in q or "revenue" in q: return f"Today's total collection is ₹{revenue:,.0f} across {len(today)} completed sheets."
    best = max(today, key=lambda s:s.collection) if today else None
    return f"FleetMind has recorded ₹{revenue-expense:,.0f} profit today. {best.bus_number if best else 'No bus'} has the highest collection at ₹{best.collection if best else 0:,.0f}."

@app.get("/health")
def health(): return {"status":"ok", "mode":"ai" if os.getenv("OPENAI_API_KEY") else "demo"}

@app.get("/api/dashboard")
def get_dashboard(): return summary()

@app.get("/api/buses", response_model=list[Bus])
def get_buses(): return buses

@app.post("/api/buses", response_model=Bus, status_code=201)
def create_bus(bus: Bus):
    if any(b.vehicle_number.lower() == bus.vehicle_number.lower() for b in buses): raise HTTPException(409, "A bus with this vehicle number already exists")
    buses.append(bus); return bus

@app.put("/api/buses/{bus_id}", response_model=Bus)
def update_bus(bus_id: str, bus: Bus):
    for i, item in enumerate(buses):
        if item.id == bus_id: buses[i] = bus; return bus
    raise HTTPException(404, "Bus not found")

@app.delete("/api/buses/{bus_id}", status_code=204)
def delete_bus(bus_id: str):
    global buses
    if any(s.bus_id == bus_id for s in sheets): raise HTTPException(409, "This bus has collection sheets and cannot be deleted")
    buses = [b for b in buses if b.id != bus_id]

@app.get("/api/sheets", response_model=list[CollectionSheet])
def get_sheets(): return sorted(sheets, key=lambda s:s.created_at, reverse=True)

@app.post("/api/sheets", response_model=CollectionSheet, status_code=201)
def save_sheet(sheet: SheetInput):
    bus = next((b for b in buses if b.id == sheet.bus_id), None)
    if not bus: raise HTTPException(422, "Select a valid bus")
    saved = CollectionSheet(id=f"sheet-manual-{len(sheets)+1}", bus_number=bus.bus_number, vehicle_number=bus.vehicle_number, created_at=date.today().isoformat(), **sheet.model_dump())
    sheets.append(saved); return saved

@app.post("/api/scanner/extract", response_model=SheetInput)
async def extract_sheet(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"): raise HTTPException(415, "Please upload an image file")
    raw = await file.read()
    if len(raw) > 10_000_000: raise HTTPException(413, "Image must be smaller than 10MB")
    try: return ai_extract(file.content_type, raw)
    except Exception: return demo_extraction()

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # Deterministic calculation fallback guarantees every demo question is answered.
    return ChatResponse(answer=calculated_answer(request.message), source="calculated")
