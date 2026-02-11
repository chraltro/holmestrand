-- =============================================
-- Huset Chat App - Supabase Schema
-- =============================================
-- Run this SQL in your Supabase SQL Editor to set up the database.

-- 1. Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  is_admin boolean default false,
  is_approved boolean default false,
  created_at timestamptz default now()
);

-- 2. Channels table
create table public.channels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  emoji text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 3. Messages table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz default now()
);

-- 4. Invite codes table
create table public.invite_codes (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- Row Level Security
-- =============================================

alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.invite_codes enable row level security;

-- Profiles: users can read all profiles, only update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Channels: approved users can read, admins can insert/delete
create policy "Channels are viewable by approved users"
  on public.channels for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_approved = true
    )
  );

create policy "Admins can create channels"
  on public.channels for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update channels"
  on public.channels for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can delete channels"
  on public.channels for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Messages: approved users can read and create
create policy "Messages are viewable by approved users"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_approved = true
    )
  );

create policy "Approved users can send messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_approved = true
    )
  );

-- Invite codes: anyone authenticated can read (to validate),
-- admins can manage
create policy "Authenticated users can read active invite codes"
  on public.invite_codes for select
  using (auth.role() = 'authenticated');

create policy "Admins can create invite codes"
  on public.invite_codes for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update invite codes"
  on public.invite_codes for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can delete invite codes"
  on public.invite_codes for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- =============================================
-- Enable Realtime
-- =============================================

alter publication supabase_realtime add table messages;

-- =============================================
-- Seed default channels
-- =============================================

insert into public.channels (name, slug, emoji) values
  ('Generelt', 'generelt', '💬'),
  ('Kjøkken', 'kjokken', '🍳'),
  ('Stue', 'stue', '🛋️'),
  ('Bad', 'bad', '🛁'),
  ('Hage', 'hage', '🌿'),
  ('Soverom', 'soverom', '🛏️');

-- =============================================
-- Storage bucket for files
-- =============================================
-- NOTE: Create a storage bucket named "files" in the Supabase dashboard
-- with public access. Then add the following storage policies:
--
-- Policy: "Allow authenticated uploads"
--   Operation: INSERT
--   Policy: (auth.role() = 'authenticated')
--
-- Policy: "Allow public reads"
--   Operation: SELECT
--   Policy: true
