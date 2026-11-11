import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";

import { agentDiscoveryLinkHeader } from "./agent-discovery.mjs";

const root = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8080);
const startedAt = Date.now();

const MIME_TYPES = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".md": "text/markdown; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mjs": "text/javascript; charset=utf-8",
  ".ogg": "audio/ogg",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

const COMPRESSIBLE = /^(?:text\/|application\/(?:javascript|json|xml|manifest\+json)|image\/svg\+xml)/;
const SECURITY_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  Link: agentDiscoveryLinkHeader,
};

function sendText(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders,
  });
  response.end(body);
}

function resolveRequestPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const candidate = resolve(root, `.${decoded.replace(/\\/g, "/")}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  return candidate;
}

function fileInfo(path) {
  try {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const index = resolve(path, "index.html");
      if (existsSync(index)) return { path: index, stats: statSync(index) };
      return null;
    }
    return { path, stats };
  } catch {
    return null;
  }
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(value || "").trim());
  if (!match) return null;
  let start = match[1] === "" ? null : Number(match[1]);
  let end = match[2] === "" ? null : Number(match[2]);
  if (start === null && end === null) return null;
  if (start === null) {
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (end === null) {
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return "invalid";
  return { start, end: Math.min(end, size - 1) };
}

function cacheControl(pathname) {
  if (pathname.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (pathname.endsWith(".html") || !extname(pathname)) return "no-cache";
  return "public, max-age=3600";
}

function serveFile(request, response, pathname, info) {
  const { path, stats } = info;
  const size = stats.size;
  const contentType = MIME_TYPES[extname(path).toLowerCase()] || "application/octet-stream";
  const range = request.headers.range ? parseRange(request.headers.range, size) : null;

  if (range === "invalid") {
    response.writeHead(416, {
      ...SECURITY_HEADERS,
      "Content-Range": `bytes */${size}`,
      "Content-Type": contentType,
    });
    response.end();
    return;
  }

  const headers = {
    ...SECURITY_HEADERS,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl(pathname),
    "Content-Type": contentType,
  };

  if (range) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${size}`;
    headers["Content-Length"] = String(range.end - range.start + 1);
    response.writeHead(206, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    pipeline(createReadStream(path, { start: range.start, end: range.end }), response, () => {});
    return;
  }

  const acceptsGzip = /\bgzip\b/.test(String(request.headers["accept-encoding"] || ""));
  const canCompress = acceptsGzip && size >= 1024 && COMPRESSIBLE.test(contentType);

  if (canCompress) {
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
    delete headers["Content-Length"];
    response.writeHead(200, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    pipeline(createReadStream(path), createGzip(), response, () => {});
    return;
  }

  headers["Content-Length"] = String(size);
  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  pipeline(createReadStream(path), response, () => {});
}

function handler(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method Not Allowed", { Allow: "GET, HEAD" });
    return;
  }

  const url = (() => {
    try {
      return new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    } catch {
      return null;
    }
  })();
  if (!url) {
    sendText(response, 400, "Bad Request");
    return;
  }
  const pathname = url.pathname;

  if (pathname === "/healthz" || pathname === "/health") {
    response.writeHead(200, {
      ...SECURITY_HEADERS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({
      status: "ok",
      service: "clipcraft-web",
      startedAt: new Date(startedAt).toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      now: new Date().toISOString(),
    }));
    return;
  }

  const target = resolveRequestPath(pathname);
  if (!target) {
    sendText(response, 400, "Bad Request");
    return;
  }

  const direct = fileInfo(target);
  if (direct) {
    serveFile(request, response, pathname, direct);
    return;
  }

  const isWellKnown = pathname === "/.well-known" || pathname.startsWith("/.well-known/");
  if (isWellKnown || pathname === "/auth.md") {
    sendText(response, 404, "Not Found");
    return;
  }

  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  const looksLikeFile = lastSegment.includes(".");
  const wantsHtml = String(request.headers.accept || "").includes("text/html");
  if (looksLikeFile && !wantsHtml) {
    sendText(response, 404, "Not Found");
    return;
  }

  const fallback = fileInfo(resolve(root, "index.html"));
  if (!fallback) {
    sendText(response, 503, "The ClipCraft build is missing. Run `npm run build` first.");
    return;
  }
  serveFile(request, response, "/index.html", fallback);
}

if (!existsSync(resolve(root, "index.html"))) {
  console.error(`ClipCraft build not found at ${root}. Run "npm run build" before starting the production server.`);
  process.exit(1);
}

const server = createServer(handler);

server.on("error", (error) => {
  console.error(`ClipCraft web server failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`ClipCraft web server listening on http://${host}:${port}`);
  console.log(`Health check: http://127.0.0.1:${port}/healthz`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`Received ${signal}. Shutting down ClipCraft web server...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
