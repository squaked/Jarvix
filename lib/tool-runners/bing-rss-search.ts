import type { WebSearchHit } from "./ddg-instant";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(Number.parseInt(h, 16)),
    );
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  let inner = m[1].trim();
  if (inner.startsWith("<![CDATA[")) {
    inner = inner.slice(9, inner.indexOf("]]>"));
  }
  return decodeBasicEntities(inner.trim());
}

/**
 * Parse Bing RSS (`format=rss` web or news). Titles/descriptions may contain HTML entities.
 */
export function parseBingRssItems(xml: string, max: number): WebSearchHit[] {
  const hits: WebSearchHit[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && hits.length < max) {
    const block = m[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const description = extractTag(block, "description");
    if (!title || !link) continue;
    const u = link.trim();
    if (!/^https?:\/\//i.test(u)) continue;
    hits.push({
      title: stripHtml(title).slice(0, 200) || "Result",
      url: u,
      description: stripHtml(description).slice(0, 500),
    });
  }
  return hits;
}

/**
 * Bing web search as RSS — broader than DuckDuckGo instant answers (works for news, recent topics).
 * No API key; subject to Bing RSS terms for personal/non-automated abuse.
 */
export async function bingRssWebSearch(
  query: string,
  max = 5,
): Promise<WebSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "rss");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; Jarvix/0.1; +https://duckduckgo.com/) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      cache: "no-store",
    });
  } catch {
    return [];
  }

  if (!res.ok) return [];

  const xml = await res.text();
  return parseBingRssItems(xml, max);
}
