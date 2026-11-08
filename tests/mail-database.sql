-- Email and mail-only worker integration tests. All data and config roll back.
begin;
select set_config('autera.test.admin',(select user_id::text from public.autera_admins limit 1),true);
set local role anon;
do $$ begin
 begin
  perform public.autera_book('a07e1000-0000-4000-8000-000000000001','diagnostics',((now() at time zone 'Europe/Moscow')::date+43+time '10:00') at time zone 'Europe/Moscow','Email QA','+70000000901','Demo','MAIL_QA',true);
  raise exception 'MISSING_EMAIL_ACCEPTED';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.autera_book('a07e1000-0000-4000-8000-000000000001','diagnostics',((now() at time zone 'Europe/Moscow')::date+43+time '10:00') at time zone 'Europe/Moscow','Email QA','+70000000901','Demo','MAIL_QA',true,E'qa@example.com\r\nBcc: victim@example.com');
  raise exception 'HEADER_INJECTION_ACCEPTED';
 exception when invalid_parameter_value then null; end;
end $$;
select public.autera_book('a07e1000-0000-4000-8000-000000000001','diagnostics',((now() at time zone 'Europe/Moscow')::date+43+time '10:00') at time zone 'Europe/Moscow','Email QA','+70000000901','Demo','MAIL_QA',true,'QA@Example.com');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('autera.test.admin'),true);
do $$ declare owner_email text; begin
 if (select email from public.autera_bookings where id='a07e1000-0000-4000-8000-000000000001')!='qa@example.com' then raise exception 'EMAIL_NOT_NORMALIZED'; end if;
 begin
  update public.autera_bookings set email='changed@example.com' where id='a07e1000-0000-4000-8000-000000000001';
  raise exception 'EMAIL_EDITABLE';
 exception when insufficient_privilege then null; end;
end $$;
select public.autera_mail_configure(repeat('a',64),'autera-test-sender@gmail.com');
update public.autera_bookings set status='confirmed' where id='a07e1000-0000-4000-8000-000000000001';
reset role;
do $$ begin
 if (select count(*) from public.autera_mail_queue where booking_id='a07e1000-0000-4000-8000-000000000001' and event='confirmed' and state='pending')!=1 then raise exception 'CONFIRMATION_NOT_QUEUED'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare job jsonb; result boolean; begin
 if public.autera_mail_status() ? 'sender' then raise exception 'PUBLIC_SENDER_LEAK'; end if;
 begin
  perform public.autera_mail_next(repeat('b',64),'autera-test-sender@gmail.com',10);
  raise exception 'BAD_TOKEN_ACCEPTED';
 exception when insufficient_privilege then null; end;
 begin
  perform public.autera_mail_next(repeat('a',64),'wrong-sender@gmail.com',10);
  raise exception 'WRONG_ACCOUNT_ACCEPTED';
 exception when insufficient_privilege then null; end;
 if public.autera_mail_next(repeat('a',64),'autera-test-sender@gmail.com',0) is not null then raise exception 'QUOTA_IGNORED'; end if;
 job:=public.autera_mail_next(repeat('a',64),'autera-test-sender@gmail.com',10);
 if job->>'email'!='qa@example.com' or job->>'event'!='confirmed' then raise exception 'WRONG_WORKER_PAYLOAD'; end if;
 if job ? 'phone' or job ? 'car' or job ? 'comment' then raise exception 'EXCESS_WORKER_DATA'; end if;
 result:=public.autera_mail_finish(repeat('a',64),'autera-test-sender@gmail.com',(job->>'id')::uuid,(job->>'lease_id')::uuid,'sent',null);
 if not result then raise exception 'ACK_FAILED'; end if;
 if not public.autera_mail_finish(repeat('a',64),'autera-test-sender@gmail.com',(job->>'id')::uuid,(job->>'lease_id')::uuid,'sent',null) then raise exception 'ACK_NOT_IDEMPOTENT'; end if;
 if public.autera_mail_next(repeat('a',64),'autera-test-sender@gmail.com',10) is not null then raise exception 'DUPLICATE_DELIVERY'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('autera.test.admin'),true);
update public.autera_bookings set status='cancelled' where id='a07e1000-0000-4000-8000-000000000001';
set local role anon;
select public.autera_book('a07e1000-0000-4000-8000-000000000002','diagnostics',((now() at time zone 'Europe/Moscow')::date+43+time '11:00') at time zone 'Europe/Moscow','Email QA','+70000000902','Demo','MAIL_QA',true,'qa@example.com');
select public.autera_book('a07e1000-0000-4000-8000-000000000003','diagnostics',((now() at time zone 'Europe/Moscow')::date+43+time '12:00') at time zone 'Europe/Moscow','Email QA','+70000000903','Demo','MAIL_QA',true,'qa@example.com');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('autera.test.admin'),true);
update public.autera_bookings set status='cancelled' where id='a07e1000-0000-4000-8000-000000000002';
update public.autera_bookings set status='confirmed' where id='a07e1000-0000-4000-8000-000000000003';
update public.autera_bookings set status='cancelled' where id='a07e1000-0000-4000-8000-000000000003';
reset role;
do $$ begin
 if not exists(select 1 from public.autera_mail_queue where booking_id='a07e1000-0000-4000-8000-000000000001' and event='cancelled') then raise exception 'CANCELLATION_NOT_QUEUED'; end if;
 if not exists(select 1 from public.autera_mail_queue where booking_id='a07e1000-0000-4000-8000-000000000002' and event='declined') then raise exception 'DECLINE_NOT_QUEUED'; end if;
 if not exists(select 1 from public.autera_mail_queue where booking_id='a07e1000-0000-4000-8000-000000000003' and event='confirmed' and state='superseded') then raise exception 'STALE_CONFIRMATION_NOT_SUPPRESSED'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a07e0000-0000-4000-8000-999999999999',true);
do $$ begin
 if (select count(*) from public.autera_mail_queue)>0 then raise exception 'NONADMIN_QUEUE_LEAK'; end if;
 begin
  perform public.autera_mail_configure(repeat('c',64),'intruder@gmail.com');
  raise exception 'NONADMIN_CONFIGURED_MAIL';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
