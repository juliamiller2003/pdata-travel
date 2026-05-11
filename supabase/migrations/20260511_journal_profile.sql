-- Add journal_profile column to store AI-extracted travel preference insights
alter table public.user_settings
  add column if not exists journal_profile text;
