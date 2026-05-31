-- Run this in the Supabase SQL Editor to create the return_requests table.

create table if not exists return_requests (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null,
  email       text not null,
  reason      text not null,
  details     text,
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected','refunded')),
  admin_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_return_requests_updated_at on return_requests;
create trigger set_return_requests_updated_at
  before update on return_requests
  for each row execute function update_updated_at_column();

-- Row-level security (public insert, admin read/update via service role)
alter table return_requests enable row level security;

-- Allow anyone to insert (submit a return request)
create policy "Anyone can submit a return request"
  on return_requests for insert
  with check (true);

-- Only service-role / admin backend can read/update
-- (backend uses supabase service role key, which bypasses RLS)
