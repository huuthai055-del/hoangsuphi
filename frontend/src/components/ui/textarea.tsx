import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { className, invalid = false, "aria-invalid": ariaInvalid, ...props },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        className={cn(
          "min-h-28 w-full resize-y rounded-md border border-input bg-surface px-3 py-2 text-body text-foreground shadow-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
          invalid && "border-danger focus-visible:border-danger focus-visible:ring-danger/20",
          className,
        )}
        {...props}
      />
    );
  },
);
