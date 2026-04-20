import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";

interface UnfurlResult {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  url: string;
}

const cache = new Map<string, { data: UnfurlResult; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60;
const MAX_BYTES = 50 * 1024;
const FETCH_TIMEOUT_MS = 5000;
const MAX_TITLE = 300;
const MAX_DESCRIPTION = 600;
const MAX_SITE_NAME = 100;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}

async function isSafeHost(hostname: string): Promise<boolean> {
  const ipVer = isIP(hostname);
  if (ipVer === 4) return !isPrivateIPv4(hostname);
  if (ipVer === 6) return !isPrivateIPv6(hostname);

  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }

  try {
    const addrs = await lookup(hostname, { all: true });
    for (const { address, family } of addrs) {
      if (family === 4 && isPrivateIPv4(address)) return false;
      if (family === 6 && isPrivateIPv6(address)) return false;
    }
    return addrs.length > 0;
  } catch {
    return false;
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function sanitizeText(s: string | null, max: number): string | null {
  if (!s) return null;
  const stripped = s.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "").trim();
  if (!stripped) return null;
  return stripped.length > max ? stripped.slice(0, max) : stripped;
}

function sanitizeUrl(candidate: string | null, base: string): string | null {
  if (!candidate) return null;
  try {
    const resolved = new URL(candidate, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function extractMeta(html: string, url: string): UnfurlResult {
  const get = (property: string): string | null => {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHTMLEntities(match[1]);
    }
    return null;
  };

  const getTitle = (): string | null => {
    const og = get("og:title");
    if (og) return og;
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match?.[1] ? decodeHTMLEntities(match[1].trim()) : null;
  };

  const getFavicon = (): string | null => {
    const match = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i);
    return sanitizeUrl(match?.[1] ?? null, url);
  };

  return {
    title: sanitizeText(getTitle(), MAX_TITLE),
    description: sanitizeText(get("og:description") || get("description"), MAX_DESCRIPTION),
    image: sanitizeUrl(get("og:image"), url),
    siteName: sanitizeText(get("og:site_name"), MAX_SITE_NAME),
    favicon: getFavicon(),
    url,
  };
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  if (!(await isSafeHost(parsed.hostname))) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const normalized = parsed.toString();
  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Huset/1.0; +https://huset.demant.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location");
      if (!loc) return NextResponse.json({ error: "Redirect without location" }, { status: 502 });
      let next: URL;
      try { next = new URL(loc, normalized); } catch { return NextResponse.json({ error: "Invalid redirect" }, { status: 502 }); }
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        return NextResponse.json({ error: "Redirect to unsupported protocol" }, { status: 502 });
      }
      if (!(await isSafeHost(next.hostname))) {
        return NextResponse.json({ error: "Redirect to disallowed host" }, { status: 502 });
      }
      const followed = await fetch(next.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Huset/1.0; +https://huset.demant.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
      });
      return await readAndRespond(followed, normalized);
    }

    return await readAndRespond(response, normalized);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "Failed to unfurl URL" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

async function readAndRespond(response: Response, url: string) {
  if (!response.ok) {
    return NextResponse.json({ error: "Upstream error", status: response.status }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    const empty: UnfurlResult = { title: null, description: null, image: null, siteName: null, favicon: null, url };
    return NextResponse.json(empty, { headers: { "Cache-Control": "public, max-age=3600" } });
  }

  const reader = response.body?.getReader();
  if (!reader) return NextResponse.json({ error: "No response body" }, { status: 502 });

  let html = "";
  const decoder = new TextDecoder();
  let bytesRead = 0;

  try {
    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
      if (html.includes("</head>")) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  const result = extractMeta(html, url);
  cache.set(url, { data: result, ts: Date.now() });

  if (cache.size > 500) {
    const oldest = Array.from(cache.entries()).sort((a, b) => a[1].ts - b[1].ts).slice(0, cache.size - 400);
    for (const [key] of oldest) cache.delete(key);
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=3600" } });
}
