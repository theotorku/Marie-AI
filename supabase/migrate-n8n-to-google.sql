-- Migration: Restore Google OAuth tokens table
-- Run this in the Supabase SQL Editor if you previously migrated to n8n

-- 1. Create the google_tokens table (if it doesn't exist)
create table if not exists google_tokens (
  user_id uuid primary key references users(id) on delete cascade,
  tokens jsonb not null,
  updated_at timestamptz default now()
);

-- 2. Drop the n8n_connections table (if it exists)
drop table if exists n8n_connections;
