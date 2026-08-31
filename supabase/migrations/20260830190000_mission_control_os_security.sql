-- Mission Control OS v2 security foundation.
-- Additive only: existing tables are not dropped or rewritten.

CREATE TABLE IF NOT EXISTS public.mc_snapshots_v2 (
  id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS mc_snapshots_v2_user_created_idx
  ON public.mc_snapshots_v2 (user_id, created_at DESC);

ALTER TABLE public.mc_snapshots_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own snapshots v2" ON public.mc_snapshots_v2;
CREATE POLICY "Users manage their own snapshots v2"
  ON public.mc_snapshots_v2
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_snapshots_v2 TO authenticated;
GRANT ALL ON public.mc_snapshots_v2 TO service_role;

-- Generic account-scoped OS record store. The browser remains local-first, but
-- every canonical OS record can be mirrored safely without exposing another
-- account's projects, entities, findings, actions, validations or events.
CREATE TABLE IF NOT EXISTS public.mc_os_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  collection text NOT NULL,
  record_id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, collection, record_id)
);

CREATE INDEX IF NOT EXISTS mc_os_records_user_updated_idx
  ON public.mc_os_records (user_id, updated_at DESC);

ALTER TABLE public.mc_os_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own OS records" ON public.mc_os_records;
CREATE POLICY "Users manage their own OS records"
  ON public.mc_os_records
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_os_records TO authenticated;
GRANT ALL ON public.mc_os_records TO service_role;
