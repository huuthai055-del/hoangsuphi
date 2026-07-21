import { parseProblemDetails } from "@/lib/api/contracts";
import { apiErrorKindFromStatus, FrontendApiError } from "@/lib/api/errors";
import { formatSchemaError, type RuntimeSchema } from "@/lib/api/schema";
import { buildApiUrl, type QueryParams } from "@/lib/api/url";

export interface ApiRequestOptions<T> extends Omit<RequestInit, "body"> {
  schema: RuntimeSchema<T>;
  query?: QueryParams;
  body?: unknown;
  timeoutMs?: number;
}

type JsonReadResult = Readonly<{
  payload: unknown;
  invalidJson: boolean;
}>;

async function readJsonSafely(response: Response): Promise<JsonReadResult> {
  if (response.status === 204) {
    return { payload: undefined, invalidJson: false };
  }

  const text = await response.text();
  if (!text.trim()) {
    return { payload: undefined, invalidJson: false };
  }

  try {
    return { payload: JSON.parse(text) as unknown, invalidJson: false };
  } catch {
    return { payload: undefined, invalidJson: true };
  }
}

function createAbortContext(
  externalSignal: AbortSignal | null | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timedOut = false;

  const forwardAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) {
    forwardAbort();
  } else {
    externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", forwardAbort);
    },
  };
}

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  {
    schema,
    query,
    body,
    timeoutMs = 8000,
    headers,
    signal,
    cache = "no-store",
    ...init
  }: ApiRequestOptions<T>,
): Promise<T> {
  const url = buildApiUrl(baseUrl, path, query);
  const abort = createAbortContext(signal, timeoutMs);
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json, application/problem+json");

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...init,
      cache,
      headers: requestHeaders,
      body: requestBody,
      signal: abort.signal,
    });

    const { payload, invalidJson } = await readJsonSafely(response);

    if (!response.ok) {
      const problem = parseProblemDetails(payload, response.status);
      throw new FrontendApiError(problem.title, {
        kind: apiErrorKindFromStatus(response.status),
        status: response.status,
        problem,
        retryable: response.status === 429 || response.status >= 500,
      });
    }

    if (invalidJson) {
      throw new FrontendApiError("Backend returned invalid JSON", {
        kind: "invalid-response",
        status: response.status,
      });
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new FrontendApiError(
        "Backend response did not match the expected contract",
        {
          kind: "invalid-response",
          status: response.status,
          cause: formatSchemaError(parsed.error),
        },
      );
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof FrontendApiError) {
      throw error;
    }

    if (abort.didTimeout()) {
      throw new FrontendApiError("API request timed out", {
        kind: "timeout",
        retryable: true,
        cause: error,
      });
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FrontendApiError("API request was aborted", {
        kind: "network",
        retryable: false,
        cause: error,
      });
    }

    throw new FrontendApiError("Unable to reach the backend", {
      kind: "network",
      retryable: true,
      cause: error,
    });
  } finally {
    abort.cleanup();
  }
}
