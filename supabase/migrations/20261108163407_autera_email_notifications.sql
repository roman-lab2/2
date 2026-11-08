-- Email is required on new bookings; historical rows are preserved with NULL.
alter table public.autera_bookings add column email text;
alter table public.autera_bookings add constraint autera_email_valid check(email is null or (length(email)<=254 and email ~ '^[A-Za-z0-9._%+!-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,63}$'));
grant insert(email) on public.autera_bookings to anon, authenticated;
create or replace function autera_private.guard_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare locked_slot timestamptz; local_start timestamp; local_today date;
begin
 if TG_OP='INSERT' then
  new.email:=lower(trim(new.email));
  if new.email is null or length(new.email)>254 or new.email !~ '^[A-Za-z0-9._%+!-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,63}$' then raise exception 'EMAIL_REQUIRED' using errcode='22023'; end if;
  -- The client supplies a random idempotency key. A repeated identical request
  -- must return its original reference even if the first HTTP response was lost.
  perform pg_advisory_xact_lock(hashtextextended(new.id::text,2027));
  if exists(select 1 from public.autera_bookings where id=new.id) then
   if exists(select 1 from public.autera_bookings b where b.id=new.id and row(b.service_id,b.starts_at,b.customer_name,b.phone,b.car,b.comment,b.consent,b.email) is not distinct from row(new.service_id,new.starts_at,new.customer_name,new.phone,new.car,new.comment,new.consent,new.email) and b.status in ('booked','confirmed')) then
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
  if row(new.id,new.service_id,new.starts_at,new.customer_name,new.phone,new.car,new.comment,new.consent,new.created_at,new.email) is distinct from row(old.id,old.service_id,old.starts_at,old.customer_name,old.phone,old.car,old.comment,old.consent,old.created_at,old.email) then raise exception 'IMMUTABLE_BOOKING'; end if;
  if not ((old.status='booked' and new.status in ('confirmed','cancelled')) or (old.status='confirmed' and new.status in ('completed','cancelled'))) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if new.status='completed' and new.starts_at>now() then raise exception 'APPOINTMENT_NOT_STARTED'; end if;
  if new.status='cancelled' then
   update public.autera_slots set state='available' where starts_at=old.starts_at and state='reserved';
  end if;
 end if;
 return new;
end;
$$;

-- Keep the old signature fail-closed for stale browser tabs.
create or replace function public.autera_book(p_id uuid,p_service text,p_starts_at timestamptz,p_name text,p_phone text,p_car text,p_comment text,p_consent boolean) returns uuid language plpgsql security invoker set search_path='' as $$ begin raise exception 'EMAIL_REQUIRED' using errcode='22023'; end; $$;
create function public.autera_book(p_id uuid,p_service text,p_starts_at timestamptz,p_name text,p_phone text,p_car text,p_comment text,p_consent boolean,p_email text) returns uuid language plpgsql security invoker set search_path='' as $$
begin
 insert into public.autera_bookings(id,service_id,starts_at,customer_name,phone,car,comment,consent,email) values(p_id,p_service,p_starts_at,trim(p_name),p_phone,trim(p_car),trim(p_comment),p_consent,lower(trim(p_email)));
 return p_id;
end; $$;
revoke all on function public.autera_book(uuid,text,timestamptz,text,text,text,text,boolean,text) from public;
grant execute on function public.autera_book(uuid,text,timestamptz,text,text,text,text,boolean,text) to anon, authenticated;

create table autera_private.mail_settings (
 singleton boolean primary key default true check(singleton),
 token_hash text,
 sender_email text,
 enabled boolean not null default false,
 last_poll_at timestamptz,
 remaining_quota integer,
 updated_at timestamptz not null default now()
);
alter table autera_private.mail_settings enable row level security;
revoke all on autera_private.mail_settings from public, anon, authenticated;
insert into autera_private.mail_settings(singleton) values(true);

