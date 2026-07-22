interface HomepageModuleFallbackProps {
  title?: string;
  message?: string;
  className?: string;
}

export function HomepageModuleFallback({
  title,
  message = "Thông tin đang được cập nhật.",
  className = "",
}: Readonly<HomepageModuleFallbackProps>) {
  return (
    <div
      role="status"
      className={`rounded-lg border border-border bg-surface p-6 text-center text-muted-foreground ${className}`.trim()}
    >
      {title && <h3 className="mb-2 text-body font-semibold text-foreground">{title}</h3>}
      <p className="text-body-small">{message}</p>
    </div>
  );
}
