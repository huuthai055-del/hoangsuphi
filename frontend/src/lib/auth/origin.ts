import type { NextRequest } from "next/server";

export function isSameOriginMutation(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // Non-browser clients may omit Origin. SameSite cookies remain the primary
    // browser CSRF control, while explicit cross-site browser requests are rejected.
    return true;
  }

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
