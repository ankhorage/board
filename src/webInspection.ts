import type {
  WebBoardingDiagnostic,
  WebBoardingObservedLink,
  WebBoardingPlan,
  WebBoardingRoute,
} from "./webBoardingPlan.js";

const DEFAULT_MAX_RESPONSE_BYTES = 512_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const HTML_CONTENT_TYPE_PREFIXES = [
  "text/html",
  "application/xhtml+xml",
] as const;
const MAX_OBSERVED_LINKS = 25;
const MAX_TEXT_ITEMS = 12;

interface ExtractedWebsiteSignals {
  readonly description?: string;
  readonly headings: readonly string[];
  readonly observedLinks: readonly WebBoardingObservedLink[];
  readonly sections: readonly string[];
  readonly title?: string;
}

type BoardFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface InspectWebsiteOptions {
  readonly extractWebsiteSignals?: (
    html: string,
    fetchedUrl: URL,
  ) => ExtractedWebsiteSignals;
  readonly fetchImplementation?: BoardFetch;
  readonly maxResponseBytes?: number;
  readonly timeoutMs?: number;
}

export interface InspectWebsiteResult {
  readonly exitCode: number;
  readonly plan: WebBoardingPlan;
}

export async function inspectWebsite(
  url: string,
  options: InspectWebsiteOptions = {},
): Promise<InspectWebsiteResult> {
  const parsedUrl = new URL(url);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes =
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  let response: Response;
  try {
    response = await fetchWithTimeout(
      fetchImplementation,
      parsedUrl.toString(),
      timeoutMs,
    );
  } catch (error) {
    if (isAbortError(error)) {
      return createFailureResult(parsedUrl, {
        code: "website-fetch-timeout",
        message: "Fetching the requested website URL timed out.",
        severity: "error",
      });
    }

    return createFailureResult(parsedUrl, {
      code: "website-fetch-failed",
      message: "Could not fetch the requested website URL.",
      severity: "error",
    });
  }

  const fetchedUrl = resolveFetchedUrl(response, parsedUrl);
  const contentType = response.headers.get("content-type");

  if (contentType !== null && !isSupportedHtmlContentType(contentType)) {
    return createFailureResult(
      parsedUrl,
      {
        code: "website-unsupported-content-type",
        message: "The requested website URL did not return HTML content.",
        severity: "error",
      },
      fetchedUrl,
    );
  }

  let html: string;
  try {
    html = await readResponseText(response, maxResponseBytes);
  } catch (error) {
    if (error instanceof ResponseTooLargeError) {
      return createFailureResult(
        parsedUrl,
        {
          code: "website-response-too-large",
          message: "The requested website response exceeded the size limit.",
          severity: "error",
        },
        fetchedUrl,
      );
    }

    return createFailureResult(
      parsedUrl,
      {
        code: "website-fetch-failed",
        message: "Could not read the requested website response.",
        severity: "error",
      },
      fetchedUrl,
    );
  }

  try {
    const extractedSignals = (
      options.extractWebsiteSignals ?? extractWebsiteSignals
    )(html, fetchedUrl);

    const diagnostics: WebBoardingDiagnostic[] = [];
    if (!response.ok) {
      diagnostics.push({
        code: "website-http-status-not-ok",
        message: `Fetched website responded with HTTP status ${response.status}.`,
        severity: "warning",
      });
    }

    return {
      exitCode: 0,
      plan: createPlan({
        diagnostics,
        fetchedUrl,
        observedLinks: extractedSignals.observedLinks,
        route: createRoute({
          description: extractedSignals.description,
          fetchedUrl,
          headings: extractedSignals.headings,
          sections: extractedSignals.sections,
          title: extractedSignals.title,
        }),
        sourceUrl: parsedUrl,
        title: extractedSignals.title,
      }),
    };
  } catch {
    return createFailureResult(
      parsedUrl,
      {
        code: "website-parse-failed",
        message: "The requested website HTML could not be inspected.",
        severity: "error",
      },
      fetchedUrl,
    );
  }
}

