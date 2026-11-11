const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizeLoopbackEndpoint(value, fallbackPort) {
  const raw = String(value || "").trim() || `http://127.0.0.1:${fallbackPort}`;
  let url;
  try {
    url = new URL(raw.includes("://") ? raw : `http://${raw}`);
  } catch {
    throw new Error("Enter a valid local service address.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!LOOPBACK_HOSTS.has(hostname) || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("For safety, local generation services must be on localhost, 127.0.0.1, or ::1.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export async function fetchLocalJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("Could not reach the local service. Check that it is running and that CORS allows this editor's exact origin.", { cause: error });
  }
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error || body?.detail || body?.message || "";
    } catch {
      // Status is enough when the response body is not JSON.
    }
    throw new Error(`Local service returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.json();
}

export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}
