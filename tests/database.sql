-- Run against the configured demo database in SQL Editor or supabase db query.
-- Every test fixture is rolled back. No customer data is returned.
begin;
select set_config('autera.test.admin',(select user_id::text from public.autera_admins limit 1),true);
set local role anon;
select public.autera_book('a07e0000-0000-4000-8000-000000000001','diagnostics',((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow','Демо проверка','+70000000421','Демо авто','AUTERA_QA',true,'qa@example.com');
-- Retrying the same HTTP payload must not create a second booking.
select public.autera_book('a07e0000-0000-4000-8000-000000000001','diagnostics',((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow','Демо проверка','+70000000421','Демо авто','AUTERA_QA',true,'qa@example.com');
reset role;
do $$ begin
 if (select count(*) from public.autera_bookings where id='a07e0000-0000-4000-8000-000000000001')!=1 then raise exception 'BOOKING_NOT_SAVED'; end if;
 if exists(select 1 from public.autera_slots where starts_at=((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow' and state!='reserved') then raise exception 'SLOT_NOT_RESERVED'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('autera.test.admin'),true);
do $$ begin
 if (select count(*) from public.autera_bookings where id='a07e0000-0000-4000-8000-000000000001')!=1 then raise exception 'ADMIN_READ_FAILED'; end if;
end $$;
update public.autera_bookings set status='confirmed' where id='a07e0000-0000-4000-8000-000000000001';
update public.autera_bookings set status='cancelled' where id='a07e0000-0000-4000-8000-000000000001';
insert into public.autera_slots(starts_at,state) values(((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow','blocked') on conflict(starts_at) do update set starts_at=excluded.starts_at,state=excluded.state;
do $$ begin
 if (select state from public.autera_slots where starts_at=((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow')!='blocked' then raise exception 'ADMIN_BLOCK_FAILED'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform public.autera_book('a07e0000-0000-4000-8000-000000000002','diagnostics',((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow','Демо проверка','+70000000422','Демо авто','AUTERA_QA',true,'qa@example.com');
  raise exception 'BLOCKED_SLOT_WAS_BOOKED';
 exception when unique_violation then null;
 end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('autera.test.admin'),true);
update public.autera_slots set state='available' where starts_at=((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow';
set local role anon;
select public.autera_book('a07e0000-0000-4000-8000-000000000003','maintenance',((now() at time zone 'Europe/Moscow')::date+42+time '10:00') at time zone 'Europe/Moscow','Демо проверка','+70000000423','Демо авто','AUTERA_QA',true,'qa@example.com');
set local role authenticated;
-- An unrelated signed-in user cannot read or change any new booking.
select set_config('request.jwt.claim.sub','a07e0000-0000-4000-8000-999999999999',true);
do $$ begin
 if (select count(*) from public.autera_bookings)>0 then raise exception 'NONADMIN_DATA_LEAK'; end if;
 if (select count(*) from public.autera_admins)>0 then raise exception 'NONADMIN_MEMBERSHIP_LEAK'; end if;
end $$;
update public.autera_bookings set status='cancelled' where id='a07e0000-0000-4000-8000-000000000003';
reset role;
do $$ begin
 if (select status from public.autera_bookings where id='a07e0000-0000-4000-8000-000000000003')!='booked' then raise exception 'NONADMIN_CHANGED_BOOKING'; end if;
end $$;
rollback;
