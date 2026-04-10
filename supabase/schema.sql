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
  onboarding_completed boolean not null default false,
  agent_preferences jsonb default '{}',
  timezone text default 'America/New_York',
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

-- Google OAuth tokens (per-user Gmail + Calendar access)
create table if not exists google_tokens (
  user_id uuid primary key references users(id) on delete cascade,
  tokens jsonb not null,
  updated_at timestamptz default now()
);

-- Notifications (proactive agent output)
create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade not null,
  type text not null check (type in ('daily_briefing', 'follow_up_nudge', 'meeting_prep', 'restock_alert')),
  title text not null,
  content text not null,
  channel text not null default 'web' check (channel in ('web', 'slack', 'both')),
  delivered boolean not null default false,
  read boolean not null default false,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on notifications(user_id, created_at desc);
create index if not exists idx_notifications_undelivered on notifications(delivered, channel);

-- Slack connections
create table if not exists slack_connections (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade,
  slack_team_id text not null,
  slack_team_name text,
  slack_user_id text not null,
  slack_channel_id text,
  access_token text not null,
  bot_token text not null,
  scopes text,
  created_at timestamptz default now(),
  unique(slack_team_id, slack_user_id)
);

create index if not exists idx_slack_user on slack_connections(user_id);

-- Agent run audit log
create table if not exists agent_runs (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade not null,
  job_type text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  result jsonb,
  error text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Contacts (CRM)
create table if not exists contacts (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  company text,
  role text,
  email text,
  phone text,
  stage text not null default 'lead' check (stage in ('lead', 'pitched', 'negotiating', 'closed', 'lost')),
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_contacts_user on contacts(user_id, stage);

-- Interaction log (CRM)
create table if not exists interactions (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  type text not null check (type in ('email', 'meeting', 'call', 'note')),
  summary text not null,
  created_at timestamptz default now()
);

create index if not exists idx_interactions_contact on interactions(contact_id, created_at desc);

-- Email templates
create table if not exists email_templates (
  id bigint generated always as identity primary key,
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  category text not null default 'general' check (category in ('buyer_outreach', 'follow_up', 'order_confirmation', 'meeting', 'general')),
  subject text not null default '',
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_email_templates_user on email_templates(user_id, category);
