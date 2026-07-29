CREATE TABLE public.mc_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  collection TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, collection, record_id)
);

CREATE INDEX mc_records_user_updated_idx ON public.mc_records (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_records TO authenticated;
GRANT ALL ON public.mc_records TO service_role;

ALTER TABLE public.mc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own records"
  ON public.mc_records FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mc_records_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER mc_records_touch_updated_at
  BEFORE UPDATE ON public.mc_records
  FOR EACH ROW EXECUTE FUNCTION public.mc_records_touch();