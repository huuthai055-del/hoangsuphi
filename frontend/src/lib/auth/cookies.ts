import "server-only";

import { cookies } from "next/headers";
import { env } from "@/config/env";
import type { AuthTokens } from "@/lib/auth/contracts";

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  } as const;
}

export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  store.set(
    env.AUTH_ACCESS_COOKIE_NAME,
    tokens.accessToken,
    baseCookieOptions(tokens.accessExpiresInSeconds ?? env.AUTH_ACCESS_TTL_SECONDS),
  );

  if (tokens.refreshToken) {
    store.set(
      env.AUTH_REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      baseCookieOptions(tokens.refreshExpiresInSeconds ?? env.AUTH_REFRESH_TTL_SECONDS),
    );
  }
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.set(env.AUTH_ACCESS_COOKIE_NAME, "", {
    ...baseCookieOptions(0),
    expires: new Date(0),
  });
  store.set(env.AUTH_REFRESH_COOKIE_NAME, "", {
    ...baseCookieOptions(0),
    expires: new Date(0),
  });
}

export async function readAuthCookies(): Promise<Readonly<{
  accessToken?: string;
  refreshToken?: string;
}>> {
  const store = await cookies();
  return {
    accessToken: store.get(env.AUTH_ACCESS_COOKIE_NAME)?.value,
    refreshToken: store.get(env.AUTH_REFRESH_COOKIE_NAME)?.value,
  };
}
