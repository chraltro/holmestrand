import { NextRequest, NextResponse } from "next/server";

interface UnfurlResult {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  url: string;
}

// In-memory cache (survives across requests in the same server instance)
const cache = new Map<string, { data: UnfurlResult; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function extractMeta(html: string, url: string): UnfurlResult {
  const get = (property: string): string | null => {
    // Match <meta property="og:..." content="..."> or <meta name="..." content="...">
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
    if (!match?.[1]) return null;
    const href = match[1];
    if (href.startsWith("http")) return href;
    try {
      const base = new URL(url);
      if (href.startsWith("//")) return `${base.protocol}${href}`;
      if (href.startsWith("/")) return `${base.origin}${href}`;
      return `${base.origin}/${href}`;
    } catch {
      return null;
    }
  };

  return {
    title: getTitle(),
    description: get("og:description") || get("description"),
    image: get("og:image"),
    siteName: get("og:site_name"),
    favicon: getFavicon(),
    url,
  };
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

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Huset/1.0; +https://huset.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL", status: response.status },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { title: null, description: null, image: null, siteName: null, favicon: null, url },
        { headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }

    // Only read the first 50KB to avoid downloading huge pages
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "No response body" }, { status: 502 });
    }

    let html = "";
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const maxBytes = 50 * 1024;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytesRead += value.length;
      // Early exit if we've found </head> — OG tags are always in <head>
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    const result = extractMeta(html, url);

    // Resolve relative OG image URLs
    if (result.image && !result.image.startsWith("http")) {
      try {
        const base = new URL(url);
        result.image = result.image.startsWith("//")
          ? `${base.protocol}${result.image}`
          : result.image.startsWith("/")
            ? `${base.origin}${result.image}`
            : `${base.origin}/${result.image}`;
      } catch {
        // leave as-is
      }
    }

    // Cache the result
    cache.set(url, { data: result, ts: Date.now() });

    // Evict old cache entries (keep at most 500)
    if (cache.size > 500) {
      const oldest = Array.from(cache.entries())
        .sort((a, b) => a[1].ts - b[1].ts)
        .slice(0, cache.size - 400);
      for (const [key] of oldest) cache.delete(key);
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Timeout fetching URL" }, { status: 504 });
    }
    return NextResponse.json({ error: "Failed to unfurl URL" }, { status: 502 });
  }
}
