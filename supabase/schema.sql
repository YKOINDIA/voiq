create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  is_premium boolean not null default false,
  badge text,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  sender_name text,
  is_anonymous boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  storage_path text not null unique,
  duration_seconds integer not null check (duration_seconds between 1 and 60),
  voice_mode text not null default 'original',
  transcript text,
  share_video_path text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  voice_post_id uuid not null references public.voice_posts (id) on delete cascade,
  sound_type text not null check (sound_type in ('clap', 'laugh', 'replay')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.voice_posts enable row level security;
alter table public.reactions enable row level security;

create policy "profiles are viewable by everyone"
on public.profiles
for select
to authenticated, anon
using (true);

create policy "users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "questions are viewable by recipient"
on public.questions
for select
to authenticated
using (auth.uid() = recipient_id);

create policy "anon and authenticated can insert questions"
on public.questions
for insert
to authenticated, anon
with check (true);

create policy "voice posts are public while active"
on public.voice_posts
for select
to authenticated, anon
using (expires_at is null or expires_at > now());

create policy "authors can insert their own voice posts"
on public.voice_posts
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "authors can update their own voice posts"
on public.voice_posts
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "reactions are public"
on public.reactions
for select
to authenticated, anon
using (true);

create policy "anyone can insert reactions"
on public.reactions
for insert
to authenticated, anon
with check (true);
