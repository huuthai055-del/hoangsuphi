import { NextResponse } from "next/server";
import { FrontendApiError } from "@/lib/api/errors";

export function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof FrontendApiError) {
    const status = error.status && error.status >= 400 && error.status < 600
      ? error.status
      : 502;

    return noStoreJson(
      {
        type: "about:blank",
        title:
          status >= 400 && status < 500
            ? "Authentication failed"
            : "Authentication service unavailable",
        status,
      },
      status,
    );
  }

  return noStoreJson(
    {
      type: "about:blank",
      title: "Authentication service unavailable",
      status: 502,
    },
    502,
  );
}
