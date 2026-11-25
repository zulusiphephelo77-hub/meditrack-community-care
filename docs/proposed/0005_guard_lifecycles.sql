-- PROPOSED, NOT APPLIED. Not in drizzle/migrations/_journal.json. Review before use.
-- Closes the "ui"/"none" guards listed in docs/state-machines.md. The current UI
-- already stays inside these rules, so it should keep working unchanged.

-- 1. Patient requests: reject skipping stages and reopening finished requests.
create or replace function public.act_on_patient_request(_id uuid, _status text)
returns void language plpgsql security definer set search_path = public
as $$
declare me uuid := public.my_facility_id(); r public.transfer_requests;
begin
  if _status not in ('accepted','ready','completed','rejected') then raise exception 'Invalid status'; end if;
  select * into r from public.transfer_requests where id = _id for update;
  if r.id is null or me is null or r.to_facility_id <> me then raise exception 'Only the assigned hospital can update this request'; end if;
  if not ((r.status = 'sent' and _status in ('accepted','rejected'))
       or (r.status = 'accepted' and _status in ('ready','rejected'))
       or (r.status = 'ready' and _status in ('completed','rejected'))) then
    raise exception 'Invalid request status change';
  end if;
  update public.transfer_requests set status = _status, updated_at = now() where id = _id;
  insert into public.transfer_history (patient_request_id, action, actor_facility_id, details)
  values (_id, 'patient ' || r.kind || ' ' || _status, me, null);
end $$;

-- 2. Value checks for text status columns that have none (verify no stray rows first).
alter table public.stock_transfers  add constraint stock_transfers_status_check
  check (status in ('pending','approved','packed','dispatched','received','rejected')) not valid;
alter table public.transfer_requests add constraint transfer_requests_status_check
  check (status in ('sent','accepted','ready','completed','rejected')) not valid;
alter table public.notifications     add constraint notifications_status_check
  check (status in ('unread','read','dismissed','accepted')) not valid;
-- then: alter table ... validate constraint ...;

-- 3. Clinic journey is intentionally left unguarded until product decides whether
--    going backwards (e.g. Arrived -> En route) is a valid correction.
