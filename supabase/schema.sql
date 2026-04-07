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
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.questions add column if not exists answered_at timestamptz;
alter table public.voice_posts add column if not exists category text;

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

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(regexp_replace(split_part(coalesce(new.email, 'voiq'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'), 12) || '_' || left(new.id::text, 6),
    split_part(coalesce(new.email, 'Voiq user'), '@', 1)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, username, display_name)
select
  u.id,
  left(regexp_replace(split_part(coalesce(u.email, 'voiq'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'), 12) || '_' || left(u.id::text, 6),
  split_part(coalesce(u.email, 'Voiq user'), '@', 1)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.voice_posts enable row level security;
alter table public.reactions enable row level security;
alter table public.follows enable row level security;

drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
on public.profiles
for select
to authenticated, anon
using (true);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "questions are viewable by recipient" on public.questions;
create policy "questions are viewable by recipient"
on public.questions
for select
to authenticated
using (auth.uid() = recipient_id);

drop policy if exists "anon and authenticated can insert questions" on public.questions;
create policy "anon and authenticated can insert questions"
on public.questions
for insert
to authenticated, anon
with check (true);

drop policy if exists "voice posts are public while active" on public.voice_posts;
create policy "voice posts are public while active"
on public.voice_posts
for select
to authenticated, anon
using (expires_at is null or expires_at > now());

drop policy if exists "authors can insert their own voice posts" on public.voice_posts;
create policy "authors can insert their own voice posts"
on public.voice_posts
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "authors can update their own voice posts" on public.voice_posts;
create policy "authors can update their own voice posts"
on public.voice_posts
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "reactions are public" on public.reactions;
create policy "reactions are public"
on public.reactions
for select
to authenticated, anon
using (true);

drop policy if exists "anyone can insert reactions" on public.reactions;
create policy "anyone can insert reactions"
on public.reactions
for insert
to authenticated, anon
with check (true);

drop policy if exists "follows are viewable by everyone" on public.follows;
create policy "follows are viewable by everyone"
on public.follows
for select
to authenticated, anon
using (true);

drop policy if exists "users can follow from their own account" on public.follows;
create policy "users can follow from their own account"
on public.follows
for insert
to authenticated
with check (auth.uid() = follower_id);

drop policy if exists "users can unfollow from their own account" on public.follows;
create policy "users can unfollow from their own account"
on public.follows
for delete
to authenticated
using (auth.uid() = follower_id);
