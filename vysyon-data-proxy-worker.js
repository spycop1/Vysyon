// Vysyon Data Proxy for Cloudflare Workers
// Deploy optional: this solves browser CORS blocks for GitHub Pages/PWA price feeds.
// Endpoints:
//   GET  /health
//   GET  /fetch?url=<encoded target URL>
//   POST /openai  (forwards to https://api.openai.com/v1/responses)

const ALLOWED_HOSTS = new Set([
  "query1.finance.yahoo.com",
  "stooq.com",
  "publicreportinghub.cftc.gov",
  "www.alphavantage.co"
]);

function corsHeaders(request, env = {}) {
  const origin = request.headers.get("Origin") || "*";
  const allowedOrigin = env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin === "*" ? origin : allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, request, env, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "vysyon-data-proxy", time: new Date().toISOString() }, request, env);
    }

    if (url.pathname === "/fetch") {
      if (request.method !== "GET") return json({ ok: false, error: "GET only" }, request, env, 405);
      const target = url.searchParams.get("url") || "";
      let targetUrl;
      try { targetUrl = new URL(target); } catch (_) { return json({ ok: false, error: "Invalid target URL" }, request, env, 400); }
      if (targetUrl.protocol !== "https:") return json({ ok: false, error: "HTTPS targets only" }, request, env, 400);
      if (!ALLOWED_HOSTS.has(targetUrl.host)) return json({ ok: false, error: "Host not allowed", host: targetUrl.host }, request, env, 403);

      const upstream = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 VysyonDataProxy/1.0",
          "Accept": "application/json,text/csv,text/plain,*/*"
        },
        cf: { cacheTtl: targetUrl.host.includes("yahoo") || targetUrl.host.includes("stooq") ? 300 : 60, cacheEverything: false }
      });

      const headers = new Headers(corsHeaders(request, env));
      const ct = upstream.headers.get("Content-Type") || "text/plain; charset=utf-8";
      headers.set("Content-Type", ct);
      headers.set("Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
    }

    if (url.pathname === "/openai") {
      if (request.method !== "POST") return json({ ok: false, error: "POST only" }, request, env, 405);
      const auth = request.headers.get("Authorization") || (env.OPENAI_API_KEY ? "Bearer " + env.OPENAI_API_KEY : "");
      if (!auth) return json({ ok: false, error: "Missing Authorization header or OPENAI_API_KEY secret" }, request, env, 401);
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: await request.text()
      });
      const headers = new Headers(corsHeaders(request, env));
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json; charset=utf-8");
      headers.set("Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
    }

    return json({ ok: false, error: "Not found" }, request, env, 404);
  }
};
