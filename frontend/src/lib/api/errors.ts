import type { ProblemDetails } from "@/lib/api/contracts";

export type FrontendApiErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limited"
  | "timeout"
  | "network"
  | "invalid-response"
  | "server"
  | "unknown";

export class FrontendApiError extends Error {
  readonly kind: FrontendApiErrorKind;
  readonly status?: number;
  readonly problem?: ProblemDetails;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: Readonly<{
      kind: FrontendApiErrorKind;
      status?: number;
      problem?: ProblemDetails;
      retryable?: boolean;
      cause?: unknown;
    }>,
  ) {
    super(message, { cause: options.cause });
    this.name = "FrontendApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.problem = options.problem;
    this.retryable = options.retryable ?? false;
  }
}

export function apiErrorKindFromStatus(status: number): FrontendApiErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server";
  return "unknown";
}

export function safeUserMessage(error: unknown): string {
  if (!(error instanceof FrontendApiError)) {
    return "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
  }

  switch (error.kind) {
    case "validation":
      return "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.";
    case "unauthorized":
      return "Bạn cần đăng nhập để tiếp tục.";
    case "forbidden":
      return "Bạn không có quyền thực hiện thao tác này.";
    case "not-found":
      return "Không tìm thấy nội dung yêu cầu.";
    case "conflict":
      return "Dữ liệu đã thay đổi. Vui lòng tải lại và thử lần nữa.";
    case "rate-limited":
      return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    case "timeout":
      return "Kết nối mất quá nhiều thời gian. Vui lòng thử lại.";
    case "network":
      return "Không thể kết nối tới máy chủ. Hãy kiểm tra mạng và thử lại.";
    case "invalid-response":
    case "server":
    case "unknown":
    default:
      return "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
  }
}
