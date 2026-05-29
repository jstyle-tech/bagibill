-- ════════════════════════════════════════════════════════════════
--  BAGI BILL — Supabase schema
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Model: 1A (link-to-join), 2i (lightweight name-based, no real auth),
--         3A (real-time sync). NOT SECURE — fine for a friend group.
-- ════════════════════════════════════════════════════════════════

-- People who have ever used the app (lightweight, no password).
-- A person is created the first time they type their name on a device.
create table if not exists people (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  bank        text default '',
  created_at  timestamptz default now()
);

-- One row per bill / receipt.
create table if not exists bills (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,          -- short share code, e.g. '3TH0014'
  title         text default 'Split Bill',
  primary_id    uuid references people(id),    -- who paid (the collector)
  service_pct   numeric default 5,
  tax_pct       numeric default 10,
  round_to_1k   boolean default true,
  created_at    timestamptz default now()
);

-- Which people are participating in a given bill.
create table if not exists bill_members (
  bill_id   uuid references bills(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  primary key (bill_id, person_id)
);

-- Line items on a bill.
create table if not exists items (
  id        uuid primary key default gen_random_uuid(),
  bill_id   uuid references bills(id) on delete cascade,
  name      text not null,
  price     numeric not null,
  created_at timestamptz default now()
);

-- Which people share which item (many-to-many → even split).
create table if not exists item_assignees (
  item_id   uuid references items(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  primary key (item_id, person_id)
);

-- ── Real-time: expose these tables to Supabase Realtime ──────────
alter publication supabase_realtime add table bills;
alter publication supabase_realtime add table bill_members;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table item_assignees;
alter publication supabase_realtime add table people;

-- ── Row Level Security ───────────────────────────────────────────
-- Because there is NO real auth (choice 2i), we run OPEN policies:
-- anyone with the anon key can read/write. This is the deliberate
-- trade-off you accepted. Do NOT store anything sensitive beyond a
-- bank account line. If you later want security, switch to choice 2ii
-- (Supabase Auth) and tighten these policies.
alter table people          enable row level security;
alter table bills           enable row level security;
alter table bill_members    enable row level security;
alter table items           enable row level security;
alter table item_assignees  enable row level security;

create policy "open people"   on people         for all using (true) with check (true);
create policy "open bills"    on bills          for all using (true) with check (true);
create policy "open bmembers" on bill_members   for all using (true) with check (true);
create policy "open items"    on items          for all using (true) with check (true);
create policy "open iassign"  on item_assignees for all using (true) with check (true);