create table public.autera_mail_queue (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.autera_bookings(id) on delete cascade,
 event text not null check(event in ('confirmed','declined','cancelled')),
 state text not null default 'pending' check(state in ('pending','processing','sent','failed','uncertain','superseded')),
 attempts integer not null default 0,
 last_error text,
 lease_id uuid,
 claimed_at timestamptz,
 available_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 unique(booking_id,event)
);
alter table public.autera_mail_queue enable row level security;
revoke all on public.autera_mail_queue from public,anon,authenticated;
grant select(id,booking_id,event,state,attempts,last_error,created_at,sent_at) on public.autera_mail_queue to authenticated;
create policy "Only admin reads delivery states" on public.autera_mail_queue for select to authenticated using(exists(select 1 from public.autera_admins where user_id=(select auth.uid())));
create index autera_mail_pending on public.autera_mail_queue(available_at,created_at) where state in ('pending','failed');

create function autera_private.queue_booking_mail() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status=old.status then return new; end if;
 if new.status='cancelled' then
  update public.autera_mail_queue set state='superseded' where booking_id=new.id and event='confirmed' and state in ('pending','failed');
 end if;
 if new.email is not null and new.status in ('confirmed','cancelled') then
  insert into public.autera_mail_queue(booking_id,event) values(new.id,case when new.status='cancelled' and old.status='booked' then 'declined' else new.status end) on conflict(booking_id,event) do nothing;
 end if;
 return new;
end; $$;
revoke all on function autera_private.queue_booking_mail() from public,anon,authenticated;
create trigger autera_queue_mail after update of status on public.autera_bookings for each row execute function autera_private.queue_booking_mail();

-- Public wrappers are SECURITY INVOKER. Private implementations authenticate
-- either the admin JWT or a high-entropy, mail-only worker capability.
-- No service-role key, user password or refresh token is given to Apps Script.
grant usage on schema autera_private to anon, authenticated;
create function autera_private.configure_mail(p_token text,p_sender text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.autera_admins where user_id=auth.uid()) then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
 if p_token !~ '^[a-f0-9]{64}$' or p_token is null then raise exception 'INVALID_WORKER_TOKEN'; end if;
 p_sender:=lower(trim(p_sender));
 if p_sender is null or p_sender !~ '^[a-z0-9._%+!-]+@gmail[.]com$' then raise exception 'GMAIL_SENDER_REQUIRED'; end if;
 if exists(select 1 from auth.users where id=auth.uid() and lower(email)=p_sender) then raise exception 'SEPARATE_SENDER_ACCOUNT_REQUIRED'; end if;
 update autera_private.mail_settings set token_hash=encode(extensions.digest(p_token,'sha256'),'hex'),sender_email=p_sender,enabled=true,last_poll_at=null,remaining_quota=null,updated_at=now() where singleton;
end; $$;
revoke all on function autera_private.configure_mail(text,text) from public,anon,authenticated;
grant execute on function autera_private.configure_mail(text,text) to authenticated;
create function public.autera_mail_configure(p_token text,p_sender text) returns void language sql security invoker set search_path='' as $$ select autera_private.configure_mail(p_token,p_sender); $$;
revoke all on function public.autera_mail_configure(text,text) from public,anon;
grant execute on function public.autera_mail_configure(text,text) to authenticated;

create function autera_private.mail_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg autera_private.mail_settings; is_admin boolean;
begin
 select * into cfg from autera_private.mail_settings where singleton;
 is_admin:=exists(select 1 from public.autera_admins where user_id=auth.uid());
 return jsonb_build_object('configured',cfg.enabled,'active',coalesce(cfg.enabled and cfg.last_poll_at>now()-interval '5 minutes',false)) || case when is_admin then jsonb_build_object('sender',cfg.sender_email,'last_poll_at',cfg.last_poll_at,'remaining_quota',cfg.remaining_quota) else '{}'::jsonb end;
end; $$;
revoke all on function autera_private.mail_status() from public,anon,authenticated;
grant execute on function autera_private.mail_status() to anon,authenticated;
create function public.autera_mail_status() returns jsonb language sql security invoker set search_path='' as $$ select autera_private.mail_status(); $$;
revoke all on function public.autera_mail_status() from public;
grant execute on function public.autera_mail_status() to anon,authenticated;

