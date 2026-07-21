import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function InlineError({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p
      role="alert"
      className={cn("text-body-small font-medium text-danger", className)}
      {...props}
    />
  );
}
