/**
 * Cloudflare Pages Function: GET /api/verify?q=MC123456
 *
 * Proxies FMCSA QCMobile so the webKey never reaches the browser.
 * Required env var (Pages dashboard, encrypted): FMCSA_WEBKEY
 *
 * Returns 503 with { found:false, notLive:true } when no key is configured,
 * which the front end renders as "not live yet". Deploy the site first, add
 * the key when it arrives, no rebuild needed.
 */
interface Env { FMCSA_WEBKEY?: string }

const BASE = 'https://mobile.fmcsa.dot.gov/qc/services/carriers';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return json({ found: false, error: 'Missing query' }, 400);
  if (!env.FMCSA_WEBKEY) return json({ found: false, notLive: true }, 503);

  const digits = q.replace(/\D/g, '');
  if (!digits) return json({ found: false }, 200);

  // "MC" prefix, or 6 digits or fewer, is treated as a docket number.
  const isDocket = /mc|mx|ff/i.test(q) || digits.length <= 6;
  const url = isDocket
    ? `${BASE}/docket-number/${digits}?webKey=${env.FMCSA_WEBKEY}`
    : `${BASE}/${digits}?webKey=${env.FMCSA_WEBKEY}`;

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
  if (!record) return json({ found: false });

  const status =
    record.allowedToOperate === 'Y' ? 'Authorized' :
    record.allowedToOperate === 'N' ? 'Not authorized' : 'Unknown';

  return json({
    found: true,
    legalName: record.legalName ?? null,
    dbaName: record.dbaName ?? null,
    dotNumber: record.dotNumber ?? null,
    operatingStatus: status,
    statusCode: record.statusCode ?? null,
    entityType: record.carrierOperation?.carrierOperationDesc ?? null,
    powerUnits: record.totalPowerUnits ?? null,
    drivers: record.totalDrivers ?? null,
    safetyRating: record.safetyRating ?? null,
    location: [record.phyCity, record.phyState].filter(Boolean).join(', ') || null,
    fetchedAt: new Date().toISOString(),
    source: 'FMCSA QCMobile',
  });
};