create function autera_private.assert_mail_worker(p_token text,p_sender text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_token is null or length(p_token)!=64 or p_sender is null or not exists(select 1 from autera_private.mail_settings where singleton and enabled and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and sender_email=lower(trim(p_sender))) then raise exception 'MAIL_WORKER_UNAUTHORIZED' using errcode='42501'; end if;
end; $$;
revoke all on function autera_private.assert_mail_worker(text,text) from public,anon,authenticated;

create function autera_private.next_mail(p_token text,p_sender text,p_quota integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.autera_mail_queue; booking public.autera_bookings;
begin
 perform autera_private.assert_mail_worker(p_token,p_sender);
 update autera_private.mail_settings set last_poll_at=now(),remaining_quota=greatest(0,least(coalesce(p_quota,0),100)),updated_at=now() where singleton;
 -- Do not silently resend after an interrupted send/ack cycle.
 update public.autera_mail_queue set state='uncertain',last_error='DELIVERY_UNCERTAIN' where state='processing' and claimed_at<now()-interval '15 minutes';
 update public.autera_mail_queue q set state='superseded' from public.autera_bookings b where b.id=q.booking_id and q.state in ('pending','failed') and ((q.event='confirmed' and (b.status!='confirmed' or b.starts_at<now())) or q.created_at<now()-interval '7 days');
 if coalesce(p_quota,0)<=0 then return null; end if;
 select * into job from public.autera_mail_queue where state in ('pending','failed') and attempts<3 and available_at<=now() order by created_at for update skip locked limit 1;
 if not found then return null; end if;
 select * into booking from public.autera_bookings where id=job.booking_id;
 update public.autera_mail_queue set state='processing',attempts=attempts+1,lease_id=gen_random_uuid(),claimed_at=now(),last_error=null where id=job.id returning * into job;
 return jsonb_build_object('id',job.id,'lease_id',job.lease_id,'event',job.event,'email',booking.email,'customer_name',booking.customer_name,'starts_at',booking.starts_at,'service_id',booking.service_id,'reference',booking.reference);
end; $$;
revoke all on function autera_private.next_mail(text,text,integer) from public,anon,authenticated;
grant execute on function autera_private.next_mail(text,text,integer) to anon,authenticated;
create function public.autera_mail_next(p_token text,p_sender text,p_quota integer) returns jsonb language sql security invoker set search_path='' as $$ select autera_private.next_mail(p_token,p_sender,p_quota); $$;
revoke all on function public.autera_mail_next(text,text,integer) from public;
grant execute on function public.autera_mail_next(text,text,integer) to anon,authenticated;

create function autera_private.finish_mail(p_token text,p_sender text,p_id uuid,p_lease uuid,p_result text,p_error text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform autera_private.assert_mail_worker(p_token,p_sender);
 if p_result not in ('sent','failed','uncertain') or p_result is null then raise exception 'INVALID_MAIL_RESULT'; end if;
 if exists(select 1 from public.autera_mail_queue where id=p_id and lease_id=p_lease and state='sent' and p_result='sent') then return true; end if;
 update public.autera_mail_queue set state=p_result,attempts=case when p_error='INVALID_RECIPIENT' then 3 else attempts end,sent_at=case when p_result='sent' then now() else null end,last_error=case when p_result='sent' then null when p_error in ('DAILY_QUOTA','INVALID_RECIPIENT','DELIVERY_UNCERTAIN') then p_error else 'DELIVERY_UNCERTAIN' end,available_at=now()+interval '5 minutes' where id=p_id and lease_id=p_lease and state in ('processing','uncertain');
 return found;
end; $$;
revoke all on function autera_private.finish_mail(text,text,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function autera_private.finish_mail(text,text,uuid,uuid,text,text) to anon,authenticated;
create function public.autera_mail_finish(p_token text,p_sender text,p_id uuid,p_lease uuid,p_result text,p_error text) returns boolean language sql security invoker set search_path='' as $$ select autera_private.finish_mail(p_token,p_sender,p_id,p_lease,p_result,p_error); $$;
revoke all on function public.autera_mail_finish(text,text,uuid,uuid,text,text) from public;
grant execute on function public.autera_mail_finish(text,text,uuid,uuid,text,text) to anon,authenticated;
