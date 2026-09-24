-- Unread counts for the Messages inbox (Customer UI: "unread counts lead
-- the row"). A row per person per booking says when they last opened that
-- conversation; anything the other party sent after it is unread. Writes
-- go through mark_messages_read() so nobody can mark someone else's
-- conversation, and the counts through unread_message_counts() so RLS on
-- booking_messages doesn't need to be re-derived client-side.

create table if not exists booking_message_reads (
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

alter table booking_message_reads enable row level security;

create policy "booking_message_reads_select" on booking_message_reads
  for select using (auth.uid() = user_id);

create or replace function public.mark_messages_read(target_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (
    select 1 from bookings b
    where b.id = target_booking_id
      and (b.customer_id = auth.uid() or b.barber_id = auth.uid())
  ) then
    return;
  end if;
  insert into booking_message_reads (booking_id, user_id, read_at)
  values (target_booking_id, auth.uid(), now())
  on conflict (booking_id, user_id) do update set read_at = excluded.read_at;
end;
$$;

create or replace function public.unread_message_counts()
returns table(booking_id uuid, unread bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.booking_id, count(*)::bigint as unread
  from booking_messages m
  join bookings b on b.id = m.booking_id
  left join booking_message_reads r
    on r.booking_id = m.booking_id and r.user_id = auth.uid()
  where (b.customer_id = auth.uid() or b.barber_id = auth.uid())
    and m.sender_id <> auth.uid()
    and m.created_at > coalesce(r.read_at, '-infinity'::timestamptz)
  group by m.booking_id;
$$;

grant execute on function public.mark_messages_read(uuid) to authenticated;
grant execute on function public.unread_message_counts() to authenticated;
