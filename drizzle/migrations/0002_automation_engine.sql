
create or replace function public.km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = public
as $$ select 2 * 6371 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))) $$;

create table public.sim_clock (id int primary key default 1, offset_days int not null default 0, check (id = 1));
insert into public.sim_clock (id, offset_days) values (1, 0);
grant select on public.sim_clock to authenticated;
grant all on public.sim_clock to service_role;
alter table public.sim_clock enable row level security;
create policy "read clock" on public.sim_clock for select to authenticated using (true);

create table public.facility_settings (
  facility_id uuid primary key references public.facilities(id) on delete cascade,
  auto_order_enabled boolean not null default true,
  threshold_mode text not null default 'percent',
  threshold_percent integer not null default 20,
  threshold_count integer not null default 200,
  expiry_months integer not null default 4,
  order_qty_mode text not null default 'auto',
  check (threshold_mode in ('percent','count')),
  check (threshold_percent between 1 and 90),
  check (threshold_count between 1 and 100000),
  check (expiry_months between 1 and 24)
);
insert into public.facility_settings (facility_id) select id from public.facilities;
grant select, update on public.facility_settings to authenticated;
grant all on public.facility_settings to service_role;
alter table public.facility_settings enable row level security;
create policy "facilities read settings" on public.facility_settings for select to authenticated using (public.has_role(auth.uid(), 'facility'));
create policy "facility updates own settings" on public.facility_settings for update to authenticated
  using (facility_id = public.my_facility_id()) with check (facility_id = public.my_facility_id());

alter table public.stock_batches add column storage text not null default 'ambient';
alter table public.stock_batches add column bin_location text;
update public.stock_batches set storage = 'cold_chain'
  where medicine_id in (select id from public.medicines where code = 'insulin');
update public.stock_batches b set bin_location = case m.code
    when 'amlo' then 'A-01-03' when 'insulin' then 'CR-02-01' when 'enal' then 'A-01-07'
    when 'salb' then 'B-03-02' when 'rifalax' then 'TB-01-01' when 'amox' then 'A-04-05' else 'A-06-01' end
  from public.medicines m where m.id = b.medicine_id
  and b.facility_id = (select id from public.facilities where code = 'pmb-wh');

alter table public.stock_transfers add column source text not null default 'manual';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  payload jsonb,
  status text not null default 'unread',
  dedupe_key text unique,
  created_at timestamptz not null default now()
);
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (facility_id = public.my_facility_id());

create table public.automation_log (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete cascade,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);
grant select on public.automation_log to authenticated;
grant all on public.automation_log to service_role;
alter table public.automation_log enable row level security;
create policy "facilities read log" on public.automation_log for select to authenticated using (public.has_role(auth.uid(), 'facility'));

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.stock_batches(id) on delete cascade,
  catalogue_quantity integer not null,
  counted_quantity integer not null,
  variance integer not null,
  reason text not null,
  facility_id uuid references public.facilities(id),
  created_at timestamptz not null default now()
);
grant select on public.stock_adjustments to authenticated;
grant all on public.stock_adjustments to service_role;
alter table public.stock_adjustments enable row level security;
create policy "facilities read adjustments" on public.stock_adjustments for select to authenticated using (public.has_role(auth.uid(), 'facility'));

create table public.cold_chain_readings (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  temperature numeric not null,
  breach boolean not null,
  created_at timestamptz not null default now()
);
grant select on public.cold_chain_readings to authenticated;
grant all on public.cold_chain_readings to service_role;
alter table public.cold_chain_readings enable row level security;
create policy "facilities read readings" on public.cold_chain_readings for select to authenticated using (public.has_role(auth.uid(), 'facility'));

create or replace function public.sim_today() returns date language sql stable security definer set search_path = public
as $$ select current_date + coalesce((select offset_days from public.sim_clock where id = 1), 0) $$;

create or replace function public.notify(_facility uuid, _kind text, _title text, _body text, _payload jsonb, _key text)
returns void language sql security definer set search_path = public
as $$ insert into public.notifications (facility_id, kind, title, body, payload, dedupe_key)
      values (_facility, _kind, _title, _body, _payload, _key) on conflict (dedupe_key) do nothing $$;

create or replace function public.log_action(_facility uuid, _action text, _details text)
returns void language sql security definer set search_path = public
as $$ insert into public.automation_log (facility_id, action, details) values (_facility, _action, _details) $$;

create or replace function public.run_automation()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  today date := public.sim_today();
  wh uuid := (select id from public.facilities where code = 'pmb-wh');
  r record; wb record; tgt record;
  hit boolean; need integer; avail integer; n integer; tid uuid; excess integer; rid uuid; t numeric; k text;
  orders int := 0; suggestions int := 0; breaches int := 0;
