-- Migration: Add emoji column to channels
-- Run these in your Supabase SQL Editor

ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS emoji text;

CREATE POLICY "Admins can update channels"
  ON public.channels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.is_admin = true
    )
  );

UPDATE public.channels SET emoji = '💬' WHERE slug = 'generelt';
UPDATE public.channels SET emoji = '🍳' WHERE slug = 'kjokken';
UPDATE public.channels SET emoji = '🛋️' WHERE slug = 'stue';
UPDATE public.channels SET emoji = '🛁' WHERE slug = 'bad';
UPDATE public.channels SET emoji = '🌿' WHERE slug = 'hage';
UPDATE public.channels SET emoji = '🛏️' WHERE slug = 'soverom';
