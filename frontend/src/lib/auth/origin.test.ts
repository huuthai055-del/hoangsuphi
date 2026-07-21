import { describe, expect, test } from "bun:test";
import type { NextRequest } from "next/server";
import { isSameOriginMutation } from "@/lib/auth/origin";

function request(origin: string | null, fetchSite?: string): NextRequest {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (fetchSite) headers.set("sec-fetch-site", fetchSite);
  return {
    headers,
    nextUrl: new URL("https://hoangsuphi.vn/api/auth/login"),
  } as NextRequest;
}

describe("isSameOriginMutation", () => {
  test("accepts same-origin and rejects cross-site browser requests", () => {
    expect(isSameOriginMutation(request("https://hoangsuphi.vn", "same-origin"))).toBe(true);
    expect(isSameOriginMutation(request("https://evil.example", "cross-site"))).toBe(false);
  });
});
