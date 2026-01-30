-- Create admin_invitations table for secure admin signup
create table if not exists admin_invitations (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  token text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  expires_at timestamp with time zone not null,
  used boolean default false,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamp with time zone,
  created_by uuid references auth.users(id) on delete set null
);

-- Add RLS policies
alter table admin_invitations enable row level security;

-- Allow superadmins to view and manage invitations
create policy "Superadmins can manage admin invitations"
  on admin_invitations
  for all
  using (
    auth.uid() in (
      select id from profiles where role = 'superadmin'
    )
  )
  with check (
    auth.uid() in (
      select id from profiles where role = 'superadmin'
    )
  );

-- Allow anyone with valid token to view their own invitation
create policy "Users can view their invitation"
  on admin_invitations
  for select
  using (
    token = current_setting('jwt.claims', true)::jsonb->>'token'
  );

-- Create indexes for performance
create index idx_admin_invitations_token on admin_invitations(token);
create index idx_admin_invitations_email on admin_invitations(email);
create index idx_admin_invitations_expires_at on admin_invitations(expires_at);
