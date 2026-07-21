import { describe, expect, spyOn, test } from "bun:test";
import { FrontendApiError } from "@/lib/api/errors";
import { requestJson } from "@/lib/api/request";
import type { RuntimeSchema } from "@/lib/api/schema";

const objectSchema: RuntimeSchema<{ data: string }> = {
  safeParse(input) {
    if (
      typeof input === "object" &&
      input !== null &&
      "data" in input &&
      typeof (input as { data?: unknown }).data === "string"
    ) {
      return { success: true, data: input as { data: string } };
    }
    return { success: false, error: new Error("invalid object") };
  },
};

describe("requestJson", () => {
  test("validates successful responses and defaults to no-store", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      await expect(
        requestJson("https://api.example", "/api/test", {
          method: "GET",
          schema: objectSchema,
        }),
      ).resolves.toEqual({ data: "ok" });
      expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("maps RFC 7807 responses without exposing raw technical detail", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ title: "Validation failed", status: 422, code: "VAL_001" }),
        { status: 422, headers: { "Content-Type": "application/problem+json" } },
      ),
    );
    try {
      await expect(
        requestJson("https://api.example", "/api/test", {
          method: "GET",
          schema: objectSchema,
        }),
      ).rejects.toMatchObject({
        name: "FrontendApiError",
        kind: "validation",
        status: 422,
      } satisfies Partial<FrontendApiError>);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("rejects responses that do not match the runtime schema", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: 123 }), { status: 200 }),
    );
    try {
      await expect(
        requestJson("https://api.example", "/api/test", {
          method: "GET",
          schema: objectSchema,
        }),
      ).rejects.toMatchObject({ kind: "invalid-response" });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("preserves the HTTP status when an error response is not JSON", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );
    try {
      await expect(
        requestJson("https://api.example", "/api/test", {
          method: "GET",
          schema: objectSchema,
        }),
      ).rejects.toMatchObject({ kind: "unauthorized", status: 401 });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
