import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionHeadingProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
}

export function SectionHeading({
  title,
  description,
  action,
  headingLevel = 2,
  className,
  ...props
}: Readonly<SectionHeadingProps>) {
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 3 ? "h3" : "h4";
  const headingClass = headingLevel === 2 ? "text-h2" : headingLevel === 3 ? "text-h3" : "text-h4";

  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}
      {...props}
    >
      <div className="max-w-3xl">
        <Heading className={cn(headingClass, "text-foreground")}>{title}</Heading>
        {description ? (
          <p className="mt-2 text-body text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
