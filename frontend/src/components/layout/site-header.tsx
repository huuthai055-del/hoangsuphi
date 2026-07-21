import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { SiteBrand } from "@/components/brand/site-brand";
import { DesktopNavigation } from "@/components/navigation/desktop-navigation";
import { HeaderSessionActions } from "@/components/navigation/header-session-actions";
import { MobileNavigation } from "@/components/navigation/mobile-navigation";
import {
  NAVIGATION_CONFIG,
  SITE_ACTIONS,
} from "@/components/navigation/navigation-config";

interface HeaderActionLinkProps {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}

function HeaderActionLink({
  href,
  label,
  className = "",
  children,
}: Readonly<HeaderActionLinkProps>) {
  return (
    <Link
      href={href}
      title={label}
      className={`size-11 items-center justify-center rounded-md text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${className}`.trim()}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Link>
  );
}

function DesktopNavigationFallback() {
  return (
    <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
      {NAVIGATION_CONFIG.filter((item) => item.showInHeader).map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-body-small font-medium text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileNavigationFallback() {
  return <span aria-hidden="true" className="size-11 lg:hidden" />;
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-header)] w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="layout-container flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-5 xl:gap-8">
          <SiteBrand />
          <Suspense fallback={<DesktopNavigationFallback />}>
            <DesktopNavigation />
          </Suspense>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <HeaderActionLink
            href={SITE_ACTIONS.search.href}
            label={SITE_ACTIONS.search.label}
            className="inline-flex"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </HeaderActionLink>
          <HeaderActionLink
            href={SITE_ACTIONS.nearby.href}
            label={SITE_ACTIONS.nearby.label}
            className="hidden sm:inline-flex"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </HeaderActionLink>
          <HeaderSessionActions />

          <Suspense fallback={<MobileNavigationFallback />}>
            <MobileNavigation />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
