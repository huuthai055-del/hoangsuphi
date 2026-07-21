"use client";

import Link from "next/link";
import { SITE_ACTIONS } from "@/components/navigation/navigation-config";
import { useSession } from "@/lib/auth/session-context";

const actionClassName =
  "hidden size-11 items-center justify-center rounded-md text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:inline-flex";

export function HeaderSessionActions() {
  const { isAuthenticated } = useSession();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Link
        href={SITE_ACTIONS.favorites.href}
        title={SITE_ACTIONS.favorites.label}
        className={actionClassName}
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
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <span className="sr-only">{SITE_ACTIONS.favorites.label}</span>
      </Link>
      <Link
        href={SITE_ACTIONS.account.href}
        title={SITE_ACTIONS.account.label}
        className={actionClassName}
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
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="sr-only">{SITE_ACTIONS.account.label}</span>
      </Link>
    </>
  );
}
