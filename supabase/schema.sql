-- Marie AI database schema
-- Run this in the Supabase SQL Editor to set up tables

-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  tier text not null default 'free' check (tier in ('free', 'professional')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

-- Chat messages (server-side persistence)
create table if not exists messages (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_messages_user on messages(user_id, created_at desc);

-- Tasks (server-side persistence)
create table if not exists tasks (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade not null,
  text text not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  done boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_tasks_user on tasks(user_id);

-- Google OAuth tokens
create table if not exists google_tokens (
  user_id uuid primary key references users(id) on delete cascade,
  tokens jsonb not null,
  updated_at timestamptz default now()
);

-- If upgrading an existing database, run:
-- alter table users add column if not exists tier text not null default 'free' check (tier in ('free', 'professional'));
-- alter table users add column if not exists stripe_customer_id text;
-- alter table users add column if not exists stripe_subscription_id text;
