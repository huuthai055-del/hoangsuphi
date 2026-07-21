import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, icon, variant = "ghost", isLoading = false, title, disabled, ...props },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        size="icon"
        variant={variant}
        aria-label={label}
        title={title ?? label}
        aria-busy={isLoading || undefined}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
            />
            <span className="sr-only">{label}</span>
          </>
        ) : (
          <span aria-hidden="true">{icon}</span>
        )}
      </Button>
    );
  },
);
