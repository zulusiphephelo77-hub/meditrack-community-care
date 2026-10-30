
alter table public.transfer_requests add column kind text not null default 'transfer';
alter table public.transfer_requests add column updated_at timestamptz not null default now();

create or replace function public.my_facility_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.facilities where user_id = auth.uid() $$;

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  from_facility_id uuid not null references public.facilities(id),
  to_facility_id uuid not null references public.facilities(id),
  medicine_id uuid not null references public.medicines(id),
  from_batch_id uuid not null references public.stock_batches(id),
  quantity integer not null,
  urgency text not null default 'normal',
  status text not null default 'pending',
  requested_by_facility_id uuid references public.facilities(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.stock_transfers to authenticated;
grant all on public.stock_transfers to service_role;
alter table public.stock_transfers enable row level security;
create policy "facilities read transfers" on public.stock_transfers for select to authenticated
  using (public.has_role(auth.uid(), 'facility'));

create table public.transfer_history (
  id uuid primary key default gen_random_uuid(),
  stock_transfer_id uuid references public.stock_transfers(id) on delete cascade,
  patient_request_id uuid references public.transfer_requests(id) on delete cascade,
  action text not null,
  actor_facility_id uuid references public.facilities(id),
  details text,
  created_at timestamptz not null default now()
);
grant select on public.transfer_history to authenticated;
grant all on public.transfer_history to service_role;
alter table public.transfer_history enable row level security;
create policy "facilities read history" on public.transfer_history for select to authenticated
  using (public.has_role(auth.uid(), 'facility'));

create policy "facility updates assigned patient requests" on public.transfer_requests for select to authenticated
  using (to_facility_id = public.my_facility_id());

create or replace function public.create_stock_transfer(
  _from uuid, _to uuid, _medicine uuid, _batch uuid, _qty integer, _urgency text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare me uuid := public.my_facility_id(); b public.stock_batches; new_id uuid;
begin
  if me is null or not public.has_role(auth.uid(), 'facility') then raise exception 'Only facility staff can request transfers'; end if;
  if _from = _to then raise exception 'Choose two different facilities'; end if;
  if _qty is null or _qty <= 0 then raise exception 'Quantity must be more than zero'; end if;
  if _urgency not in ('normal','urgent','critical') then raise exception 'Invalid urgency'; end if;
  select * into b from public.stock_batches where id = _batch;
  if b.id is null or b.facility_id <> _from or b.medicine_id <> _medicine then raise exception 'Batch does not belong to the sending facility'; end if;
  if b.quantity < _qty then raise exception 'Batch only has % units', b.quantity; end if;
  insert into public.stock_transfers (from_facility_id, to_facility_id, medicine_id, from_batch_id, quantity, urgency, requested_by_facility_id)
  values (_from, _to, _medicine, _batch, _qty, _urgency, me) returning id into new_id;
  insert into public.transfer_history (stock_transfer_id, action, actor_facility_id, details)
  values (new_id, 'requested', me, _qty || ' units, batch ' || b.batch_number || ', ' || _urgency);
  return new_id;
end $$;

create or replace function public.act_on_stock_transfer(_id uuid, _action text)
returns void language plpgsql security definer set search_path = public
as $$
declare me uuid := public.my_facility_id(); t public.stock_transfers; b public.stock_batches; dest uuid; avg_use numeric;
begin
  if me is null then raise exception 'Only facility staff can act on transfers'; end if;
  select * into t from public.stock_transfers where id = _id for update;
  if t.id is null then raise exception 'Transfer not found'; end if;
  if _action = 'approve' then
    if t.status <> 'pending' then raise exception 'Only pending transfers can be approved'; end if;
    if me <> t.from_facility_id then raise exception 'Only the sending facility can approve'; end if;
    select * into b from public.stock_batches where id = t.from_batch_id for update;
    if b.quantity < t.quantity then raise exception 'Not enough stock in batch % (% left)', b.batch_number, b.quantity; end if;
    update public.stock_batches set quantity = quantity - t.quantity where id = b.id;
    select id into dest from public.stock_batches
      where facility_id = t.to_facility_id and medicine_id = t.medicine_id and batch_number = b.batch_number;
    if dest is not null then
      update public.stock_batches set quantity = quantity + t.quantity, max_capacity = greatest(max_capacity, quantity + t.quantity) where id = dest;
    else
      select coalesce(max(avg_daily_use), 0) into avg_use from public.stock_batches
        where facility_id = t.to_facility_id and medicine_id = t.medicine_id;
      insert into public.stock_batches (facility_id, medicine_id, batch_number, quantity, max_capacity, avg_daily_use, expiry_date)
      values (t.to_facility_id, t.medicine_id, b.batch_number, t.quantity, t.quantity, avg_use, b.expiry_date);
    end if;
    update public.stock_transfers set status = 'approved', updated_at = now() where id = _id;
  elsif _action = 'reject' then
    if t.status <> 'pending' then raise exception 'Only pending transfers can be rejected'; end if;
    if me not in (t.from_facility_id, t.to_facility_id) then raise exception 'Not your transfer'; end if;
    update public.stock_transfers set status = 'rejected', updated_at = now() where id = _id;
  elsif _action = 'dispatch' then
    if t.status <> 'approved' then raise exception 'Only approved transfers can be dispatched'; end if;
    if me <> t.from_facility_id then raise exception 'Only the sending facility can dispatch'; end if;
    update public.stock_transfers set status = 'dispatched', updated_at = now() where id = _id;
  elsif _action = 'receive' then
    if t.status <> 'dispatched' then raise exception 'Only dispatched transfers can be received'; end if;
    if me <> t.to_facility_id then raise exception 'Only the receiving facility can mark received'; end if;
    update public.stock_transfers set status = 'received', updated_at = now() where id = _id;
  else
    raise exception 'Unknown action';
  end if;
  insert into public.transfer_history (stock_transfer_id, action, actor_facility_id, details)
  values (_id, _action, me, t.quantity || ' units');
end $$;

create or replace function public.act_on_patient_request(_id uuid, _status text)
returns void language plpgsql security definer set search_path = public
as $$
declare me uuid := public.my_facility_id(); r public.transfer_requests;
begin
  if _status not in ('accepted','ready','completed','rejected') then raise exception 'Invalid status'; end if;
  select * into r from public.transfer_requests where id = _id for update;
  if r.id is null or me is null or r.to_facility_id <> me then raise exception 'Only the assigned hospital can update this request'; end if;
  update public.transfer_requests set status = _status, updated_at = now() where id = _id;
  insert into public.transfer_history (patient_request_id, action, actor_facility_id, details)
  values (_id, 'patient ' || r.kind || ' ' || _status, me, null);
end $$;

revoke execute on function public.create_stock_transfer(uuid, uuid, uuid, uuid, integer, text) from public, anon;
revoke execute on function public.act_on_stock_transfer(uuid, text) from public, anon;
revoke execute on function public.act_on_patient_request(uuid, text) from public, anon;
grant execute on function public.create_stock_transfer(uuid, uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.act_on_stock_transfer(uuid, text) to authenticated;
grant execute on function public.act_on_patient_request(uuid, text) to authenticated;
