export type AuthTokens = Readonly<{
  accessToken: string;
  refreshToken?: string;
  accessExpiresInSeconds?: number;
  refreshExpiresInSeconds?: number;
}>;

export type ParsedAuthResponse = Readonly<{
  tokens: AuthTokens;
  publicPayload: unknown;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, ...keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function readPositiveInteger(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

function removeTokenFields(record: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...record };
  for (const key of [
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "expiresIn",
    "expires_in",
    "accessExpiresIn",
    "access_expires_in",
    "refreshExpiresIn",
    "refresh_expires_in",
  ]) {
    delete copy[key];
  }
  return copy;
}

/**
 * Accepts the common { data: tokenPayload } envelope or a direct token payload.
 * This is deliberately tolerant at the token extraction boundary while the
 * public response is stripped of all token fields before returning to browser JS.
 */
export function parseAuthResponse(input: unknown): ParsedAuthResponse {
  const root = asRecord(input);
  if (!root) {
    throw new Error("Authentication response must be an object");
  }

  const dataRecord = asRecord(root.data);
  const tokenRecord = dataRecord ?? root;
  const accessToken = readString(tokenRecord, "accessToken", "access_token");
  if (!accessToken) {
    throw new Error("Authentication response did not include an access token");
  }

  const refreshToken = readString(tokenRecord, "refreshToken", "refresh_token");
  const tokens: AuthTokens = {
    accessToken,
    refreshToken,
    accessExpiresInSeconds: readPositiveInteger(
      tokenRecord,
      "accessExpiresIn",
      "access_expires_in",
      "expiresIn",
      "expires_in",
    ),
    refreshExpiresInSeconds: readPositiveInteger(
      tokenRecord,
      "refreshExpiresIn",
      "refresh_expires_in",
    ),
  };

  if (dataRecord) {
    return {
      tokens,
      publicPayload: {
        ...root,
        data: removeTokenFields(dataRecord),
      },
    };
  }

  return {
    tokens,
    publicPayload: removeTokenFields(root),
  };
}