begin
  if not public.has_role(auth.uid(), 'facility') then raise exception 'Only facility staff can run automation'; end if;

  -- 1. Auto-orders to the warehouse
  for r in
    select f.id fid, f.name fname, m.id mid, m.name mname, st.threshold_mode, st.threshold_percent, st.threshold_count,
      coalesce(sum(b.quantity) filter (where b.expiry_date >= today), 0)::int qty,
      coalesce(max(b.max_capacity), 0)::int cap,
      coalesce(max(b.avg_daily_use), 0) use
    from public.facilities f
    join public.facility_settings st on st.facility_id = f.id and st.auto_order_enabled
    join public.stock_batches b on b.facility_id = f.id
    join public.medicines m on m.id = b.medicine_id
    where f.id <> wh
    group by f.id, f.name, m.id, m.name, st.threshold_mode, st.threshold_percent, st.threshold_count
  loop
    hit := case when r.threshold_mode = 'count' then r.qty <= r.threshold_count else r.qty <= r.cap * r.threshold_percent / 100.0 end;
    continue when not hit;
    continue when exists (select 1 from public.stock_transfers x where x.to_facility_id = r.fid and x.medicine_id = r.mid
                          and x.status in ('pending','approved','packed','dispatched'));
    need := greatest(r.cap - r.qty, ceil(r.use * 30))::int;
    select b.id, b.batch_number, b.quantity - coalesce((select sum(x.quantity) from public.stock_transfers x where x.from_batch_id = b.id and x.status = 'pending'), 0) as avail
      into wb
      from public.stock_batches b
      where b.facility_id = wh and b.medicine_id = r.mid and b.expiry_date >= today
        and b.quantity - coalesce((select sum(x.quantity) from public.stock_transfers x where x.from_batch_id = b.id and x.status = 'pending'), 0) > 0
      order by b.expiry_date limit 1;
    if wb.id is null then
      perform public.notify(r.fid, 'warning', 'Warehouse out of stock', r.mname || ' reached the reorder threshold but the warehouse has none available.', null, 'nowh:' || r.fid || ':' || r.mid || ':' || today);
      continue;
    end if;
    n := least(need, wb.avail);
    continue when n <= 0;
    insert into public.stock_transfers (from_facility_id, to_facility_id, medicine_id, from_batch_id, quantity, urgency, requested_by_facility_id, source)
      values (wh, r.fid, r.mid, wb.id, n, case when r.qty = 0 then 'urgent' else 'normal' end, r.fid, 'auto_order') returning id into tid;
    insert into public.transfer_history (stock_transfer_id, action, actor_facility_id, details)
      values (tid, 'auto-order created', r.fid, n || ' units, batch ' || wb.batch_number || ' (FEFO)');
    perform public.notify(r.fid, 'auto_order', 'Auto-order placed',
      r.mname || ': ' || r.qty || ' left (reorder threshold reached). Ordered ' || n || ' from Provincial Warehouse.', jsonb_build_object('transfer', tid), 'auto:' || tid);
    perform public.notify(wh, 'clinic_order', 'New clinic order',
      r.fname || ' needs ' || n || ' × ' || r.mname || '. Pick batch ' || wb.batch_number || ' (earliest expiry).', jsonb_build_object('transfer', tid), 'autowh:' || tid);
    perform public.log_action(r.fid, 'Auto-order', r.fname || ' → ' || n || ' × ' || r.mname || ' from warehouse');
    orders := orders + 1;
  end loop;

  -- 2. Expiry: move stock the holder cannot use in time to the nearest site that will use it
  for r in
    select b.id bid, b.batch_number, b.quantity, b.expiry_date, b.facility_id hid, h.name hname, h.lat hlat, h.lng hlng,
      b.medicine_id mid, m.name mname, (b.expiry_date - today) days_left,
      coalesce((select max(x.avg_daily_use) from public.stock_batches x where x.facility_id = b.facility_id and x.medicine_id = b.medicine_id), 0) huse
    from public.stock_batches b
    join public.facilities h on h.id = b.facility_id
    join public.medicines m on m.id = b.medicine_id
    join public.facility_settings st on st.facility_id = h.id
    where b.quantity > 0 and b.expiry_date >= today and b.expiry_date <= (today + make_interval(months => st.expiry_months))::date
  loop
    excess := (r.quantity - floor(r.huse * r.days_left))::int;
    continue when excess <= 0;
    tgt := null;
    select q.id, q.name, q.need into tgt from (
      select f.id, f.name,
        ceil(coalesce(max(x.avg_daily_use), 0) * r.days_left - coalesce(sum(x.quantity) filter (where x.expiry_date >= today), 0))::int need,
        public.km(r.hlat, r.hlng, f.lat, f.lng) d
      from public.facilities f join public.stock_batches x on x.facility_id = f.id and x.medicine_id = r.mid
      where f.id <> r.hid and f.id <> wh
      group by f.id, f.name, f.lat, f.lng
    ) q where q.need > 0 order by q.d limit 1;
    continue when tgt.id is null;
    n := least(excess, tgt.need);
    k := 'exp:' || r.bid || ':' || tgt.id;
    continue when exists (select 1 from public.notifications where dedupe_key = k);
    perform public.notify(r.hid, 'expiry_suggestion', 'Expiring stock: transfer suggested',
      format('Batch %s of %s expires on %s. Transfer %s packs to %s, which needs it.', r.batch_number, r.mname, to_char(r.expiry_date, 'DD Mon YYYY'), n, tgt.name),
      jsonb_build_object('from', r.hid, 'to', tgt.id, 'medicine', r.mid, 'batch', r.bid, 'quantity', n), k);
    perform public.notify(tgt.id, 'incoming_suggestion', 'Incoming stock suggested',
      format('%s may send you %s packs of %s (batch %s, expires %s).', r.hname, n, r.mname, r.batch_number, to_char(r.expiry_date, 'DD Mon YYYY')), null, k || ':rx');
    perform public.log_action(r.hid, 'Expiry suggestion', format('%s batch %s: %s packs → %s', r.mname, r.batch_number, n, tgt.name));
    suggestions := suggestions + 1;
  end loop;

  -- 3. Simulated cold-chain readings (2-8°C)
  for r in
    select distinct f.id fid, f.name fname from public.facilities f
    join public.stock_batches b on b.facility_id = f.id and b.storage = 'cold_chain' and b.quantity > 0
  loop
    continue when exists (select 1 from public.cold_chain_readings c where c.facility_id = r.fid and c.created_at > now() - interval '25 seconds');
    t := case when random() < 0.08
           then (case when random() < 0.5 then 8.5 + random() * 3 else 0.5 + random() * 1.3 end)
           else 2.5 + random() * 5 end;
    t := round(t, 1);
    insert into public.cold_chain_readings (facility_id, temperature, breach) values (r.fid, t, t < 2 or t > 8) returning id into rid;
    if t < 2 or t > 8 then
      perform public.notify(r.fid, 'cold_chain', 'Cold-chain breach', format('Fridge reading %s°C is outside 2–8°C. Check cold-chain stock at %s.', t, r.fname), null, 'cc:' || rid);
      perform public.log_action(r.fid, 'Cold-chain breach', t || '°C at ' || r.fname);
      breaches := breaches + 1;
    end if;
  end loop;

  return jsonb_build_object('orders', orders, 'suggestions', suggestions, 'breaches', breaches, 'today', today);
