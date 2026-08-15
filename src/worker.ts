/**
 * Cloudflare Worker entry for haulq.ai
 *
 * Static assets are served by the ASSETS binding. Anything under /api/ is
 * handled here. This replaces the Pages `functions/` directory, which only
 * works on Cloudflare Pages projects, not Workers.
 *
 * Environment variables (Workers dashboard, Settings -> Variables):
 *   FMCSA_WEBKEY    secret, optional. Enables /api/verify.
 *   POSTMARK_TOKEN  secret, optional. Enables waitlist notification email.
 *   NOTIFY_EMAIL    plain,  optional. Where signups are emailed.
 *   FROM_EMAIL      plain,  optional. A verified Postmark sender.
 *   API_URL         plain,  optional. Forwards signups to the HaulQ API later.
 *
 * Bindings (optional but recommended):
 *   WAITLIST        KV namespace. Persists every signup so none are lost
 *                   before email is configured.
 */

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  WAITLIST?: KVNamespace;
  FMCSA_WEBKEY?: string;
  POSTMARK_TOKEN?: string;
  NOTIFY_EMAIL?: string;
  FROM_EMAIL?: string;
  API_URL?: string;
}

interface KVNamespace {
  put(key: string, value: string): Promise<void>;
  list(opts?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
  get(key: string): Promise<string | null>;
}

const json = (body: unknown, status = 200, cache = false) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': cache ? 'public, max-age=3600' : 'no-store',
    },
  });

/* ------------------------------------------------------------------ verify */

const FMCSA = 'https://mobile.fmcsa.dot.gov/qc/services/carriers';

async function handleVerify(request: Request, env: Env): Promise<Response> {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return json({ found: false, error: 'Missing query' }, 400);
  if (!env.FMCSA_WEBKEY) return json({ found: false, notLive: true }, 503);

  const digits = q.replace(/\D/g, '');
  if (!digits) return json({ found: false });

  const isDocket = /mc|mx|ff/i.test(q) || digits.length <= 6;
  const url = isDocket
    ? `${FMCSA}/docket-number/${digits}?webKey=${env.FMCSA_WEBKEY}`
    : `${FMCSA}/${digits}?webKey=${env.FMCSA_WEBKEY}`;

  let payload: any;
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return json({ found: false, error: `Upstream ${res.status}` }, 502);
    payload = await res.json();
  } catch {
    return json({ found: false, error: 'Upstream unreachable' }, 502);
  }

  const content = payload?.content;
  const record = Array.isArray(content) ? content[0]?.carrier : content?.carrier;
  if (!record) return json({ found: false }, 200, true);

  const status =
    record.allowedToOperate === 'Y' ? 'Authorized' :
    record.allowedToOperate === 'N' ? 'Not authorized' : 'Unknown';

  return json({
    found: true,
    legalName: record.legalName ?? null,
    dbaName: record.dbaName ?? null,
    dotNumber: record.dotNumber ?? null,
    operatingStatus: status,
    entityType: record.carrierOperation?.carrierOperationDesc ?? null,
    powerUnits: record.totalPowerUnits ?? null,
    drivers: record.totalDrivers ?? null,
    safetyRating: record.safetyRating ?? null,
    location: [record.phyCity, record.phyState].filter(Boolean).join(', ') || null,
    fetchedAt: new Date().toISOString(),
    source: 'FMCSA QCMobile',
  }, 200, true);
}

/* ---------------------------------------------------------------- waitlist */

interface Signup {
  email?: string;
  mcNumber?: string;
  fleetSize?: string;
  equipment?: string;
  interest?: string[];
  company_website?: string;
}

async function handleWaitlist(request: Request, env: Env): Promise<Response> {
  let body: Signup;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  if (body.company_website) return json({ ok: true });

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'Invalid email' }, 400);
  }

  const record = {
    email,
    mcNumber: (body.mcNumber ?? '').trim() || null,
    fleetSize: body.fleetSize || null,
    equipment: body.equipment || null,
    interest: Array.isArray(body.interest) ? body.interest.slice(0, 10) : [],
    receivedAt: new Date().toISOString(),
    country: request.headers.get('cf-ipcountry') ?? null,
  };

  // Persist first. Everything below is best-effort and must not lose a signup.
  if (env.WAITLIST) {
    try {
      await env.WAITLIST.put(`signup:${record.receivedAt}:${email}`, JSON.stringify(record));
    } catch (e) {
      console.error('KV write failed', e);
    }
  }

  console.log('waitlist signup', JSON.stringify(record));

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
      `MC/DOT: ${record.mcNumber ?? '-'}`,
      `Fleet: ${record.fleetSize ?? '-'}`,
      `Equipment: ${record.equipment ?? '-'}`,
      `Interested in: ${record.interest.length ? record.interest.join(', ') : '-'}`,
      `Country: ${record.country ?? '-'}`,
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
  }

  return json({ ok: true });
}

/* -------------------------------------------------------------------- root */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/waitlist') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
      return handleWaitlist(request, env);
    }

    if (url.pathname === '/api/verify') {
      if (request.method !== 'GET') return json({ found: false, error: 'Use GET' }, 405);
      return handleVerify(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
