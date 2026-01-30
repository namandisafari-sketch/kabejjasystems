-- UNEB Exam Results System for Uganda
-- Nationwide exam tracking and student result lookup
-- IMPORTANT LEGAL NOTICE:
-- This system is NOT official UNEB software. It's a school management tool.
-- UNEB retains all intellectual property rights to exam results.
-- Schools using this system are responsible for data accuracy and student privacy.
-- This system operates on behalf of schools, not as part of UNEB.

-- Drop existing tables if they exist (clean slate)
drop table if exists exam_access_logs cascade;
drop table if exists exam_result_blocks cascade;
drop table if exists exam_results cascade;
drop table if exists exam_sessions cascade;

-- Table for exam sessions (Years, terms)
create table exam_sessions (
  id uuid default gen_random_uuid() primary key,
  year integer not null,
  level text not null,
  session_name text not null,
  results_released_date timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(year, level, session_name)
);

-- Main exam results table
create table exam_results (
  id uuid default gen_random_uuid() primary key,
  index_number text not null,
  exam_session_id uuid not null references exam_sessions(id) on delete cascade,
  student_name text not null,
  school_name text,
  school_id uuid references tenants(id) on delete set null,
  subjects jsonb not null default '[]'::jsonb,
  total_points integer,
  aggregate_grade text,
  result_status text default 'published',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(index_number, exam_session_id)
);

-- Schools can block access to certain index numbers
create table exam_result_blocks (
  id uuid default gen_random_uuid() primary key,
  exam_result_id uuid not null references exam_results(id) on delete cascade,
  school_id uuid not null references tenants(id) on delete cascade,
  index_number text not null,
  reason text,
  blocked_by uuid references profiles(id) on delete set null,
  blocked_at timestamp with time zone default timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  notes text,
  unique(exam_result_id, school_id)
);

-- Audit log for exam access
create table exam_access_logs (
  id uuid default gen_random_uuid() primary key,
  index_number text not null,
  exam_session_id uuid not null references exam_sessions(id) on delete cascade,
  ip_address text,
  user_agent text,
  access_status text,
  accessed_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table exam_sessions enable row level security;
alter table exam_results enable row level security;
alter table exam_result_blocks enable row level security;
alter table exam_access_logs enable row level security;

-- RLS Policies for exam_sessions
create policy "Anyone can view active exam sessions"
  on exam_sessions
  for select
  using (is_active = true);

create policy "Superadmins can manage exam sessions"
  on exam_sessions
  for all
  using (auth.uid() in (select id from profiles where role = 'superadmin'))
  with check (auth.uid() in (select id from profiles where role = 'superadmin'));

-- RLS Policies for exam_results
create policy "Anyone can view published exam results"
  on exam_results
  for select
  using (result_status = 'published');

create policy "Superadmins can manage all exam results"
  on exam_results
  for all
  using (auth.uid() in (select id from profiles where role = 'superadmin'))
  with check (auth.uid() in (select id from profiles where role = 'superadmin'));

-- RLS Policies for exam_result_blocks
create policy "Schools can block results from their students"
  on exam_result_blocks
  for insert
  with check (
    auth.uid() in (
      select id from profiles 
      where role in ('admin', 'superadmin') 
      and tenant_id = exam_result_blocks.school_id
    )
  );

create policy "Schools can view their own blocks"
  on exam_result_blocks
  for select
  using (
    school_id = (select tenant_id from profiles where id = auth.uid())
    or auth.uid() in (select id from profiles where role = 'superadmin')
  );

create policy "Schools can delete their own blocks"
  on exam_result_blocks
  for delete
  using (
    school_id = (select tenant_id from profiles where id = auth.uid())
    or auth.uid() in (select id from profiles where role = 'superadmin')
  );

-- RLS Policies for exam_access_logs
create policy "Superadmins can view exam access logs"
  on exam_access_logs
  for select
  using (auth.uid() in (select id from profiles where role = 'superadmin'));

-- Create indexes for performance
create index idx_exam_results_index_number on exam_results(index_number);
create index idx_exam_results_session on exam_results(exam_session_id);
create index idx_exam_results_school on exam_results(school_id);
create index idx_exam_results_status on exam_results(result_status);
create index idx_exam_blocks_index on exam_result_blocks(index_number);
create index idx_exam_blocks_expires on exam_result_blocks(expires_at);
create index idx_exam_access_logs_index on exam_access_logs(index_number);
create index idx_exam_access_logs_session on exam_access_logs(exam_session_id);
create index idx_exam_results_lookup on exam_results(index_number, exam_session_id) where result_status = 'published';