end $$;

create or replace function public.simulate_next_day()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare wh uuid := (select id from public.facilities where code = 'pmb-wh'); r record; b record; remaining integer; take integer; today date;
begin
  if not public.has_role(auth.uid(), 'facility') then raise exception 'Only facility staff can simulate'; end if;
  update public.sim_clock set offset_days = offset_days + 1 where id = 1;
  today := public.sim_today();
  for r in select facility_id, medicine_id, max(avg_daily_use) use from public.stock_batches
           where facility_id <> wh group by facility_id, medicine_id having max(avg_daily_use) > 0
  loop
    remaining := ceil(r.use)::int;
    for b in select id, quantity from public.stock_batches
             where facility_id = r.facility_id and medicine_id = r.medicine_id and quantity > 0 and expiry_date >= today
             order by expiry_date
    loop
      take := least(b.quantity, remaining);
      update public.stock_batches set quantity = quantity - take where id = b.id;
      remaining := remaining - take;
      exit when remaining <= 0;
    end loop;
  end loop;
  perform public.log_action(null, 'Simulated day', 'Clock moved to ' || to_char(today, 'DD Mon YYYY') || '; daily usage dispensed at every clinic');
  return public.run_automation();
end $$;

create or replace function public.notification_action(_id uuid, _action text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare me uuid := public.my_facility_id(); n public.notifications; b public.stock_batches; q integer; tid uuid;
begin
  select * into n from public.notifications where id = _id for update;
  if n.id is null or me is null or n.facility_id <> me then raise exception 'Not your notification'; end if;
  if _action = 'read' then
    update public.notifications set status = 'read' where id = _id and status = 'unread';
  elsif _action = 'dismiss' then
    update public.notifications set status = 'dismissed' where id = _id;
    perform public.log_action(me, 'Dismissed', n.title);
  elsif _action = 'accept' then
    if n.kind <> 'expiry_suggestion' or n.status not in ('unread','read') then raise exception 'This suggestion can no longer be accepted'; end if;
    select * into b from public.stock_batches where id = (n.payload->>'batch')::uuid;
    q := least((n.payload->>'quantity')::int, b.quantity);
    if q <= 0 then raise exception 'Batch has no stock left'; end if;
    insert into public.stock_transfers (from_facility_id, to_facility_id, medicine_id, from_batch_id, quantity, urgency, requested_by_facility_id, source)
      values (me, (n.payload->>'to')::uuid, b.medicine_id, b.id, q, 'urgent', me, 'expiry_suggestion') returning id into tid;
    insert into public.transfer_history (stock_transfer_id, action, actor_facility_id, details)
      values (tid, 'requested', me, q || ' units, batch ' || b.batch_number || ' (expiry suggestion)');
    update public.notifications set status = 'accepted' where id = _id;
    perform public.notify((n.payload->>'to')::uuid, 'info', 'Transfer on its way', format('%s units of batch %s have been offered to you. Track it under Orders.', q, b.batch_number), jsonb_build_object('transfer', tid), 'acc:' || tid);
    perform public.log_action(me, 'Suggestion accepted', 'Transfer created: ' || q || ' units of batch ' || b.batch_number);
    return tid;
  else
    raise exception 'Unknown action';
  end if;
  return null;
end $$;

create or replace function public.mark_all_read()
returns void language sql security definer set search_path = public
as $$ update public.notifications set status = 'read' where facility_id = public.my_facility_id() and status = 'unread' $$;

create or replace function public.apply_stock_take(_batch uuid, _counted integer, _reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare me uuid := public.my_facility_id(); wh uuid := (select id from public.facilities where code = 'pmb-wh'); b public.stock_batches;
begin
  if me is null or me <> wh then raise exception 'Only the warehouse can adjust catalogue stock'; end if;
  if _counted is null or _counted < 0 then raise exception 'Count must be zero or more'; end if;
  if coalesce(length(trim(_reason)), 0) < 3 then raise exception 'Give a reason for the adjustment'; end if;
  select * into b from public.stock_batches where id = _batch for update;
  if b.id is null or b.facility_id <> wh then raise exception 'Batch is not in the warehouse catalogue'; end if;
  insert into public.stock_adjustments (batch_id, catalogue_quantity, counted_quantity, variance, reason, facility_id)
    values (b.id, b.quantity, _counted, _counted - b.quantity, left(trim(_reason), 200), me);
  update public.stock_batches set quantity = _counted where id = b.id;
  perform public.log_action(me, 'Stock take', format('Batch %s: %s → %s (%s)', b.batch_number, b.quantity, _counted, left(trim(_reason), 200)));
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
      insert into public.stock_batches (facility_id, medicine_id, batch_number, quantity, max_capacity, avg_daily_use, expiry_date, storage)
      values (t.to_facility_id, t.medicine_id, b.batch_number, t.quantity, t.quantity, avg_use, b.expiry_date, b.storage);
    end if;
    update public.stock_transfers set status = 'approved', updated_at = now() where id = _id;
  elsif _action = 'reject' then
    if t.status <> 'pending' then raise exception 'Only pending transfers can be rejected'; end if;
    if me not in (t.from_facility_id, t.to_facility_id) then raise exception 'Not your transfer'; end if;
    update public.stock_transfers set status = 'rejected', updated_at = now() where id = _id;
  elsif _action = 'pack' then
    if t.status <> 'approved' then raise exception 'Only approved transfers can be packed'; end if;
    if me <> t.from_facility_id then raise exception 'Only the sending facility can pack'; end if;
    update public.stock_transfers set status = 'packed', updated_at = now() where id = _id;
  elsif _action = 'dispatch' then
    if t.status not in ('approved','packed') then raise exception 'Only approved or packed transfers can be dispatched'; end if;
    if me <> t.from_facility_id then raise exception 'Only the sending facility can dispatch'; end if;
    update public.stock_transfers set status = 'dispatched', updated_at = now() where id = _id;
    perform public.notify(t.to_facility_id, 'info', 'Order dispatched', t.quantity || ' units are on the way to you.', jsonb_build_object('transfer', t.id), 'disp:' || t.id);
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

revoke execute on function public.notify(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.log_action(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.run_automation() from public, anon;
revoke execute on function public.simulate_next_day() from public, anon;
revoke execute on function public.notification_action(uuid, text) from public, anon;
revoke execute on function public.mark_all_read() from public, anon;
revoke execute on function public.apply_stock_take(uuid, integer, text) from public, anon;
grant execute on function public.run_automation() to authenticated;
grant execute on function public.simulate_next_day() to authenticated;
grant execute on function public.notification_action(uuid, text) to authenticated;
grant execute on function public.mark_all_read() to authenticated;
grant execute on function public.apply_stock_take(uuid, integer, text) to authenticated;
