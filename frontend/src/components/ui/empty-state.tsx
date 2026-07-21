import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: Readonly<EmptyStateProps>) {
  return (
    <section
      aria-labelledby={props["aria-labelledby"]}
      className={cn(
        "flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface p-6 text-center",
        className,
      )}
      {...props}
    >
      {icon ? <div aria-hidden="true" className="mb-4 text-primary">{icon}</div> : null}
      <h2 className="text-h3">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-xl text-body text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
