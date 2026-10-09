// Private reader for Keeping Fit. The public page only sends visits.
// This worker reads them back with an API token that never ships in the app.
const ALLOWED = new Set([
  'https://keeping-fit.salvinorinab.workers.dev',
  'https://salvinorin95.github.io',
  'http://127.0.0.1:8765',
  'http://localhost:8765'
]);

const QUERY = `query Rum($accountTag: String!, $since: Time!, $until: Time!, $siteTag: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { datetime_geq: $since, datetime_leq: $until, siteTag: $siteTag, bot: 0 }) {
        count
        sum { visits }
      }
      days: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [date_ASC], filter: { datetime_geq: $since, datetime_leq: $until, siteTag: $siteTag, bot: 0 }) {
        count
        sum { visits }
        dimensions { date }
      }
      countries: rumPageloadEventsAdaptiveGroups(limit: 12, orderBy: [count_DESC], filter: { datetime_geq: $since, datetime_leq: $until, siteTag: $siteTag, bot: 0 }) {
        count
        sum { visits }
        dimensions { countryName }
      }
      devices: rumPageloadEventsAdaptiveGroups(limit: 6, orderBy: [count_DESC], filter: { datetime_geq: $since, datetime_leq: $until, siteTag: $siteTag, bot: 0 }) {
        count
        sum { visits }
        dimensions { deviceType }
      }
      paths: rumPageloadEventsAdaptiveGroups(limit: 8, orderBy: [count_DESC], filter: { datetime_geq: $since, datetime_leq: $until, siteTag: $siteTag, bot: 0 }) {
        count
        sum { visits }
        dimensions { requestPath }
      }
      referers: rumPageloadEventsAdaptiveGroups(limit: 8, orderBy: [count_DESC], filter: { datetime_geq: $since, datetime_leq: $until, siteTag: $siteTag, bot: 0 }) {
        count
        sum { visits }
        dimensions { refererHost }
      }
    }
  }
}`;

let accessToken = null;

async function cloudflareToken(env, force) {
  if (accessToken && !force) return accessToken;
  if (!force && env.CF_API_TOKEN) {
    accessToken = env.CF_API_TOKEN;
    return accessToken;
  }
  if (!env.CF_REFRESH_TOKEN) throw new Error('no refresh');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.CF_REFRESH_TOKEN,
    client_id: '54d11594-84e4-41aa-b438-e81b8fa78ee7'
  });
  const res = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error('refresh failed');
  accessToken = data.access_token;
  return accessToken;
}

function json(body, status, origin) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type, x-admin-key'
  };
  if (origin) headers['access-control-allow-origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = ALLOWED.has(origin);
    if (req.method === 'OPTIONS') {
      if (!allowed) return json({ ok: false, error: 'origin' }, 403, '');
      return new Response('', {
        status: 200,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'content-type, x-admin-key',
          'access-control-max-age': '86400',
          'cache-control': 'no-store'
        }
      });
    }
    if (!allowed) return json({ ok: false, error: 'origin' }, 403, '');
    if ((req.headers.get('X-Admin-Key') || '') !== (env.ADMIN_KEY || '')) {
      return json({ ok: false, error: 'unauthorized' }, 401, origin);
    }
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 30));
    const until = new Date();
    const since = new Date(until.getTime() - (days - 1) * 86400000);
    since.setUTCHours(0, 0, 0, 0);

    const variables = {
      accountTag: env.ACCOUNT_TAG,
      siteTag: env.SITE_TAG,
      since: since.toISOString(),
      until: until.toISOString()
    };
    let bearer;
    try { bearer = await cloudflareToken(env, false); }
    catch (e) { return json({ ok: false, error: 'missing token' }, 500, origin); }
    let res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables })
    });
    let payload = await res.json().catch(() => null);
    const authFailed = res.status === 401 || (payload && payload.errors && payload.errors.some(e => /auth|token/i.test(e.message || '')));
    if (authFailed && env.CF_REFRESH_TOKEN) {
      try { bearer = await cloudflareToken(env, true); }
      catch (e) { return json({ ok: false, error: 'cloudflare' }, 502, origin); }
      res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: { authorization: `Bearer ${bearer}`, 'content-type': 'application/json' },
        body: JSON.stringify({ query: QUERY, variables })
      });
      payload = await res.json().catch(() => null);
    }
    if (!res.ok || !payload || payload.errors) {
      return json({ ok: false, error: 'cloudflare' }, 502, origin);
    }
    const account = payload.data && payload.data.viewer && payload.data.viewer.accounts && payload.data.viewer.accounts[0];
    if (!account) return json({ ok: false, error: 'empty' }, 502, origin);

    const row = (list) => (list || []).map((item) => ({
      views: item.count || 0,
      visits: (item.sum && item.sum.visits) || 0,
      ...item.dimensions
    }));
    const total = (account.total && account.total[0]) || { count: 0, sum: { visits: 0 } };
    return json({
      ok: true,
      days,
      since: since.toISOString().slice(0, 10),
      until: until.toISOString().slice(0, 10),
      views: total.count || 0,
      visits: (total.sum && total.sum.visits) || 0,
      byDay: row(account.days),
      countries: row(account.countries),
      devices: row(account.devices),
      paths: row(account.paths),
      referers: row(account.referers)
    }, 200, origin);
  }
};
