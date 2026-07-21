import { describe, expect, test } from "bun:test";
import { parseAuthResponse } from "@/lib/auth/contracts";

describe("parseAuthResponse", () => {
  test("extracts tokens and strips them from the browser payload", () => {
    const result = parseAuthResponse({
      data: {
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        user: { id: "user-1" },
      },
    });

    expect(result.tokens).toMatchObject({
      accessToken: "access-secret",
      refreshToken: "refresh-secret",
    });
    expect(result.publicPayload).toEqual({ data: { user: { id: "user-1" } } });
  });

  test("supports snake_case token fields", () => {
    const result = parseAuthResponse({
      access_token: "access-secret",
      expires_in: 900,
    });
    expect(result.tokens.accessToken).toBe("access-secret");
    expect(result.tokens.accessExpiresInSeconds).toBe(900);
  });

  test("rejects responses without an access token", () => {
    expect(() => parseAuthResponse({ data: { user: {} } })).toThrow();
  });
});
