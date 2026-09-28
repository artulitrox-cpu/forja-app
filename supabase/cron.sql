-- Forja: llama a la función send-reminders cada 15 minutos.
-- Requisitos: extensión pg_cron activada, función send-reminders desplegada con "Verify JWT" desactivado.
-- Ejecutar una vez en Supabase > SQL Editor.
create extension if not exists pg_net;

select cron.schedule(
  'forja-send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://cctbebzsroxjhtlaraws.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Para comprobar que se ejecuta:  select * from cron.job_run_details order by start_time desc limit 5;
-- Para quitarlo:                   select cron.unschedule('forja-send-reminders');
