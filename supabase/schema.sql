-- =========================================================
-- LaCaleta — schema + RLS + triggers + RPC
-- Run this entire file in Supabase SQL editor
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  balance    numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('income','expense')),
  color      text,
  icon       text,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount      numeric(14,2) not null check (amount > 0),
  type        text not null check (type in ('income','expense')),
  description text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tx_user_date on public.transactions (user_id, date desc);
create index if not exists idx_tx_category  on public.transactions (category_id);
create index if not exists idx_tx_account   on public.transactions (account_id);

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profiles self select" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self select" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "accounts owner all" on public.accounts;
create policy "accounts owner all" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories owner all" on public.categories;
create policy "categories owner all" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions owner all" on public.transactions;
create policy "transactions owner all" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------

-- Force user_id = auth.uid() on insert, disallow reassignment
create or replace function public.set_user_id()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(new.user_id, auth.uid());
  elsif tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_accounts_user   on public.accounts;
drop trigger if exists trg_categories_user on public.categories;
drop trigger if exists trg_tx_user         on public.transactions;

create trigger trg_accounts_user
  before insert or update on public.accounts
  for each row execute function public.set_user_id();

create trigger trg_categories_user
  before insert or update on public.categories
  for each row execute function public.set_user_id();

create trigger trg_tx_user
  before insert or update on public.transactions
  for each row execute function public.set_user_id();

-- Auto-update account.balance
create or replace function public.apply_tx_balance()
returns trigger language plpgsql security definer as $$
declare
  v_delta numeric(14,2);
begin
  if tg_op = 'INSERT' then
    v_delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.accounts set balance = balance + v_delta where id = new.account_id;
    return new;
  elsif tg_op = 'DELETE' then
    v_delta := case when old.type = 'income' then -old.amount else old.amount end;
    update public.accounts set balance = balance + v_delta where id = old.account_id;
    return old;
  elsif tg_op = 'UPDATE' then
    -- revert old
    v_delta := case when old.type = 'income' then -old.amount else old.amount end;
    update public.accounts set balance = balance + v_delta where id = old.account_id;
    -- apply new
    v_delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.accounts set balance = balance + v_delta where id = new.account_id;
    return new;
  end if;
  return null;
end $$;

drop trigger if exists trg_tx_balance on public.transactions;
create trigger trg_tx_balance
  after insert or update or delete on public.transactions
  for each row execute function public.apply_tx_balance();

-- Auto-create profile + default account + default categories on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email);

  insert into public.accounts (user_id, name, balance)
  values (new.id, 'Efectivo', 0);

  insert into public.categories (user_id, name, type, color) values
    (new.id, 'Comida',        'expense', '#f43f5e'),
    (new.id, 'Transporte',    'expense', '#6366f1'),
    (new.id, 'Hogar',         'expense', '#f59e0b'),
    (new.id, 'Entretenimiento','expense', '#a855f7'),
    (new.id, 'Salud',         'expense', '#0ea5e9'),
    (new.id, 'Sueldo',        'income',  '#10b981'),
    (new.id, 'Otros',         'income',  '#14b8a6');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- RPC FUNCTIONS
-- ---------------------------------------------------------

-- Total balance across all user accounts
create or replace function public.total_balance()
returns numeric language sql stable security definer as $$
  select coalesce(sum(balance), 0)::numeric
  from public.accounts
  where user_id = auth.uid();
$$;

-- Monthly income/expense/balance summary
create or replace function public.month_summary(p_year int, p_month int)
returns table(income numeric, expense numeric, balance numeric)
language sql stable security definer as $$
  select
    coalesce(sum(case when type = 'income'  then amount end), 0) as income,
    coalesce(sum(case when type = 'expense' then amount end), 0) as expense,
    coalesce(sum(case when type = 'income'  then amount else -amount end), 0) as balance
  from public.transactions
  where user_id = auth.uid()
    and extract(year  from date) = p_year
    and extract(month from date) = p_month;
$$;

-- Expenses grouped by category for a given month
create or replace function public.expenses_by_category(p_year int, p_month int)
returns table(category_id uuid, name text, color text, total numeric)
language sql stable security definer as $$
  select
    c.id as category_id,
    coalesce(c.name, 'Sin categoría') as name,
    c.color,
    coalesce(sum(t.amount), 0)::numeric as total
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  where t.user_id = auth.uid()
    and t.type = 'expense'
    and extract(year  from t.date) = p_year
    and extract(month from t.date) = p_month
  group by c.id, c.name, c.color
  order by total desc;
$$;

-- Monthly evolution for the last N months (YYYY-MM buckets)
create or replace function public.monthly_evolution(p_months int default 6)
returns table(month text, income numeric, expense numeric)
language sql stable security definer as $$
  with months as (
    select to_char(date_trunc('month', current_date) - (i || ' month')::interval, 'YYYY-MM') as month
    from generate_series(0, greatest(p_months,1) - 1) as i
  )
  select
    m.month,
    coalesce(sum(case when t.type = 'income'  then t.amount end), 0) as income,
    coalesce(sum(case when t.type = 'expense' then t.amount end), 0) as expense
  from months m
  left join public.transactions t
    on t.user_id = auth.uid()
   and to_char(t.date, 'YYYY-MM') = m.month
  group by m.month
  order by m.month;
$$;

grant execute on function public.total_balance()                          to authenticated;
grant execute on function public.month_summary(int, int)                  to authenticated;
grant execute on function public.expenses_by_category(int, int)           to authenticated;
grant execute on function public.monthly_evolution(int)                   to authenticated;
