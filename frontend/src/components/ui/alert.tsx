import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AlertVariant = "info" | "success" | "warning" | "danger";

const variantClasses: Record<AlertVariant, string> = {
  info: "border-info/30 bg-info/5 text-foreground",
  success: "border-success/30 bg-success/5 text-foreground",
  warning: "border-warning/30 bg-warning/5 text-foreground",
  danger: "border-danger/30 bg-danger/5 text-foreground",
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  variant?: AlertVariant;
}

export function Alert({
  title,
  variant = "info",
  className,
  children,
  role,
  ...props
}: Readonly<AlertProps>) {
  return (
    <div
      role={role ?? (variant === "danger" ? "alert" : "status")}
      className={cn("rounded-md border p-4", variantClasses[variant], className)}
      {...props}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title ? "mt-1" : undefined, "text-body-small")}>{children}</div> : null}
    </div>
  );
}
