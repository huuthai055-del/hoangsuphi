import Link from "next/link";
import { SITE_ROUTES } from "@/components/navigation/navigation-config";

interface SiteBrandProps {
  className?: string;
}

export function SiteBrand({ className = "" }: Readonly<SiteBrandProps>) {
  return (
    <Link
      href={SITE_ROUTES.home}
      className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-sm text-h3 font-bold text-primary transition-colors duration-[var(--duration-fast)] hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${className}`.trim()}
      aria-label="Trang chủ Du lịch Hoàng Su Phì"
    >
      Hoàng Su Phì
    </Link>
  );
}
