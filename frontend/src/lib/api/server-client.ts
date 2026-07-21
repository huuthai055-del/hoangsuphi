import "server-only";

import { env } from "@/config/env";
import { requestJson, type ApiRequestOptions } from "@/lib/api/request";

export function serverApiRequest<T>(
  path: string,
  options: ApiRequestOptions<T>,
): Promise<T> {
  return requestJson(env.INTERNAL_BACKEND_URL, path, options);
}
