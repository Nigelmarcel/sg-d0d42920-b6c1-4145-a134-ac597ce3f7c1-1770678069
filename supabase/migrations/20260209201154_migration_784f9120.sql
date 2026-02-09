-- Add is_online column to profiles table for simpler online status management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;