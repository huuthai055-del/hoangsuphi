import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}

export function FieldDescription({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p className={cn("text-body-small text-muted-foreground", className)} {...props} />
  );
}

export interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function FieldError({
  className,
  children,
  ...props
}: Readonly<FieldErrorProps>) {
  return (
    <p
      role="alert"
      className={cn("text-body-small font-medium text-danger", className)}
      {...props}
    >
      {children}
    </p>
  );
}
