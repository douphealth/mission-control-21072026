-- Harden the legacy snapshot table if it exists.
-- Existing rows without an owner remain inaccessible rather than being guessed
-- into an account. New rows are account-scoped automatically.
DO $$
BEGIN
  IF to_regclass('public.mc_snapshots') IS NOT NULL THEN
    ALTER TABLE public.mc_snapshots
      ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

    ALTER TABLE public.mc_snapshots ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "allow_all_mc" ON public.mc_snapshots;
    DROP POLICY IF EXISTS "Users manage their own snapshots" ON public.mc_snapshots;

    CREATE POLICY "Users manage their own snapshots"
      ON public.mc_snapshots
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.mc_snapshots TO authenticated;
  END IF;
END
$$;
