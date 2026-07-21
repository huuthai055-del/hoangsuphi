export type QueryPrimitive = string | number | boolean;
export type QueryValue = QueryPrimitive | null | undefined | readonly QueryPrimitive[];
export type QueryParams = Readonly<Record<string, QueryValue>>;

function decodedSegmentIsUnsafe(segment: string): boolean {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\");
  } catch {
    return true;
  }
}

export function assertSafeApiPath(path: string): void {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("?") ||
    path.includes("#") ||
    path.split("/").some(decodedSegmentIsUnsafe)
  ) {
    throw new Error("API path must be a normalized absolute same-origin path");
  }
}

export function encodePathSegment(value: string, label = "path segment"): string {
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(normalized)) {
    throw new Error(`${label} contains unsupported characters`);
  }
  return encodeURIComponent(normalized);
}

export function buildApiUrl(
  baseUrl: string,
  path: string,
  query?: QueryParams,
): URL {
  assertSafeApiPath(path);
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = new URL(`${normalizedBase}${path}`);

  if (!query) {
    return url;
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      continue;
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      url.searchParams.append(key, String(value));
    }
  }

  return url;
}
