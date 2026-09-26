-- Migration: add must_change_password to user_profiles
-- 2026-09-26

alter table public.user_profiles
  add column if not exists must_change_password boolean not null default false;
