/**
 * Cloudflare Pages Function: POST /api/waitlist
 *
 * Works with zero backend. Set these in the Pages dashboard:
 *   POSTMARK_TOKEN  (encrypted)  server token from Postmark
 *   NOTIFY_EMAIL                 where signups land, e.g. hello@haulq.ai
 *   FROM_EMAIL                   a verified Postmark sender, e.g. no-reply@haulq.ai
 *   API_URL         (optional)   once the HaulQ API exists, signups also POST there
 *
 * With none of them set it still returns 200 and logs, so the form never
 * looks broken during the first deploy.
 */
interface Env {
  POSTMARK_TOKEN?: string;
  NOTIFY_EMAIL?: string;
  FROM_EMAIL?: string;
  API_URL?: string;
}

interface Signup {
  email: string;
  mcNumber?: string;
  fleetSize?: string;
  equipment?: string;
  interest?: string[];
  company_website?: string; // honeypot
}

const ok = () => new Response(JSON.stringify({ ok: true }), {
  status: 200, headers: { 'content-type': 'application/json' },
});
const bad = (msg: string, status = 400) => new Response(JSON.stringify({ ok: false, error: msg }), {
  status, headers: { 'content-type': 'application/json' },
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Signup;
  try { body = await request.json(); } catch { return bad('Invalid JSON'); }

  // Honeypot: silently accept so bots do not learn anything.
  if (body.company_website) return ok();

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Invalid email');

  const record = {
    email,
    mcNumber: (body.mcNumber ?? '').trim() || null,
    fleetSize: body.fleetSize || null,
    equipment: body.equipment || null,
    interest: Array.isArray(body.interest) ? body.interest.slice(0, 10) : [],
    receivedAt: new Date().toISOString(),
    country: request.headers.get('cf-ipcountry') ?? null,
  };

  // Forward to the real API once it exists. Never block the user on it.
  if (env.API_URL) {
    try {
      await fetch(`${env.API_URL.replace(/\/$/, '')}/waitlist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch { /* non-fatal */ }
  }

  if (env.POSTMARK_TOKEN && env.NOTIFY_EMAIL && env.FROM_EMAIL) {
    const lines = [
      `Email: ${record.email}`,
      `MC/DOT: ${record.mcNumber ?? '—'}`,
      `Fleet: ${record.fleetSize ?? '—'}`,
      `Equipment: ${record.equipment ?? '—'}`,
      `Interested in: ${record.interest.length ? record.interest.join(', ') : '—'}`,
      `Country: ${record.country ?? '—'}`,
      `Received: ${record.receivedAt}`,
    ].join('\n');
    try {
      await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'X-Postmark-Server-Token': env.POSTMARK_TOKEN,
        },
        body: JSON.stringify({
          From: env.FROM_EMAIL,
          To: env.NOTIFY_EMAIL,
          ReplyTo: record.email,
          Subject: `HaulQ waitlist: ${record.email}`,
          TextBody: lines,
          MessageStream: 'outbound',
        }),
      });
    } catch { /* non-fatal */ }
  } else {
    console.log('waitlist signup (email not configured)', JSON.stringify(record));
  }

  return ok();
};
