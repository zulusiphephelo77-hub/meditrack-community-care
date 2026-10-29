
create type public.app_role as enum ('patient', 'facility');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  kind text not null,
  district text not null,
  username text unique not null,
  lat double precision not null,
  lng double precision not null,
  user_id uuid unique
);
grant select on public.facilities to authenticated;
grant all on public.facilities to service_role;
alter table public.facilities enable row level security;
create policy "authenticated read facilities" on public.facilities for select to authenticated using (true);

create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  condition text not null,
  unit text not null default 'tablets'
);
grant select on public.medicines to authenticated;
grant all on public.medicines to service_role;
alter table public.medicines enable row level security;
create policy "authenticated read medicines" on public.medicines for select to authenticated using (true);

create table public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  batch_number text not null,
  quantity integer not null default 0,
  max_capacity integer not null default 0,
  avg_daily_use numeric not null default 0,
  expiry_date date not null
);
grant select on public.stock_batches to authenticated;
grant all on public.stock_batches to service_role;
alter table public.stock_batches enable row level security;
create policy "authenticated read stock" on public.stock_batches for select to authenticated using (true);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_number text unique not null,
  full_name text not null,
  date_of_birth date not null,
  home_facility_id uuid not null references public.facilities(id),
  user_id uuid unique
);
grant select on public.patients to authenticated;
grant all on public.patients to service_role;
alter table public.patients enable row level security;
create policy "patient reads self" on public.patients for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'facility'));

create or replace function public.current_patient_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.patients where user_id = auth.uid() $$;

create table public.patient_medicines (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  dosage text not null,
  unique (patient_id, medicine_id)
);
grant select on public.patient_medicines to authenticated;
grant all on public.patient_medicines to service_role;
alter table public.patient_medicines enable row level security;
create policy "own prescriptions" on public.patient_medicines for select to authenticated
  using (patient_id = public.current_patient_id() or public.has_role(auth.uid(), 'facility'));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  title text not null,
  scheduled_at timestamptz not null
);
grant select on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "own appointments" on public.appointments for select to authenticated
  using (patient_id = public.current_patient_id() or public.has_role(auth.uid(), 'facility'));

create table public.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  medicine_id uuid references public.medicines(id),
  to_facility_id uuid references public.facilities(id),
  status text not null default 'sent',
  created_at timestamptz not null default now()
);
grant select, insert on public.transfer_requests to authenticated;
grant all on public.transfer_requests to service_role;
alter table public.transfer_requests enable row level security;
create policy "own transfers read" on public.transfer_requests for select to authenticated
  using (patient_id = public.current_patient_id() or public.has_role(auth.uid(), 'facility'));
create policy "own transfers insert" on public.transfer_requests for insert to authenticated
  with check (patient_id = public.current_patient_id());

-- Fictional seed data (KwaZulu-Natal)
insert into public.facilities (code, name, kind, district, username, lat, lng) values
 ('pmb-wh','Provincial Warehouse Pietermaritzburg','Warehouse','uMgungundlovu','warehouse.pmb',-29.6006,30.3794),
 ('edendale','Edendale Hospital','Hospital','uMgungundlovu','edendale',-29.6436,30.3069),
 ('kwadabeka','KwaDabeka CHC','Community Health Centre','eThekwini','kwadabeka',-29.7836,30.9156),
 ('ndwedwe','Ndwedwe Rural Clinic','Clinic','iLembe','ndwedwe',-29.5167,30.9333),
 ('ixopo','Ixopo Rural Clinic','Clinic','Harry Gwala','ixopo',-30.1544,30.0611),
 ('mobile1','Mobile Clinic Unit 1','Mobile Clinic','iLembe','mobile1',-29.5600,30.9000);

insert into public.medicines (code, name, condition) values
 ('amlo','Amlodipine 10mg','High blood pressure'),
 ('insulin','Insulin (Actraphane)','Diabetes'),
 ('enal','Enalapril 10mg','High blood pressure'),
 ('salb','Salbutamol inhaler','Asthma'),
 ('rifalax','Rifalax 250 (TB regimen)','Tuberculosis'),
 ('amox','Amoxicillin 500mg','Bacterial infection'),
 ('para','Paracetamol 500mg','Pain and fever');

