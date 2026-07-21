import "server-only";

import { env } from "@/config/env";
import { requestJson } from "@/lib/api/request";
import { unknownSchema } from "@/lib/api/schema";

export function requestBackendAuth(
  path: string,
  options: Readonly<{
    body?: unknown;
    accessToken?: string;
    method?: "POST" | "DELETE";
  }> = {},
): Promise<unknown> {
  const headers = new Headers();
  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  return requestJson(env.INTERNAL_BACKEND_URL, path, {
    method: options.method ?? "POST",
    body: options.body,
    headers,
    cache: "no-store",
    timeoutMs: env.API_REQUEST_TIMEOUT_MS,
    schema: unknownSchema,
  });
}