export function renderWebBoardingPlan(plan: WebBoardingPlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function extractWebsiteSignals(
  html: string,
  fetchedUrl: URL,
): ExtractedWebsiteSignals {
  const title = readFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = readMetaDescription(html);

  return {
    description: normalizeOptionalText(description),
    headings: readTextMatches(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi),
    observedLinks: readObservedLinks(html, fetchedUrl),
    sections: readTextMatches(
      html,
      /<(?:main|section|article|nav)[^>]*aria-label=(["'])([\s\S]*?)\1[^>]*>/gi,
      2,
    ),
    title: normalizeOptionalText(title),
  };
}

async function fetchWithTimeout(
  fetchImplementation: BoardFetch,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetchImplementation(url, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseText(
  response: Response,
  maxResponseBytes: number,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number.parseInt(declaredLength, 10);
    if (Number.isFinite(parsedLength) && parsedLength > maxResponseBytes) {
      throw new ResponseTooLargeError();
    }
  }

  const reader = response.body?.getReader();
  if (reader === undefined) {
    const text = await response.text();
    const textBytes = new TextEncoder().encode(text).length;
    if (textBytes > maxResponseBytes) {
      throw new ResponseTooLargeError();
    }

    return text;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const rawReadResult: unknown = await reader.read();
    const readResult = readStreamChunk(rawReadResult);
    if (readResult.done) {
      break;
    }

    const { value } = readResult;
    totalBytes += value.byteLength;
    if (totalBytes > maxResponseBytes) {
      throw new ResponseTooLargeError();
    }

    chunks.push(value);
  }

  return new TextDecoder().decode(concatenateChunks(chunks, totalBytes));
}

function readStreamChunk(
  value: unknown,
):
  | { readonly done: true }
  | { readonly done: false; readonly value: Uint8Array } {
  if (!isRecord(value) || typeof value.done !== "boolean") {
    throw new Error("Invalid response stream chunk.");
  }

  if (value.done) {
    return { done: true };
  }

  if (!(value.value instanceof Uint8Array)) {
    throw new Error("Invalid response stream chunk value.");
  }

  return {
    done: false,
    value: value.value,
  };
}

function concatenateChunks(
  chunks: readonly Uint8Array[],
  totalBytes: number,
): Uint8Array {
  const output = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function isSupportedHtmlContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  return HTML_CONTENT_TYPE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

function resolveFetchedUrl(response: Response, fallbackUrl: URL): URL {
  if (response.url.trim().length === 0) {
    return fallbackUrl;
  }

  try {
    return new URL(response.url);
  } catch {
    return fallbackUrl;
  }
}

function createFailureResult(
  sourceUrl: URL,
  diagnostic: WebBoardingDiagnostic,
  fetchedUrl?: URL,
): InspectWebsiteResult {
  return {
    exitCode: 1,
    plan: createPlan({
      diagnostics: [diagnostic],
      fetchedUrl,
      observedLinks: [],
      route: createPlaceholderRoute(fetchedUrl ?? sourceUrl),
      sourceUrl,
    }),
  };
}

function createPlan(args: {
  readonly diagnostics: readonly WebBoardingDiagnostic[];
  readonly fetchedUrl?: URL;
  readonly observedLinks: readonly WebBoardingObservedLink[];
  readonly route: WebBoardingRoute;
  readonly sourceUrl: URL;
  readonly title?: string;
}): WebBoardingPlan {
  const suggestedName = createSuggestedName(args.title, args.sourceUrl);
  const suggestedSlug = createSuggestedSlug(suggestedName, args.sourceUrl);

  return {
    app: {
      suggestedName,
      suggestedSlug,
    },
    diagnostics: args.diagnostics,
    kind: "web-boarding-plan",
    observedLinks: args.observedLinks,
    routes: [args.route],
    source: {
      fetchedUrl: args.fetchedUrl?.toString(),
      kind: "website",
      url: args.sourceUrl.toString(),
    },
    version: 1,
  };
}

function createRoute(args: {
  readonly description?: string;
  readonly fetchedUrl: URL;
  readonly headings: readonly string[];
  readonly sections: readonly string[];
  readonly title?: string;
}): WebBoardingRoute {
  return {
    description: args.description,
    headings: args.headings,
    path: normalizeRoutePath(args.fetchedUrl),
    sections: args.sections,
    sourceUrl: args.fetchedUrl.toString(),
    title: args.title,
  };
}

function createPlaceholderRoute(url: URL): WebBoardingRoute {
  return {
    headings: [],
    path: normalizeRoutePath(url),
    sections: [],
    sourceUrl: url.toString(),
  };
}

function normalizeRoutePath(url: URL): string {
  return url.pathname.trim().length > 0 ? url.pathname : "/";
}

function createSuggestedName(title: string | undefined, url: URL): string {
  const normalizedTitle = normalizeOptionalText(title);
  if (normalizedTitle !== undefined) {
    return normalizedTitle;
  }

  return hostnameToName(url.hostname);
}

function hostnameToName(hostname: string): string {
  const base = hostname.replace(/^www\./i, "");
  const parts = base
    .split(".")
    .filter((segment) => segment.length > 0)
    .map((segment) =>
      segment
        .split(/[-_]+/)
        .filter((part) => part.length > 0)
        .map(capitalizeWord)
        .join(" "),
    )
    .filter((segment) => segment.length > 0);

  return parts[0] ?? "Boarded Site";
}

function createSuggestedSlug(name: string, url: URL): string {
  const fromName = slugify(name);
  if (fromName.length > 0) {
    return fromName;
  }

  const fromHostname = slugify(url.hostname.replace(/\./g, "-"));
  return fromHostname.length > 0 ? fromHostname : "boarded-site";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function capitalizeWord(value: string): string {
  return value.length === 0
    ? value
    : `${value.slice(0, 1).toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function readMetaDescription(html: string): string | undefined {
  const nameThenContent = readFirstMatch(
    html,
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i,
  );
  if (nameThenContent !== undefined) {
    return nameThenContent;
  }

  return readFirstMatch(
    html,
    /<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i,
  );
}

function readTextMatches(
  html: string,
  pattern: RegExp,
  captureGroup = 1,
): readonly string[] {
  const values: string[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(pattern)) {
    const rawValue = match[captureGroup];
    if (rawValue === undefined) {
      continue;
    }

    const normalized = normalizeOptionalText(stripHtml(rawValue));
    if (normalized === undefined || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    values.push(normalized);

    if (values.length >= MAX_TEXT_ITEMS) {
      break;
    }
  }

  return values;
}

function readFirstMatch(html: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(html);
  return stripHtml(match?.[1] ?? "");
}

function readObservedLinks(
  html: string,
  fetchedUrl: URL,
): readonly WebBoardingObservedLink[] {
  const links: WebBoardingObservedLink[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = readHref(match[1] ?? "");
    if (href === undefined) {
      continue;
    }

    const label = normalizeOptionalText(stripHtml(match[2] ?? ""));

    const sameOrigin = resolveSameOriginLink(href, fetchedUrl);

    const entry: WebBoardingObservedLink = {
      href,
      label,
      sameOrigin,
    };
    const key = `${entry.href}::${entry.label ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    links.push(entry);

    if (links.length >= MAX_OBSERVED_LINKS) {
      break;
    }
  }

  return links;
}

function readHref(attributes: string): string | undefined {
  const doubleQuoted = /href\s*=\s*"([^"]+)"/i.exec(attributes)?.[1];
  if (doubleQuoted !== undefined) {
    return doubleQuoted;
  }

  return /href\s*=\s*'([^']+)'/i.exec(attributes)?.[1];
}

function resolveSameOriginLink(href: string, fetchedUrl: URL): boolean {
  try {
    return new URL(href, fetchedUrl).origin === fetchedUrl.origin;
  } catch {
    return false;
  }
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

class ResponseTooLargeError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
