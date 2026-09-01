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
 *   CONTACT         R2 bucket. Persists every footer contact-form submission
 *                   as one JSON object per message.
 */

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  WAITLIST?: KVNamespace;
  CONTACT?: R2Bucket;
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

interface R2Bucket {
  put(key: string, value: string): Promise<unknown>;
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
  sourcePath?: string;
  consentVersion?: string;
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
    // Consent provenance. sourcePath is the page the form was submitted from,
    // consentVersion is the tag on the wording that was shown underneath it
    // (see WAITLIST_CONSENT_VERSION in src/consts.ts). Together these answer
    // "what did this person agree to, and where" without git archaeology.
    sourcePath: (body.sourcePath ?? '').trim().slice(0, 200) || null,
    consentVersion: (body.consentVersion ?? '').trim().slice(0, 60) || null,
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

  if (env.POSTMARK_TOKEN && env.FROM_EMAIL) {
    // Both sends are best-effort and run in parallel. A mail failure must
    // never surface to the person, because the signup is already stored.
    const sends: Promise<unknown>[] = [];

    if (env.NOTIFY_EMAIL) {
      sends.push(sendMail(env, {
        To: env.NOTIFY_EMAIL,
        ReplyTo: record.email,
        Subject: `HaulQ waitlist: ${record.email}`,
        TextBody: [
          `Email: ${record.email}`,
          `MC/DOT: ${record.mcNumber ?? '-'}`,
          `Fleet: ${record.fleetSize ?? '-'}`,
          `Equipment: ${record.equipment ?? '-'}`,
          `Interested in: ${record.interest.length ? record.interest.join(', ') : '-'}`,
          `Country: ${record.country ?? '-'}`,
          `Signed up on: ${record.sourcePath ?? '-'}`,
          `Consent: ${record.consentVersion ?? '-'}`,
          `Received: ${record.receivedAt}`,
        ].join('\n'),
      }));
    }

    sends.push(sendMail(env, {
      To: record.email,
      Subject: 'You are on the HaulQ waitlist',
      TextBody: confirmationBody(record),
    }));

    await Promise.allSettled(sends);
  }

  return json({ ok: true });
}

/* ----------------------------------------------------------------- contact */

interface ContactSubmission {
  name?: string;
  email?: string;
  message?: string;
  company_website?: string;
}

async function handleContact(request: Request, env: Env): Promise<Response> {
  let body: ContactSubmission;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  if (body.company_website) return json({ ok: true });

  const email = (body.email ?? '').trim().toLowerCase();
  const message = (body.message ?? '').trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'Invalid email' }, 400);
  }
  if (!message) {
    return json({ ok: false, error: 'Message required' }, 400);
  }

  const record = {
    name: (body.name ?? '').trim().slice(0, 200) || null,
    email,
    message: message.slice(0, 5000),
    receivedAt: new Date().toISOString(),
    country: request.headers.get('cf-ipcountry') ?? null,
  };

  // Persist first. Everything below is best-effort and must not lose a message.
  if (env.CONTACT) {
    try {
      await env.CONTACT.put(`contact/${record.receivedAt}-${email}.json`, JSON.stringify(record));
    } catch (e) {
      console.error('R2 write failed', e);
    }
  }

  console.log('contact submission', JSON.stringify(record));

  if (env.POSTMARK_TOKEN && env.FROM_EMAIL && env.NOTIFY_EMAIL) {
    try {
      await sendMail(env, {
        To: env.NOTIFY_EMAIL,
        ReplyTo: record.email,
        Subject: `HaulQ contact form: ${record.name ?? record.email}`,
        TextBody: [
          `Name: ${record.name ?? '-'}`,
          `Email: ${record.email}`,
          `Country: ${record.country ?? '-'}`,
          `Received: ${record.receivedAt}`,
          '',
          record.message,
        ].join('\n'),
      });
    } catch { /* non-fatal, already persisted above */ }
  }

  return json({ ok: true });
}

const PRODUCT_LABELS: Record<string, string> = {
  docs: 'HaulQ Docs',
  pay: 'HaulQ Pay',
  insights: 'HaulQ Insights',
  verify: 'HaulQ Verify',
  track: 'HaulQ Track',
  routes: 'HaulQ Routes',
  dispatch: 'HaulQ Dispatch',
  driver: 'HaulQ Driver App',
};

function confirmationBody(record: { interest: string[] }): string {
  const picked = record.interest
    .map((slug) => PRODUCT_LABELS[slug])
    .filter(Boolean);

  const lines = [
    'Thanks for signing up.',
    '',
    'You are on the HaulQ waitlist. We will email you as each product goes live,',
    'starting with HaulQ Docs and HaulQ Pay.',
  ];

  if (picked.length) {
    lines.push(
      '',
      'You told us you are interested in:',
      ...picked.map((name) => `  - ${name}`),
    );
  }

  lines.push(
    '',
    'In the meantime, the load profit calculator is free to use, no account needed:',
    'https://haulq.ai/tools/profit-calculator',
    '',
    'Reply to this email if you want to talk to us directly.',
    '',
    'HaulQ',
    'Run every load. Know every dollar.',
  );

  return lines.join('\n');
}

async function sendMail(
  env: Env,
  msg: { To: string; Subject: string; TextBody: string; ReplyTo?: string },
): Promise<void> {
  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'X-Postmark-Server-Token': env.POSTMARK_TOKEN!,
      },
      body: JSON.stringify({
        From: env.FROM_EMAIL,
        ReplyTo: env.NOTIFY_EMAIL ?? env.FROM_EMAIL,
        MessageStream: 'outbound',
        ...msg,
      }),
    });
    if (!res.ok) console.error('postmark', res.status, await res.text());
  } catch (e) {
    console.error('postmark send failed', e);
  }
}

/* -------------------------------------------------------------------- root */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/waitlist') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
      return handleWaitlist(request, env);
    }

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
      return handleContact(request, env);
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
