"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  isNavigationItemActive,
  NAVIGATION_CONFIG,
} from "./navigation-config";

export function DesktopNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="hidden items-center gap-1 lg:flex"
    >
      {NAVIGATION_CONFIG.filter((item) => item.showInHeader).map((item) => {
        const isActive = isNavigationItemActive(
          item,
          pathname,
          searchParams,
        );

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-md px-3 text-body-small font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              isActive
                ? "bg-muted text-primary"
                : "text-foreground hover:bg-muted hover:text-primary-hover"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
