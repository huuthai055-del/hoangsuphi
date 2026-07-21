import { describe, expect, test } from "bun:test";
import { buildApiUrl, encodePathSegment } from "@/lib/api/url";

describe("API URL utilities", () => {
  test("preserves opaque cursor values and repeats array filters", () => {
    const url = buildApiUrl("https://api.example", "/api/v1/public/catalog/business", {
      cursor: "opaque.cursor/value",
      types: ["homestay", "restaurant"],
      limit: 20,
    });

    expect(url.pathname).toBe("/api/v1/public/catalog/business");
    expect(url.searchParams.get("cursor")).toBe("opaque.cursor/value");
    expect(url.searchParams.getAll("types")).toEqual(["homestay", "restaurant"]);
  });

  test("rejects external paths and unsafe path segments", () => {
    for (const unsafePath of [
      "https://evil.example",
      "//evil.example/api",
      "/api/test?next=https://evil.example",
      "/api/test#fragment",
      "/api/%2e%2e/secret",
      "/api/%2f%2fevil.example",
      "/api/%5csecret",
    ]) {
      expect(() => buildApiUrl("https://api.example", unsafePath)).toThrow();
    }
    expect(() => encodePathSegment("../secret")).toThrow();
  });
});
