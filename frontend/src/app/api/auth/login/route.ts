import type { NextRequest } from "next/server";
import { env } from "@/config/env";
import { requestBackendAuth } from "@/lib/auth/backend";
import { setAuthCookies } from "@/lib/auth/cookies";
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

  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return noStoreJson(
      { type: "about:blank", title: "Invalid JSON body", status: 400 },
      400,
    );
  }

  if (typeof credentials !== "object" || credentials === null || Array.isArray(credentials)) {
    return noStoreJson(
      { type: "about:blank", title: "Invalid request body", status: 400 },
      400,
    );
  }

  try {
    const backendResponse = await requestBackendAuth(env.AUTH_LOGIN_PATH, {
      body: credentials,
    });
    const parsed = parseAuthResponse(backendResponse);
    await setAuthCookies(parsed.tokens);
    return noStoreJson(parsed.publicPayload);
  } catch (error) {
    return authErrorResponse(error);
  }
}
