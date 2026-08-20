CREATE TABLE IF NOT EXISTS public.mc_cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mc_cron_tokens TO service_role;
ALTER TABLE public.mc_cron_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.mc_cron_tokens (name) VALUES ('digest') ON CONFLICT (name) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('mission-control-daily-digest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mission-control-daily-digest');

SELECT cron.schedule(
  'mission-control-daily-digest',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mission-control-001.lovable.app/api/public/digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (SELECT token FROM public.mc_cron_tokens WHERE name = 'digest')
    ),
    body := '{}'::jsonb
  );
  $$
);