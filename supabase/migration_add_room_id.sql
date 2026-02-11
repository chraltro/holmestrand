-- Add room_id column to channels (links channel to a room in the SVG floor plan)
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS room_id text;
