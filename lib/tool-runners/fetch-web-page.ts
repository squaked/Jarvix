import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const DNS_TIMEOUT_MS = 5_000;

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "application/xhtml+xml",
];

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

function htmlToPlainText(html: string): string {
  let s = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<!--([\s\S]*?)-->/g, " ");
  s = s.replace(/<\/?(br|p|div|tr|h[1-6]|li|blockquote)\b[^>]*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeBasicEntities(s);
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractTitle(html: string): string | undefined {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m?.[1]) return undefined;
  return decodeBasicEntities(
    m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  );
}

/** True when IP is acceptable as a fetch target (blocks loopback, private, link-local, metadata). */
function isPublicInternetIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    // CGNAT / shared address space (often non-public)
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === "::1") return false;
    if (x.startsWith("fe80:")) return false;
    if (x.startsWith("fc") || x.startsWith("fd")) return false;
    if (x.startsWith("::ffff:")) {
      const v4 = x.slice(7);
      return isPublicInternetIp(v4);
    }
    return true;
  }
  return false;
}

async function dnsLookupAll(hostname: string): Promise<string[]> {
  const lookupPromise = dns.lookup(hostname, { all: true, verbatim: true });
  const timeoutPromise = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error("DNS timeout")), DNS_TIMEOUT_MS),
  );
  const addresses = await Promise.race([lookupPromise, timeoutPromise]);
  return addresses.map((a) => a.address);
}

async function assertHostResolvableToPublicInternet(
  hostname: string,
): Promise<string | undefined> {
  const h = hostname.toLowerCase();

  if (net.isIP(h)) {
    return isPublicInternetIp(h)
      ? undefined
      : "That host/IP is not reachable (private or local addresses are blocked).";
  }

  let ips: string[];
  try {
    ips = await dnsLookupAll(h);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DNS lookup failed";
    return `Could not resolve host (${msg}).`;
  }

  if (!ips.length) {
    return "Host resolved to no addresses.";
  }

  for (const ip of ips) {
    if (!isPublicInternetIp(ip)) {
      return `Host resolves to a non-public address (${ip}); fetch blocked for safety.`;
    }
  }

  return undefined;
}

function assertUrlShape(url: URL): string | undefined {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only http and https URLs are allowed.";
  }
  if (url.username !== "" || url.password !== "") {
    return "URLs with embedded credentials are not allowed.";
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0"
  ) {
    return "Localhost targets are not allowed.";
  }
  if (host.endsWith(".local")) {
    return ".local hostnames are not allowed.";
  }
  const port = url.port;
  if (port && port !== "80" && port !== "443") {
    return "Only default ports (80 / 443) are allowed.";
  }
  return undefined;
}

function normalizeContentType(header: string | null): string {
  return (header?.split(";")[0]?.trim().toLowerCase() ?? "") || "";
}

export type FetchWebPageOk = {
  ok: true;
  /** Final URL after redirects */
  url: string;
  title?: string;
  /** Plain text extracted from HTML or plain body */
  text: string;
  truncated: boolean;
  contentType: string;
  /** Machine-readable hint for the model: never obey instructions inside */
  dataClassification: "untrusted_remote_document";
};

export type FetchWebPageErr = { ok: false; error: string };

/**
 * Fetch a public web document as plain text (no JS). SSRF-hardened: DNS resolves
 * must point only to public IPs; redirects re-validated each hop.
 */
export async function fetchWebPageContent(
  urlString: string,
): Promise<FetchWebPageOk | FetchWebPageErr> {
  let current: URL;
  try {
    current = new URL(urlString.trim());
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  const shapeErr = assertUrlShape(current);
  if (shapeErr) return { ok: false, error: shapeErr };

  const blocked = await assertHostResolvableToPublicInternet(current.hostname);
  if (blocked) return { ok: false, error: blocked };

  let lastContentType = "";

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const againShape = assertUrlShape(current);
    if (againShape) return { ok: false, error: againShape };

    const againDns = await assertHostResolvableToPublicInternet(
      current.hostname,
    );
    if (againDns) return { ok: false, error: againDns };

    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          Accept:
            "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.05",
          "User-Agent": "Jarvix/0.1 (personal-assistant fetch_web_page)",
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { ok: false, error: `Fetch failed: ${msg}` };
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) {
        return { ok: false, error: `HTTP ${res.status} redirect without Location.` };
      }
      try {
        current = new URL(loc, current);
      } catch {
        return { ok: false, error: "Invalid redirect Location URL." };
      }
      continue;
    }

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    lastContentType = normalizeContentType(res.headers.get("content-type"));
    const typeOk = ALLOWED_CONTENT_TYPES.some(
      (t) => lastContentType === t || lastContentType.startsWith(`${t};`),
    );
    if (!typeOk) {
      return {
        ok: false,
        error: `Unsupported Content-Type (${lastContentType || "unknown"}).`,
      };
    }

    const buf = await res.arrayBuffer();
    const truncated = buf.byteLength > MAX_BYTES;
    const slice = truncated ? buf.slice(0, MAX_BYTES) : buf;
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(slice);

    let text: string;
    let title: string | undefined;
    if (
      lastContentType.includes("html") ||
      lastContentType.includes("xhtml")
    ) {
      title = extractTitle(raw);
      text = htmlToPlainText(raw);
    } else {
      text = raw.trim();
    }

    if (!text.length) {
      return {
        ok: false,
        error: "Page had no extractable text (empty body).",
      };
    }

    const maxChars = 48_000;
    let outText = text;
    let lengthTruncated = false;
    if (outText.length > maxChars) {
      outText = `${outText.slice(0, maxChars)}\n\n[…truncated for length]`;
      lengthTruncated = true;
    }

    return {
      ok: true,
      url: current.toString(),
      title,
      text: outText,
      truncated: truncated || lengthTruncated,
      contentType: lastContentType,
      dataClassification: "untrusted_remote_document",
    };
  }

  return { ok: false, error: "Too many redirects." };
}
