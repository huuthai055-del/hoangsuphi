import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface text-foreground shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("grid gap-2 p-5 md:p-6", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("px-5 pb-5 md:px-6 md:pb-6", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3 px-5 pb-5 md:px-6 md:pb-6", className)}
      {...props}
    />
  );
}
