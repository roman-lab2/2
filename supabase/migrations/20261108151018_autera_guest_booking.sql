-- Guest booking, one intake bay, hourly slots in Europe/Moscow.
-- Legacy tables are preserved; no existing customer records are removed.
create schema if not exists autera_private;
revoke all on schema autera_private from public, anon, authenticated;

create table public.autera_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.autera_admins enable row level security;
revoke all on public.autera_admins from anon, authenticated;
grant select on public.autera_admins to authenticated;
create policy "Admin can check own membership" on public.autera_admins for select to authenticated using (user_id=(select auth.uid()));

create table public.autera_slots (
 starts_at timestamptz primary key,
 state text not null check(state in ('available','reserved','blocked')),
 constraint autera_slot_on_hour check(date_part('minute',starts_at at time zone 'Europe/Moscow')=0 and date_part('second',starts_at at time zone 'Europe/Moscow')=0 and date_part('hour',starts_at at time zone 'Europe/Moscow') between 9 and 18)
);
alter table public.autera_slots enable row level security;
revoke all on public.autera_slots from anon, authenticated;
grant select on public.autera_slots to anon, authenticated;
grant insert(starts_at,state), update(state) on public.autera_slots to authenticated;
create policy "Public schedule contains no personal information" on public.autera_slots for select to anon, authenticated using(true);
create policy "Admins close unreserved slots" on public.autera_slots for insert to authenticated with check(state in ('available','blocked') and starts_at>now() and starts_at < now()+interval '47 days' and exists(select 1 from public.autera_admins where user_id=(select auth.uid())));
create policy "Admins update unreserved slots" on public.autera_slots for update to authenticated using(state!='reserved' and exists(select 1 from public.autera_admins where user_id=(select auth.uid()))) with check(state in ('available','blocked') and starts_at>now() and starts_at<now()+interval '47 days' and exists(select 1 from public.autera_admins where user_id=(select auth.uid())));

create table public.autera_bookings (
 id uuid primary key,
 reference text generated always as ('AU-'||upper(left(replace(id::text,'-',''),10))) stored,
 service_id text not null check(service_id in ('diagnostics','maintenance','brakes','suspension','climate','engine')),
 starts_at timestamptz not null references public.autera_slots(starts_at),
 customer_name text not null check(length(trim(customer_name)) between 2 and 80),
 phone text not null check(phone ~ '^\+7[0-9]{10}$'),
 car text not null check(length(trim(car)) between 2 and 120),
 comment text not null default '' check(length(comment)<=600),
 consent boolean not null check(consent=true),
 status text not null default 'booked' check(status in ('booked','confirmed','completed','cancelled')),
 created_at timestamptz not null default now()
);
create unique index autera_one_booking_per_slot on public.autera_bookings(starts_at) where status!='cancelled';
create index autera_active_phone on public.autera_bookings(phone,starts_at) where status in ('booked','confirmed');
alter table public.autera_bookings enable row level security;
revoke all on public.autera_bookings from anon, authenticated;
grant insert(id,service_id,starts_at,customer_name,phone,car,comment,consent) on public.autera_bookings to anon,authenticated;
grant select on public.autera_bookings to authenticated;
grant update(status) on public.autera_bookings to authenticated;
create policy "Guest may submit only new bookings" on public.autera_bookings for insert to anon,authenticated with check(status='booked' and consent=true);
create policy "Only assigned admin reads customer data" on public.autera_bookings for select to authenticated using(exists(select 1 from public.autera_admins where user_id=(select auth.uid())));
create policy "Only assigned admin changes status" on public.autera_bookings for update to authenticated using(exists(select 1 from public.autera_admins where user_id=(select auth.uid()))) with check(exists(select 1 from public.autera_admins where user_id=(select auth.uid())));

-- Private trigger needs narrowly scoped elevated access to reserve a public slot
-- and count bookings without ever granting anonymous SELECT on personal data.
-- It cannot be called through the public Data API.
create function autera_private.guard_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare locked_slot timestamptz; local_start timestamp; local_today date;
begin
 if TG_OP='INSERT' then
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
revoke all on function autera_private.guard_booking() from public,anon,authenticated;
create trigger autera_guard_booking before insert or update on public.autera_bookings for each row execute function autera_private.guard_booking();

-- SECURITY INVOKER: uses exactly the guest's column grants and INSERT policy.
-- No RETURNING/SELECT of private rows, only echoes the caller's random UUID.
create function public.autera_book(p_id uuid,p_service text,p_starts_at timestamptz,p_name text,p_phone text,p_car text,p_comment text,p_consent boolean) returns uuid language plpgsql security invoker set search_path='' as $$
begin
 insert into public.autera_bookings(id,service_id,starts_at,customer_name,phone,car,comment,consent) values(p_id,p_service,p_starts_at,trim(p_name),p_phone,trim(p_car),trim(p_comment),p_consent);
 return p_id;
end;
$$;
revoke all on function public.autera_book(uuid,text,timestamptz,text,text,text,text,boolean) from public;
grant execute on function public.autera_book(uuid,text,timestamptz,text,text,text,text,boolean) to anon, authenticated;
