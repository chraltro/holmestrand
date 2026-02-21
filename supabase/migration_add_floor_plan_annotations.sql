-- Floor plan measurement annotations
create table if not exists public.floor_plan_annotations (
  id uuid default gen_random_uuid() primary key,
  floor text not null check (floor in ('underetasje', 'stueetasje', 'overetasje', 'ute')),
  x1 real not null,
  y1 real not null,
  x2 real not null,
  y2 real not null,
  label text not null default '',
  color text not null default '#E8A87C',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.floor_plan_annotations enable row level security;

create policy "Annotations are viewable by approved users"
  on public.floor_plan_annotations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.is_approved = true
    )
  );

create policy "Approved users can create annotations"
  on public.floor_plan_annotations for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.is_approved = true
    )
  );

create policy "Users can delete their own annotations or admins can delete any"
  on public.floor_plan_annotations for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.is_admin = true
    )
  );

alter publication supabase_realtime add table floor_plan_annotations;
