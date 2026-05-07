import { bingRssWebSearch } from "./bing-rss-search";
import { duckDuckGoInstantSearch, type WebSearchHit } from "./ddg-instant";

export type { WebSearchHit } from "./ddg-instant";

/**
 * Tries DuckDuckGo instant answers first (fast encyclopedia-style hits), then Bing web
 * search RSS so queries like “latest AI news” still return real links when instant is empty.
 */
export async function webSearchCombined(
  query: string,
  max = 5,
): Promise<WebSearchHit[]> {
  const q = query.trim();
  if (!q) throw new Error("Search query is empty.");

  const instant = await duckDuckGoInstantSearch(q, max);
  if (instant.length > 0) {
    return instant;
  }

  const bing = await bingRssWebSearch(q, max);
  if (bing.length > 0) {
    return bing;
  }

  return [
    {
      title: "No web results matched",
      url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
      description:
        "Neither DuckDuckGo instant answers nor Bing RSS returned items. Try the link in a browser or refine your query.",
    },
  ];
}
