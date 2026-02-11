-- Add floor, room_id, and floor plan coordinate columns to channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS floor text CHECK (floor IN ('underetasje', 'stueetasje', 'overetasje', 'ute'));
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS room_id text;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS floor_plan_x real;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS floor_plan_y real;

-- Floor plan images table (one per floor)
CREATE TABLE IF NOT EXISTS public.floor_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  floor text NOT NULL UNIQUE CHECK (floor IN ('underetasje', 'stueetasje', 'overetasje', 'ute')),
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS for floor_plans
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'floor_plans' AND policyname = 'Floor plans are viewable by approved users') THEN
    CREATE POLICY "Floor plans are viewable by approved users"
      ON public.floor_plans FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_approved = true));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'floor_plans' AND policyname = 'Admins can manage floor plans') THEN
    CREATE POLICY "Admins can manage floor plans"
      ON public.floor_plans FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
  END IF;
END $$;