insert into public.stock_batches (facility_id, medicine_id, batch_number, quantity, max_capacity, avg_daily_use, expiry_date)
select f.id, m.id, s.batch, s.qty, s.cap, s.use, current_date + s.days
from (values
 ('pmb-wh','amlo','WH-AM-001',8000,10000,120,400),
 ('pmb-wh','insulin','WH-IN-001',900,1200,15,200),
 ('pmb-wh','enal','WH-EN-001',5000,8000,60,300),
 ('pmb-wh','salb','WH-SA-001',600,1000,8,500),
 ('pmb-wh','rifalax','WH-RF-001',3000,5000,40,365),
 ('pmb-wh','amox','WH-AX-001',6000,8000,70,250),
 ('pmb-wh','para','WH-PA-001',12000,15000,200,600),
 ('edendale','amlo','ED-AM-014',1200,2000,40,180),
 ('edendale','insulin','ED-IN-007',140,300,6,60),
 ('edendale','enal','ED-EN-003',800,1000,25,240),
 ('edendale','salb','ED-SA-002',30,200,3,300),
 ('edendale','rifalax','ED-RF-009',400,600,10,45),
 ('edendale','amox','ED-AX-011',900,1200,30,200),
 ('edendale','para','ED-PA-020',2000,3000,60,400),
 ('kwadabeka','amlo','KD-AM-004',60,500,12,120),
 ('kwadabeka','insulin','KD-IN-002',0,100,3,90),
 ('kwadabeka','enal','KD-EN-005',300,400,8,200),
 ('kwadabeka','rifalax','KD-RF-003',60,500,8,30),
 ('kwadabeka','amox','KD-AX-006',120,200,6,100),
 ('kwadabeka','para','KD-PA-008',200,300,10,105),
 ('ndwedwe','amlo','ND-AM-002',0,100,4,150),
 ('ndwedwe','enal','ND-EN-001',20,100,3,40),
 ('ndwedwe','salb','ND-SA-001',12,40,1,200),
 ('ndwedwe','amox','ND-AX-002',70,200,5,60),
 ('ndwedwe','para','ND-PA-003',150,300,8,300),
 ('ixopo','amlo','IX-AM-009',950,1000,5,75),
 ('ixopo','enal','IX-EN-004',700,800,4,90),
 ('ixopo','amox','IX-AX-003',500,600,4,200),
 ('ixopo','para','IX-PA-005',900,1000,6,45),
 ('ixopo','rifalax','IX-RF-002',250,300,2,150),
 ('mobile1','amlo','MC-AM-001',20,80,3,100),
 ('mobile1','para','MC-PA-001',80,150,5,200),
 ('mobile1','salb','MC-SA-001',0,20,1,200)
) as s(fac, med, batch, qty, cap, use, days)
join public.facilities f on f.code = s.fac
join public.medicines m on m.code = s.med;

insert into public.patients (patient_number, full_name, date_of_birth, home_facility_id)
select p.num, p.name, p.dob::date, f.id from (values
 ('HN123456','Zimbili Mkhize','1968-04-12','ndwedwe'),
 ('HN234567','Sipho Ndlovu','1955-09-03','kwadabeka'),
 ('HN345678','Thandeka Dlamini','1990-01-20','edendale')
) as p(num, name, dob, fac) join public.facilities f on f.code = p.fac;

insert into public.patient_medicines (patient_id, medicine_id, dosage)
select p.id, m.id, x.dose from (values
 ('HN123456','amlo','1 tablet daily'),
 ('HN123456','para','2 tablets when needed'),
 ('HN234567','insulin','20 units twice daily'),
 ('HN234567','enal','1 tablet daily'),
 ('HN345678','rifalax','4 tablets daily'),
 ('HN345678','salb','2 puffs when needed')
) as x(num, med, dose)
join public.patients p on p.patient_number = x.num
join public.medicines m on m.code = x.med;

insert into public.appointments (patient_id, facility_id, title, scheduled_at)
select p.id, f.id, a.title, (current_date + a.days)::timestamptz + a.t::time
from (values
 ('HN123456','ndwedwe','General Clinic',14,'08:00'),
 ('HN123456','edendale','Medication Review',42,'09:00'),
 ('HN123456','ndwedwe','Follow-up Visit',77,'08:30'),
 ('HN123456','ndwedwe','Blood pressure check',-30,'10:00'),
 ('HN123456','edendale','Specialist consult',-90,'11:30'),
 ('HN234567','kwadabeka','Diabetes Clinic',7,'09:30'),
 ('HN234567','kwadabeka','Eye screening',-21,'08:00'),
 ('HN345678','edendale','TB Review',3,'10:00'),
 ('HN345678','edendale','Sputum test',-14,'09:00')
) as a(num, fac, title, days, t)
join public.patients p on p.patient_number = a.num
join public.facilities f on f.code = a.fac;
