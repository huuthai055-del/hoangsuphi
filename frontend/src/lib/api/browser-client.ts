import { requestJson, type ApiRequestOptions } from "@/lib/api/request";

/**
 * Browser code must call same-origin BFF routes only. Passing an empty base URL
 * resolves requests against window.location without exposing backend secrets.
 */
export function browserApiRequest<T>(
  path: `/api/${string}`,
  options: ApiRequestOptions<T>,
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("browserApiRequest can only be used in a browser Client Component");
  }

  const origin = window.location.origin;
  return requestJson(origin, path, {
    credentials: "same-origin",
    ...options,
  });
}
