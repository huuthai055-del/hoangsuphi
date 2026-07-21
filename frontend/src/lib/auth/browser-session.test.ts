import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { FrontendApiError } from "@/lib/api/errors";
import { withSessionRefresh } from "@/lib/auth/browser-session";

afterEach(() => {
  // Individual tests restore their spies.
});

describe("withSessionRefresh", () => {
  test("does not replay a request unless the caller marks it replay-safe", async () => {
    const request = async () => {
      throw new FrontendApiError("Unauthorized", {
        kind: "unauthorized",
        status: 401,
      });
    };
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );

    try {
      await expect(withSessionRefresh(request, { replaySafe: false })).rejects.toMatchObject({
        kind: "unauthorized",
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("refreshes once and retries one replay-safe request", async () => {
    let attempts = 0;
    const request = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new FrontendApiError("Unauthorized", {
          kind: "unauthorized",
          status: 401,
        });
      }
      return "ok";
    };
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    try {
      await expect(withSessionRefresh(request, { replaySafe: true })).resolves.toBe("ok");
      expect(attempts).toBe(2);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
