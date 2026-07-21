import { FrontendApiError } from "@/lib/api/errors";

let refreshInFlight: Promise<boolean> | null = null;

export async function refreshBrowserSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

/**
 * Retries exactly once after a successful session refresh, but only when the
 * caller explicitly confirms that replay is safe. Never pass replaySafe=true
 * for a mutation unless the backend endpoint has an idempotency guarantee.
 */
export async function withSessionRefresh<T>(
  request: () => Promise<T>,
  options: Readonly<{ replaySafe: boolean }>,
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (
      !(error instanceof FrontendApiError) ||
      error.kind !== "unauthorized" ||
      !options.replaySafe
    ) {
      throw error;
    }

    const refreshed = await refreshBrowserSession();
    if (!refreshed) {
      throw error;
    }

    return request();
  }
}

export async function logoutBrowserSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return response.ok;
  } catch {
    return false;
  }
}
