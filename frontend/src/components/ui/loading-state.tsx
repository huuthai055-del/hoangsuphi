import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  rows?: number;
}

export function LoadingState({
  label = "Đang tải nội dung",
  rows = 3,
  className,
  ...props
}: Readonly<LoadingStateProps>) {
  const safeRows = Math.max(1, Math.min(rows, 8));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("grid gap-4", className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: safeRows }, (_, index) => (
        <div key={index} className="rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}
