// Forja: envía los avisos pendientes (push_reminders) a las suscripciones de cada usuario.
// Se ejecuta cada 15 minutos con Supabase Cron. Secretos necesarios (Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los pone Supabase)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(
  "https://artulitrox-cpu.github.io/forja-app/",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async () => {
  const now = Date.now();
  // Avisos que ya tocan, de como mucho 6 horas de antigüedad (los más viejos se descartan sin enviar).
  const { data: due, error } = await sb.from("push_reminders").select("*")
    .eq("sent", false).lte("at", new Date(now).toISOString()).limit(500);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0, stale = 0, gone = 0;
  const byUser = new Map<string, typeof due>();
  for (const r of due ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

  for (const [userId, rems] of byUser) {
    const { data: subs } = await sb.from("push_subscriptions").select("*").eq("user_id", userId);
    for (const r of rems) {
      if (now - new Date(r.at).getTime() < 6 * 3600e3) {
        for (const s of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: r.title, body: r.body, tag: r.tag, url: "./" }),
              { TTL: 3600 },
            );
            sent++;
          } catch (e) {
            // Suscripción caducada o revocada: se borra.
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) { await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint); gone++; }
          }
        }
      } else stale++;
      await sb.from("push_reminders").update({ sent: true }).eq("id", r.id);
    }
  }
  return new Response(JSON.stringify({ due: due?.length ?? 0, sent, stale, gone }), { headers: { "Content-Type": "application/json" } });
});
