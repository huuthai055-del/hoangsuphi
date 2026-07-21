import type { NextRequest } from "next/server";
import { env } from "@/config/env";
import { requestBackendAuth } from "@/lib/auth/backend";
import { clearAuthCookies, readAuthCookies } from "@/lib/auth/cookies";
import { isSameOriginMutation } from "@/lib/auth/origin";
import { noStoreJson } from "@/lib/auth/responses";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return noStoreJson(
      { type: "about:blank", title: "Forbidden", status: 403 },
      403,
    );
  }

  const { accessToken, refreshToken } = await readAuthCookies();

  try {
    if (accessToken || refreshToken) {
      await requestBackendAuth(env.AUTH_LOGOUT_PATH, {
        accessToken,
        body: refreshToken
          ? { [env.AUTH_REFRESH_TOKEN_FIELD]: refreshToken }
          : undefined,
      });
    }
  } catch {
    // Logout is local-first: cookies are cleared even when backend revocation is
    // temporarily unavailable. The backend should expire/revoke tokens by TTL.
  } finally {
    await clearAuthCookies();
  }

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
