create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  organization_name text not null default 'My Fleet',
  created_at timestamptz not null default now()
);

create table public.buses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bus_number text not null,
  vehicle_number text not null,
  route_name text,
  driver_name text,
  conductor_name text,
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, vehicle_number)
);

create table public.collection_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bus_id uuid not null references public.buses(id) on delete restrict,
  service_date date not null,
  driver_name text,
  conductor_name text,
  batha numeric(12,2) not null default 0 check (batha >= 0),
  driver_collection numeric(12,2) not null default 0 check (driver_collection >= 0),
  conductor_collection numeric(12,2) not null default 0 check (conductor_collection >= 0),
  checker_collection numeric(12,2) not null default 0 check (checker_collection >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  collection numeric(12,2) not null default 0 check (collection >= 0),
  expense numeric(12,2) not null default 0 check (expense >= 0),
  balance numeric(12,2) not null default 0,
  source_image_path text,
  extraction_confidence numeric(5,2),
  review_status text not null default 'reviewed' check (review_status in ('draft','reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bus_id, service_date)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  collection_sheet_id uuid not null references public.collection_sheets(id) on delete cascade,
  category text not null check (category in ('diesel','oil','tyre','spare_parts','workshop','stand_fee','washing','others')),
  amount numeric(12,2) not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique(collection_sheet_id, category)
);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'observation' check (kind in ('observation','warning','success')),
  metric_value numeric(12,2),
  created_at timestamptz not null default now()
);

create table public.chat_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 4000),
  created_at timestamptz not null default now()
);

create index collection_sheets_owner_date_idx on public.collection_sheets(owner_id, service_date desc);
create index collection_sheets_bus_date_idx on public.collection_sheets(bus_id, service_date desc);
create index expenses_sheet_idx on public.expenses(collection_sheet_id);
create index ai_insights_owner_created_idx on public.ai_insights(owner_id, created_at desc);
create index chat_history_owner_created_idx on public.chat_history(owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.buses enable row level security;
alter table public.collection_sheets enable row level security;
alter table public.expenses enable row level security;
alter table public.ai_insights enable row level security;
alter table public.chat_history enable row level security;

create policy "profiles owned" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "buses owned" on public.buses for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "sheets owned" on public.collection_sheets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "expenses owned through sheet" on public.expenses for all using (exists (select 1 from public.collection_sheets s where s.id = collection_sheet_id and s.owner_id = auth.uid())) with check (exists (select 1 from public.collection_sheets s where s.id = collection_sheet_id and s.owner_id = auth.uid()));
create policy "insights owned" on public.ai_insights for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "chat owned" on public.chat_history for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Run `select public.seed_fleetmind_demo(auth.uid());` after a user signs in.
-- This avoids creating a fake user in Supabase Auth while retaining deterministic demo records.
create or replace function public.seed_fleetmind_demo(demo_owner uuid) returns void language plpgsql security definer set search_path = public as $$
declare b1 uuid := gen_random_uuid(); declare b2 uuid := gen_random_uuid(); declare b3 uuid := gen_random_uuid(); declare b4 uuid := gen_random_uuid(); declare b5 uuid := gen_random_uuid();
begin
  insert into public.profiles(id, full_name, organization_name) values (demo_owner, 'Arun Nair', 'Malabar Transit') on conflict do nothing;
  insert into public.buses(id,owner_id,bus_number,vehicle_number,route_name,driver_name,conductor_name) values
  (b1,demo_owner,'MTR 01','KL-07-AB-2211','Kozhikode → Kannur','Ramesh','Akhil'),(b2,demo_owner,'MTR 02','KL-07-BC-3198','Kozhikode → Wayanad','Suresh','Nikhil'),(b3,demo_owner,'MTR 03','KL-11-CD-7720','Kozhikode → Vadakara','Manoj','Vishnu'),(b4,demo_owner,'MTR 04','KL-56-DE-4088','Kozhikode → Koyilandy','Jithin','Rafi'),(b5,demo_owner,'MTR 05','KL-18-EF-9012','Kozhikode → Thalassery','Shaji','Binu');
  insert into public.collection_sheets(owner_id,bus_id,service_date,driver_name,conductor_name,driver_collection,conductor_collection,checker_collection,total,collection,expense,balance) values
  (demo_owner,b1,current_date,'Ramesh','Akhil',1250,1850,300,3400,18400,6240,12160),(demo_owner,b2,current_date,'Suresh','Nikhil',1180,1740,280,3200,16900,5850,11050),(demo_owner,b3,current_date,'Manoj','Vishnu',1200,1780,250,3230,15800,5410,10390),
  (demo_owner,b1,current_date-1,'Ramesh','Akhil',1240,1800,300,3340,17800,6010,11790),(demo_owner,b2,current_date-1,'Suresh','Nikhil',1170,1700,260,3130,16000,5700,10300),(demo_owner,b3,current_date-1,'Manoj','Vishnu',1190,1690,250,3130,15300,5250,10050),
  (demo_owner,b4,current_date-2,'Jithin','Rafi',1100,1600,220,2920,14200,4930,9270),(demo_owner,b5,current_date-2,'Shaji','Binu',1140,1640,230,3010,14900,5150,9750),(demo_owner,b1,current_date-3,'Ramesh','Akhil',1200,1760,280,3240,17100,5880,11220),
  (demo_owner,b2,current_date-3,'Suresh','Nikhil',1150,1660,250,3060,15700,5400,10300),(demo_owner,b3,current_date-4,'Manoj','Vishnu',1170,1680,240,3090,15400,5300,10100),(demo_owner,b4,current_date-4,'Jithin','Rafi',1070,1570,210,2850,13800,4800,9000),
  (demo_owner,b5,current_date-5,'Shaji','Binu',1110,1600,220,2930,14500,5050,9450),(demo_owner,b1,current_date-5,'Ramesh','Akhil',1180,1720,270,3170,16600,5700,10900),(demo_owner,b2,current_date-6,'Suresh','Nikhil',1120,1630,240,2990,15100,5210,9890);
  insert into public.ai_insights(owner_id,title,body,kind) values (demo_owner,'Strong operating margin','Today''s fleet profit margin is 66%, led by MTR 01.','success'),(demo_owner,'Diesel is your largest cost','Fuel represents 56% of today''s expenses. Consider checking refuelling rates.','warning');
end; $$;
