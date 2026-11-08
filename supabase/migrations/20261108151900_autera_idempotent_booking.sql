-- Idempotent guest booking without granting private-row reads to guests.
create or replace function autera_private.guard_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare locked_slot timestamptz; local_start timestamp; local_today date;
begin
 if TG_OP='INSERT' then
  -- The client supplies a random idempotency key. A repeated identical request
  -- must return its original reference even if the first HTTP response was lost.
  perform pg_advisory_xact_lock(hashtextextended(new.id::text,2027));
  if exists(select 1 from public.autera_bookings where id=new.id) then
   if exists(select 1 from public.autera_bookings b where b.id=new.id and row(b.service_id,b.starts_at,b.customer_name,b.phone,b.car,b.comment,b.consent) is not distinct from row(new.service_id,new.starts_at,new.customer_name,new.phone,new.car,new.comment,new.consent) and b.status in ('booked','confirmed')) then
    return null;
   end if;
   raise exception 'BOOKING_ID_REUSED' using errcode='22023';
  end if;
  local_start:=new.starts_at at time zone 'Europe/Moscow';
  local_today:=(now() at time zone 'Europe/Moscow')::date;
  if new.status!='booked' or new.created_at!=now() then raise exception 'INVALID_BOOKING'; end if;
  if new.starts_at<=now()+interval '30 minutes' or local_start::date>local_today+45 or local_start::date<local_today or extract(hour from local_start) not between 9 and 18 or extract(minute from local_start)!=0 or extract(second from local_start)!=0 then raise exception 'INVALID_TIME' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.phone,2026));
  if (select count(*) from public.autera_bookings where phone=new.phone and status in ('booked','confirmed') and starts_at>now())>=3 then raise exception 'BOOKING_LIMIT' using errcode='P0001'; end if;
  insert into public.autera_slots(starts_at,state) values(new.starts_at,'reserved') on conflict(starts_at) do update set state='reserved' where autera_slots.state='available' returning starts_at into locked_slot;
  if locked_slot is null then raise exception 'SLOT_UNAVAILABLE' using errcode='23505'; end if;
 elsif TG_OP='UPDATE' then
  if not exists(select 1 from public.autera_admins where user_id=auth.uid()) then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  if row(new.id,new.service_id,new.starts_at,new.customer_name,new.phone,new.car,new.comment,new.consent,new.created_at) is distinct from row(old.id,old.service_id,old.starts_at,old.customer_name,old.phone,old.car,old.comment,old.consent,old.created_at) then raise exception 'IMMUTABLE_BOOKING'; end if;
  if not ((old.status='booked' and new.status in ('confirmed','cancelled')) or (old.status='confirmed' and new.status in ('completed','cancelled'))) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if new.status='completed' and new.starts_at>now() then raise exception 'APPOINTMENT_NOT_STARTED'; end if;
  if new.status='cancelled' then
   update public.autera_slots set state='available' where starts_at=old.starts_at and state='reserved';
  end if;
 end if;
 return new;
end;
$$;
