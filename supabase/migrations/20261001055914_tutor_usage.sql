create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.tutor_usage_daily (
  day date not null,
  bucket text not null,
  used integer not null default 0 check (used >= 0),
  recent timestamptz[] not null default '{}',
  primary key (day, bucket)
);
alter table private.tutor_usage_daily enable row level security;
revoke all on private.tutor_usage_daily from public, anon, authenticated;
grant select, insert, update, delete on private.tutor_usage_daily to service_role;

-- Only the verified server can call this. Every reservation locks global first,
-- then user, serializing both counters in one transaction across all instances.
create or replace function public.tutor_usage(p_uid uuid, p_anonymous boolean, p_reserve boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  today date := (statement_timestamp() at time zone 'Asia/Jakarta')::date;
  moment timestamptz := statement_timestamp();
  reset_at timestamptz := ((today + 1)::timestamp at time zone 'Asia/Jakarta');
  user_key text := 'user:' || p_uid::text;
  user_limit integer := case when p_anonymous then 10 else 30 end;
  all_used integer;
  user_used integer;
  recent_calls timestamptz[];
  allowed boolean := true;
  reason text := null;
begin
  if p_uid is null or p_anonymous is null then raise exception 'Invalid identity'; end if;
  insert into private.tutor_usage_daily(day,bucket) values(today,'global') on conflict do nothing;
  select used into all_used from private.tutor_usage_daily where day=today and bucket='global' for update;
  insert into private.tutor_usage_daily(day,bucket) values(today,user_key) on conflict do nothing;
  select used, recent into user_used,recent_calls from private.tutor_usage_daily where day=today and bucket=user_key for update;
  select coalesce(array_agg(t),'{}'::timestamptz[]) into recent_calls from unnest(recent_calls) as t where t > moment - interval '1 minute';
  if p_reserve then
    if all_used >= 300 or user_used >= user_limit then allowed := false; reason := 'quota';
    elsif cardinality(recent_calls) >= 3 then allowed := false; reason := 'burst';
    else
      all_used := all_used + 1; user_used := user_used + 1;
      update private.tutor_usage_daily set used=all_used where day=today and bucket='global';
      update private.tutor_usage_daily set used=user_used,recent=array_append(recent_calls,moment) where day=today and bucket=user_key;
    end if;
  end if;
  return jsonb_build_object('allowed',allowed,'code',reason,'usage',jsonb_build_object(
    'used',user_used,'limit',user_limit,'globalUsed',all_used,'globalLimit',300,
    'remaining',greatest(0,least(user_limit-user_used,300-all_used)), 'resetsAt',reset_at));
end;
$$;
revoke all on function public.tutor_usage(uuid,boolean,boolean) from public, anon, authenticated;
grant execute on function public.tutor_usage(uuid,boolean,boolean) to service_role;
