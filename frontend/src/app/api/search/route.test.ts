import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

function createRequest(urlPath: string): NextRequest {
  return new NextRequest(`http://localhost:3000${urlPath}`);
}

describe("Same-Origin Search BFF Route (/api/search)", () => {
  test("returns 400 Problem Details when q is missing", async () => {
    const req = createRequest("/api/search");
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const json = await res.json();
    expect(json.title).toBe("Validation error");
    expect(json.status).toBe(400);
    expect(json.detail).toContain("at least 2 characters");
  });

  test("returns 400 Problem Details when q has less than 2 characters", async () => {
    const req = createRequest("/api/search?q=a");
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/problem+json");

    const json = await res.json();
    expect(json.status).toBe(400);
  });

  test("normalizes whitespace before applying the minimum query length", async () => {
    const req = createRequest("/api/search?q=%20a%20");
    const res = await GET(req);

    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  test("returns 400 Problem Details when q exceeds 200 characters", async () => {
    const longQuery = "a".repeat(201);
    const req = createRequest(`/api/search?q=${longQuery}`);
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.detail).toContain("200 characters");
  });
});
