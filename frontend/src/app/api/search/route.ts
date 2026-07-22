import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { FrontendApiError } from "@/lib/api/errors";
import { serverApiRequest } from "@/lib/api/server-client";
import { searchAutocompleteResponseSchema } from "@/lib/search/search-contracts";

export const dynamic = "force-dynamic";

function createProblemResponse(
  title: string,
  status: number,
  detail: string,
  type = "about:blank"
) {
  return new NextResponse(
    JSON.stringify({
      type,
      title,
      status,
      detail,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
      },
    }
  );
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const rawQ = request.nextUrl.searchParams.get("q");

  const q = rawQ ? rawQ.normalize("NFC").trim() : "";

  if (q.length < 2) {
    return createProblemResponse(
      "Validation error",
      400,
      "Search query must contain at least 2 characters."
    );
  }

  if (q.length > 200) {
    return createProblemResponse(
      "Validation error",
      400,
      "Search query must not exceed 200 characters."
    );
  }

  try {
    const response = await serverApiRequest("/api/v1/search", {
      method: "GET",
      cache: "no-store",
      query: { q, limit: 8 },
      schema: searchAutocompleteResponseSchema,
      timeoutMs: 3000,
    });

    return noStoreJson(response);
  } catch (error) {
    if (error instanceof FrontendApiError && error.status && error.status < 500) {
      return createProblemResponse(
        "Bad Request",
        error.status,
        "Yêu cầu tìm kiếm không hợp lệ. Vui lòng thử lại."
      );
    }

    return createProblemResponse(
      "Service Unavailable",
      503,
      "Dịch vụ tìm kiếm tạm thời không khả dụng. Vui lòng thử lại sau."
    );
  }
}
