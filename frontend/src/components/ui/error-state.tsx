import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function ErrorState({
  title = "Không thể tải nội dung",
  description = "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
  action,
  className,
  ...props
}: Readonly<ErrorStateProps>) {
  return (
    <section
      role="alert"
      className={cn(
        "flex min-h-56 flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger/5 p-6 text-center",
        className,
      )}
      {...props}
    >
      <h2 className="text-h3 text-foreground">{title}</h2>
      <p className="mt-2 max-w-xl text-body text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
