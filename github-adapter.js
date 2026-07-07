(() => {
  "use strict";

  const STORE_KEY = "vysyon_proxy_url";
  const nativeFetch = window.fetch.bind(window);
  const blockedGetHosts = new Set([
    "query1.finance.yahoo.com",
    "stooq.com"
  ]);
  const ownProxyAllowedHosts = new Set([
    "query1.finance.yahoo.com",
    "stooq.com",
    "publicreportinghub.cftc.gov",
    "www.alphavantage.co",
    "api.openai.com"
  ]);

  function normalizeProxyUrl(value) {
    const raw = String(value || "").trim().replace(/\/+$/, "");
    if (!raw) return "";
    if (!/^https:\/\//i.test(raw)) return "";
    return raw;
  }

  function currentProxyUrl() {
    return normalizeProxyUrl(localStorage.getItem(STORE_KEY));
  }

  function inputToUrl(input) {
    try {
      if (typeof input === "string") return input;
      if (input && typeof input.url === "string") return input.url;
    } catch (_) {}
    return "";
  }

  function methodOf(init) {
    return String(init?.method || "GET").toUpperCase();
  }

  function getHost(url) {
    try { return new URL(url).host; } catch (_) { return ""; }
  }

  function getAllOriginsTarget(url) {
    try {
      const u = new URL(url);
      if (u.host !== "api.allorigins.win") return "";
      return u.searchParams.get("url") || "";
    } catch (_) { return ""; }
  }

  function canUseOwnProxy(targetUrl) {
    const host = getHost(targetUrl);
    return ownProxyAllowedHosts.has(host);
  }

  function canUsePublicProxy(targetUrl, init) {
    const host = getHost(targetUrl);
    return methodOf(init) === "GET" && blockedGetHosts.has(host);
  }

  async function fetchViaOwnProxy(targetUrl, init = {}) {
    const base = currentProxyUrl();
    if (!base) throw new Error("No Vysyon proxy URL configured.");
    const host = getHost(targetUrl);
    if (!canUseOwnProxy(targetUrl)) throw new Error("Host not allowed for Vysyon proxy: " + host);

    if (host === "api.openai.com") {
      return nativeFetch(base + "/openai", {
        method: methodOf(init),
        headers: init.headers || {},
        body: init.body,
        cache: "no-store"
      });
    }

    return nativeFetch(base + "/fetch?url=" + encodeURIComponent(targetUrl), {
      method: "GET",
      cache: "no-store"
    });
  }

  async function fetchViaPublicProxy(targetUrl, init = {}) {
    if (!canUsePublicProxy(targetUrl, init)) throw new Error("Public proxy not allowed for this request.");
    const candidates = [
      "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(targetUrl),
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(targetUrl)
    ];
    let lastErr;
    for (const url of candidates) {
      try {
        const res = await nativeFetch(url, { cache: "no-store" });
        if (res.ok) return res;
        lastErr = new Error("Public proxy HTTP " + res.status);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No public proxy worked.");
  }

  window.fetch = async function patchedFetch(input, init = {}) {
    const url = inputToUrl(input);
    if (!url || !/^https?:\/\//i.test(url)) return nativeFetch(input, init);

    const targetFromAllOrigins = getAllOriginsTarget(url);
    const realTarget = targetFromAllOrigins || url;
    const hasOwnProxy = !!currentProxyUrl();
    const host = getHost(realTarget);

    // With an own proxy configured, route known browser-problem hosts directly through it.
    if (hasOwnProxy && canUseOwnProxy(realTarget) && (blockedGetHosts.has(host) || targetFromAllOrigins)) {
      try { return await fetchViaOwnProxy(realTarget, init); } catch (_) {}
    }

    try {
      const res = await nativeFetch(input, init);
      if (res && res.ok) return res;
      // Some browser APIs return HTTP errors rather than throwing. Try fallback only for safe GET price feeds.
      if (hasOwnProxy && canUseOwnProxy(realTarget) && methodOf(init) === "GET") {
        return await fetchViaOwnProxy(realTarget, init);
      }
      if (canUsePublicProxy(realTarget, init)) {
        return await fetchViaPublicProxy(realTarget, init);
      }
      return res;
    } catch (err) {
      if (hasOwnProxy && canUseOwnProxy(realTarget)) {
        try { return await fetchViaOwnProxy(realTarget, init); } catch (_) {}
      }
      if (canUsePublicProxy(realTarget, init)) {
        try { return await fetchViaPublicProxy(realTarget, init); } catch (_) {}
      }
      throw err;
    }
  };

  function injectGitHubPanel() {
    const settingsPanel = document.querySelector("#settings .panel");
    if (!settingsPanel || document.getElementById("vysyonProxyUrl")) return;
    const proxy = currentProxyUrl();
    const el = document.createElement("div");
    el.className = "notice";
    el.innerHTML = `
      <strong>GitHub/PWA Mode</strong><br>
      <span class="small">Die App läuft im Browser. Für deutlich bessere Price-Feeds kannst du optional einen Vysyon Data Proxy eintragen. Ohne Proxy versucht die App direkte Abrufe plus öffentliche Fallbacks.</span>
      <div class="api-grid" style="margin-top:12px">
        <label class="field wide"><span>Vysyon Data Proxy URL optional</span><input id="vysyonProxyUrl" type="text" placeholder="https://dein-worker.workers.dev" value="${proxy.replace(/"/g, "&quot;")}" /></label>
        <button id="saveVysyonProxyBtn" class="btn secondary" type="button">Save Proxy</button>
        <button id="clearVysyonProxyBtn" class="btn secondary" type="button">Clear</button>
      </div>
      <p id="vysyonProxyStatus" class="muted small" style="margin:8px 0 0">${proxy ? "Proxy aktiv: " + proxy : "Kein Proxy aktiv."}</p>
    `;
    settingsPanel.insertBefore(el, settingsPanel.firstChild);

    document.getElementById("saveVysyonProxyBtn")?.addEventListener("click", () => {
      const val = normalizeProxyUrl(document.getElementById("vysyonProxyUrl")?.value);
      const status = document.getElementById("vysyonProxyStatus");
      if (!val) {
        if (status) status.textContent = "Bitte eine HTTPS-Proxy-URL eintragen oder leer lassen.";
        return;
      }
      localStorage.setItem(STORE_KEY, val);
      if (status) status.textContent = "Proxy gespeichert: " + val + " · App neu laden und Scan erneut starten.";
    });
    document.getElementById("clearVysyonProxyBtn")?.addEventListener("click", () => {
      localStorage.removeItem(STORE_KEY);
      const input = document.getElementById("vysyonProxyUrl");
      if (input) input.value = "";
      const status = document.getElementById("vysyonProxyStatus");
      if (status) status.textContent = "Proxy entfernt. App neu laden und Scan erneut starten.";
    });
  }

  document.addEventListener("DOMContentLoaded", injectGitHubPanel);
})();
