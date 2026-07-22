"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildNearbyUrl, isValidLatitude, isValidLongitude } from "@/lib/home/nearby-url";

export type QuickNearbyErrorReason =
  | "unsupported"
  | "insecure-context"
  | "permission-denied"
  | "position-unavailable"
  | "timeout"
  | "invalid-coordinates"
  | "unknown";

export type QuickNearbyState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "error"; reason: QuickNearbyErrorReason };

export interface QuickNearbyProps {
  readonly variant?: "hero" | "section" | "compact";
  readonly className?: string;
}

const ERROR_MESSAGES: Record<QuickNearbyErrorReason, string> = {
  "permission-denied":
    "Bạn chưa cho phép truy cập vị trí. Hãy bật quyền vị trí hoặc chọn một khu vực để khám phá.",
  "position-unavailable": "Chưa thể xác định vị trí của bạn. Hãy thử lại hoặc chọn một khu vực.",
  timeout: "Việc xác định vị trí mất quá lâu. Hãy thử lại hoặc chọn một khu vực.",
  unsupported:
    "Trình duyệt của bạn không hỗ trợ xác định vị trí. Hãy chọn một khu vực để khám phá.",
  "insecure-context":
    "Không thể truy cập vị trí trong kết nối hiện tại. Hãy chọn một khu vực để khám phá.",
  "invalid-coordinates": "Vị trí nhận được không hợp lệ. Hãy thử lại.",
  unknown: "Không thể lấy vị trí lúc này. Hãy thử lại hoặc chọn một khu vực.",
};

export function QuickNearby({ variant = "section", className }: QuickNearbyProps) {
  const router = useRouter();
  const [state, setState] = useState<QuickNearbyState>({ status: "idle" });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRequestPosition = () => {
    // Concurrency guard: ignore if already requesting
    if (state.status === "requesting") return;

    // Check browser support and secure context
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "error", reason: "unsupported" });
      return;
    }

    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setState({ status: "error", reason: "insecure-context" });
      return;
    }

    setState({ status: "requesting" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;

        const { latitude, longitude } = position.coords;

        if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
          setState({ status: "error", reason: "invalid-coordinates" });
          return;
        }

        try {
          const url = buildNearbyUrl({ latitude, longitude });
          router.push(url);
        } catch {
          if (mountedRef.current) {
            setState({ status: "error", reason: "invalid-coordinates" });
          }
        }
      },
      (error) => {
        if (!mountedRef.current) return;

        let reason: QuickNearbyErrorReason = "unknown";
        if (error.code === error.PERMISSION_DENIED) {
          reason = "permission-denied";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reason = "position-unavailable";
        } else if (error.code === error.TIMEOUT) {
          reason = "timeout";
        }

        setState({ status: "error", reason });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  };

  const isRequesting = state.status === "requesting";
  const errorMessage = state.status === "error" ? ERROR_MESSAGES[state.reason] : null;

  if (variant === "hero") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className || ""}`}>
        <button
          type="button"
          onClick={handleRequestPosition}
          disabled={isRequesting}
          aria-busy={isRequesting}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-6 text-body-small font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRequesting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
              Đang xác định vị trí…
            </span>
          ) : (
            "Khám phá quanh tôi"
          )}
        </button>

        {errorMessage && (
          <div role="status" aria-live="polite" className="mt-2 text-center text-caption text-destructive-foreground bg-destructive/90 rounded-md px-3 py-1.5 backdrop-blur-sm max-w-sm">
            <span>{errorMessage}</span>
            <div className="mt-1">
              <Link href="/khu-vuc" className="underline font-semibold hover:text-white">
                Chọn khu vực &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="quick-nearby-heading"
      className={`rounded-2xl border border-border bg-surface p-6 text-center shadow-soft md:p-8 ${className || ""}`}
    >
      <h2 id="quick-nearby-heading" className="text-title font-bold text-foreground md:text-title-large">
        Địa điểm gần bạn
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-body text-muted-foreground">
        Cho phép sử dụng vị trí để xem các địa điểm và dịch vụ gần bạn nhất.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleRequestPosition}
          disabled={isRequesting}
          aria-busy={isRequesting}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-body-small font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRequesting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" aria-hidden="true" />
              Đang xác định vị trí…
            </span>
          ) : (
            "Khám phá quanh tôi"
          )}
        </button>

        <Link
          href="/khu-vuc"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-muted/40 px-5 text-body-small font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Chọn khu vực
        </Link>
      </div>

      <div role="status" aria-live="polite" className="mt-4">
        {errorMessage && (
          <p className="text-body-small font-medium text-destructive">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
