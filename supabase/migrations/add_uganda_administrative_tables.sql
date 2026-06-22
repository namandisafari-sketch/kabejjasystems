-- Uganda Administrative Geography Tables
-- Data source: github.com/Uganda-Open-Data/kalulu (2020 electoral boundaries)
-- Hierarchy: Region → District → Constituency → Subcounty

-- Drop existing tables if re-running
drop table if exists uganda_subcounties cascade;
drop table if exists uganda_constituencies cascade;
drop table if exists uganda_districts cascade;

-- Districts (147 districts & cities)
create table uganda_districts (
  district_code integer primary key,
  district_name text not null,
  region_code integer not null,
  region_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Constituencies (~353)
create table uganda_constituencies (
  constituency_code integer primary key,
  constituency_name text not null,
  district_code integer not null references uganda_districts(district_code) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index idx_uganda_constituencies_district on uganda_constituencies(district_code);

-- Subcounties (~2000+)
create table uganda_subcounties (
  id uuid default gen_random_uuid() primary key,
  subcounty_code integer not null,
  subcounty_name text not null,
  district_code integer not null references uganda_districts(district_code) on delete cascade,
  constituency_code integer not null references uganda_constituencies(constituency_code) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(subcounty_code, district_code)
);

create index idx_uganda_subcounties_district on uganda_subcounties(district_code);
create index idx_uganda_subcounties_constituency on uganda_subcounties(constituency_code);

-- Enable RLS
alter table uganda_districts enable row level security;
alter table uganda_constituencies enable row level security;
alter table uganda_subcounties enable row level security;

-- Policies: reference data — all authenticated users can read
create policy "Authenticated users can read uganda_districts"
  on uganda_districts for select
  to authenticated
  using (true);

create policy "Authenticated users can read uganda_constituencies"
  on uganda_constituencies for select
  to authenticated
  using (true);

create policy "Authenticated users can read uganda_subcounties"
  on uganda_subcounties for select
  to authenticated
  using (true);

-- Only service_role can write reference data (seeded by scripts)
create policy "Only service role can insert uganda_districts"
  on uganda_districts for insert
  to service_role
  with check (true);

create policy "Only service role can insert uganda_constituencies"
  on uganda_constituencies for insert
  to service_role
  with check (true);

create policy "Only service role can insert uganda_subcounties"
  on uganda_subcounties for insert
  to service_role
  with check (true);
