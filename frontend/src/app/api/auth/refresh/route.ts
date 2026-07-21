import type { NextRequest } from "next/server";
import { env } from "@/config/env";
import { requestBackendAuth } from "@/lib/auth/backend";
import { readAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
import { parseAuthResponse } from "@/lib/auth/contracts";
import { isSameOriginMutation } from "@/lib/auth/origin";
import { authErrorResponse, noStoreJson } from "@/lib/auth/responses";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return noStoreJson(
      { type: "about:blank", title: "Forbidden", status: 403 },
      403,
    );
  }

  const { refreshToken } = await readAuthCookies();
  if (!refreshToken) {
    return noStoreJson(
      { type: "about:blank", title: "Authentication required", status: 401 },
      401,
    );
  }

  try {
    const backendResponse = await requestBackendAuth(env.AUTH_REFRESH_PATH, {
      body: { [env.AUTH_REFRESH_TOKEN_FIELD]: refreshToken },
    });
    const parsed = parseAuthResponse(backendResponse);
    await setAuthCookies({
      ...parsed.tokens,
      refreshToken: parsed.tokens.refreshToken ?? refreshToken,
    });
    return noStoreJson(parsed.publicPayload);
  } catch (error) {
    return authErrorResponse(error);
  }
}
