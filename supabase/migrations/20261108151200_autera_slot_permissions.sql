-- PostgREST upsert includes the conflict key in its UPDATE target list.
-- Permit the column, while an invoker trigger makes its value immutable.
grant update(starts_at) on public.autera_slots to authenticated;
create function autera_private.immutable_slot_start() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.starts_at is distinct from old.starts_at then raise exception 'IMMUTABLE_SLOT'; end if;
 return new;
end;
$$;
revoke all on function autera_private.immutable_slot_start() from public,anon,authenticated;
create trigger autera_immutable_slot before update on public.autera_slots for each row execute function autera_private.immutable_slot_start();
-- Legacy client-account RPCs are no longer part of this application.
-- Auth trigger execution remains unaffected by these function-call grants.
revoke execute on function public.cancel_my_appointment(bigint) from public,anon,authenticated;
revoke execute on function public.handle_new_user() from public,anon,authenticated;
