export type WebSearchHit = {
  title: string;
  url: string;
  description: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

type DdgRelated = {
  Text?: string;
  FirstURL?: string;
  Topics?: DdgRelated[];
};

function pushRelated(
  items: unknown[] | undefined,
  out: WebSearchHit[],
  limit: number,
) {
  if (!items || out.length >= limit) return;
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as DdgRelated;
    if (Array.isArray(t.Topics)) {
      pushRelated(t.Topics, out, limit);
      if (out.length >= limit) return;
      continue;
    }
    const text = t.Text?.trim();
    const url = t.FirstURL;
    if (!text || !url) continue;
    const title = text.split(" - ")[0]?.trim() || "Related";
    const desc = text.includes(" - ")
      ? text.slice(text.indexOf(" - ") + 3).trim()
      : text;
    out.push({
      title,
      url,
      description: desc.slice(0, 400),
    });
    if (out.length >= limit) return;
  }
}

/**
 * Free, no API key: [DuckDuckGo Instant Answer API](https://api.duckduckgo.com).
 * Not full web SERPs (licensing) — Wikipedia-style abstracts, related topics, and a few links.
 */
export async function duckDuckGoInstantSearch(
  query: string,
  max = 5,
): Promise<WebSearchHit[]> {
  const q = query.trim();
  if (!q) throw new Error("Search query is empty.");

  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("no_redirect", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo request failed (${res.status})`);
  }

  const d = (await res.json()) as {
    AbstractURL?: string;
    AbstractText?: string;
    Heading?: string;
    Answer?: string;
    AnswerType?: string;
    Results?: { FirstURL?: string; Result?: string; Text?: string }[];
    RelatedTopics?: DdgRelated[];
  };

  const hits: WebSearchHit[] = [];

  if (d.AbstractText?.trim() && d.AbstractURL) {
    hits.push({
      title: d.Heading?.trim() || "Summary",
      url: d.AbstractURL,
      description: d.AbstractText.trim().slice(0, 500),
    });
  } else if (d.Answer?.trim()) {
    hits.push({
      title: d.AnswerType || "Instant answer",
      url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
      description: d.Answer.trim(),
    });
  }

  for (const r of d.Results ?? []) {
    const u = r.FirstURL;
    if (!u) continue;
    const raw = stripHtml(r.Result ?? "");
    hits.push({
      title: raw || r.Text?.split(" - ")[0] || "Result",
      url: u,
      description: (r.Text ?? raw).slice(0, 400),
    });
  }

  pushRelated(d.RelatedTopics, hits, max);

  const seen = new Set<string>();
  const unique: WebSearchHit[] = [];
  for (const h of hits) {
    const k = `${h.url}::${h.title}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(h);
    if (unique.length >= max) break;
  }

  if (unique.length === 0) {
    return [];
  }

  return unique.slice(0, max);
}
