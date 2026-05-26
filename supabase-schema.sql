-- ============================================================
-- BillMe — Complete Supabase Schema
-- Run this entire script in Supabase SQL Editor (one go)
-- ============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1a. User Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  business_name text,
  logo_url text,
  email text,
  phone text,
  address text,
  tax_number text,
  currency text default 'INR',
  country text default 'India',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1b. Clients
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text,
  phone text,
  address text,
  tax_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1c. Documents (invoices & estimates)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  client_id uuid references clients on delete set null,
  doc_type text not null check (doc_type in ('invoice', 'estimate')),
  doc_number text not null,
  issue_date date not null,
  due_date date,
  status text not null default 'draft' check (status in ('draft','sent','paid','unpaid','overdue','declined')),
  currency text default 'INR',
  subtotal numeric(12,2) default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  terms text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1d. Document line items
create table if not exists document_items (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents on delete cascade not null,
  description text not null,
  quantity numeric(10,2) not null,
  unit_price numeric(12,2) not null,
  tax_rate numeric(5,2),
  amount numeric(12,2) not null
);

-- 1e. Expenses
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null,
  amount numeric(12,2) not null,
  expense_date date not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1f. Profile change history (audit trail)
create table if not exists profile_history (
  id bigint generated always as identity primary key,
  profile_id uuid references profiles on delete cascade not null,
  changed_by uuid references auth.users on delete set null,
  changed_at timestamptz default now(),
  changed_fields jsonb not null,
  previous_values jsonb not null,
  new_values jsonb not null
);

-- ============================================================
-- 2. INDEXES (performance)
-- ============================================================

create index if not exists idx_clients_user_id on clients(user_id);
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_documents_client_id on documents(client_id);
create index if not exists idx_documents_doc_number on documents(user_id, doc_number);
create index if not exists idx_document_items_document_id on document_items(document_id);
create index if not exists idx_expenses_user_id on expenses(user_id);
create index if not exists idx_profile_history_profile_id on profile_history(profile_id);
create index if not exists idx_profile_history_changed_at on profile_history(changed_at desc);

-- ============================================================
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_profiles_updated_at') then
    create trigger set_profiles_updated_at before update on profiles
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_clients_updated_at') then
    create trigger set_clients_updated_at before update on clients
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_documents_updated_at') then
    create trigger set_documents_updated_at before update on documents
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_expenses_updated_at') then
    create trigger set_expenses_updated_at before update on expenses
      for each row execute function update_updated_at_column();
  end if;
end $$;

-- ============================================================
-- 4. PROFILE HISTORY TRIGGER (auto-log changes)
-- ============================================================

create or replace function log_profile_changes()
returns trigger as $$
declare
  changed jsonb := '{}'::jsonb;
  prev jsonb := '{}'::jsonb;
  newvals jsonb := '{}'::jsonb;
  key text;
begin
  for key in (
    select k from jsonb_object_keys(to_jsonb(new)) as k
    where k <> 'id' and k <> 'created_at' and k <> 'updated_at'
  ) loop
    if (to_jsonb(old) ->> key) is distinct from (to_jsonb(new) ->> key) then
      changed := changed || jsonb_build_object(key, true);
      prev := prev || jsonb_build_object(key, to_jsonb(old) ->> key);
      newvals := newvals || jsonb_build_object(key, to_jsonb(new) ->> key);
    end if;
  end loop;

  if changed <> '{}'::jsonb then
    insert into profile_history (profile_id, changed_by, changed_fields, previous_values, new_values)
    values (new.id, auth.uid(), changed, prev, newvals);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists log_profile_changes_trigger on profiles;
create trigger log_profile_changes_trigger
  after update on profiles
  for each row execute function log_profile_changes();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table documents enable row level security;
alter table document_items enable row level security;
alter table expenses enable row level security;
alter table profile_history enable row level security;

-- Profiles: each user manages their own
drop policy if exists "Users manage own profile" on profiles;
create policy "Users manage own profile" on profiles
  for all using (auth.uid() = id);

-- Clients
drop policy if exists "Users manage own clients" on clients;
create policy "Users manage own clients" on clients
  for all using (auth.uid() = user_id);

-- Documents
drop policy if exists "Users manage own documents" on documents;
create policy "Users manage own documents" on documents
  for all using (auth.uid() = user_id);

-- Document items (via parent document)
drop policy if exists "Users manage own document items" on document_items;
create policy "Users manage own document items" on document_items
  for all using (
    exists (
      select 1 from documents
      where documents.id = document_items.document_id
      and documents.user_id = auth.uid()
    )
  );

-- Expenses
drop policy if exists "Users manage own expenses" on expenses;
create policy "Users manage own expenses" on expenses
  for all using (auth.uid() = user_id);

-- Profile history: user can read their own, admins only for insert (trigger handles it)
drop policy if exists "Users view own profile history" on profile_history;
create policy "Users view own profile history" on profile_history
  for select using (auth.uid() = profile_id);

drop policy if exists "Trigger inserts profile history" on profile_history;
create policy "Trigger inserts profile history" on profile_history
  for insert with check (true);

-- ============================================================
-- 6. STORAGE — Logo / Photo bucket
-- ============================================================

-- Create the storage bucket for logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

-- Storage RLS: authenticated users can CRUD their own folder
drop policy if exists "Users upload own logos" on storage.objects;
create policy "Users upload own logos" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own logos" on storage.objects;
create policy "Users update own logos" on storage.objects
  for update using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own logos" on storage.objects;
create policy "Users delete own logos" on storage.objects
  for delete using (
    bucket_id = 'logos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can view logos" on storage.objects;
create policy "Anyone can view logos" on storage.objects
  for select using (bucket_id = 'logos');

-- ============================================================
-- 7. HELPER: get_profile_history function
-- ============================================================

create or replace function get_profile_history(p_profile_id uuid)
returns table (
  id bigint,
  changed_at timestamptz,
  changed_fields jsonb,
  previous_values jsonb,
  new_values jsonb
) language sql security definer as $$
  select ph.id, ph.changed_at, ph.changed_fields, ph.previous_values, ph.new_values
  from profile_history ph
  where ph.profile_id = p_profile_id
  order by ph.changed_at desc;
$$;
