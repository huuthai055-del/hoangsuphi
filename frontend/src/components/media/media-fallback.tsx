import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface MediaFallbackProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  decorative?: boolean;
}

export function MediaFallback({
  label = "Chưa có hình ảnh",
  decorative = false,
  className,
  ...props
}: Readonly<MediaFallbackProps>) {
  return (
    <div
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn(
        "flex min-h-32 items-center justify-center bg-muted p-4 text-center text-body-small text-muted-foreground",
        className,
      )}
      {...props}
    >
      {decorative ? null : label}
    </div>
  );
}
