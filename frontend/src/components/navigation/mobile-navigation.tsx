"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/session-context";
import {
  isNavigationItemActive,
  NAVIGATION_CONFIG,
  SITE_ACTIONS,
} from "./navigation-config";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isFocusable(element: HTMLElement): boolean {
  return (
    !element.hasAttribute("disabled") &&
    !element.hidden &&
    element.getAttribute("aria-hidden") !== "true"
  );
}

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const titleId = useId();

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, searchKey]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => {
        trigger?.focus();
      });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(isFocusable);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu, isOpen]);

  const dialog = isOpen ? (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng menu điều hướng"
        className="fixed inset-0 z-[var(--z-overlay)] cursor-default bg-overlay backdrop-blur-sm"
        onClick={closeMenu}
      />
      <div
        id={menuId}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-[var(--z-dialog)] flex w-full max-w-sm flex-col overflow-y-auto bg-surface p-6 shadow-elevated focus:outline-none"
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 id={titleId} className="text-h4 font-bold text-primary">
            Menu
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Đóng menu"
            onClick={closeMenu}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav aria-label="Điều hướng trên thiết bị di động">
          <ul className="flex flex-col gap-2">
            {NAVIGATION_CONFIG.filter((item) => item.showInMobile).map(
              (item) => {
                const isActive = isNavigationItemActive(
                  item,
                  pathname,
                  searchParams,
                );

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-11 items-center rounded-md px-3 py-2 text-body-large font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                        isActive
                          ? "bg-muted text-primary"
                          : "text-foreground hover:bg-muted hover:text-primary-hover"
                      }`}
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </nav>

        {isAuthenticated ? (
          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-6">
            <Link
              href={SITE_ACTIONS.favorites.href}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              onClick={closeMenu}
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
              {SITE_ACTIONS.favorites.label}
            </Link>
            <Link
              href={SITE_ACTIONS.account.href}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-body font-medium text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              onClick={closeMenu}
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
              {SITE_ACTIONS.account.label}
            </Link>
          </div>
        ) : null}
      </div>
    </>
  ) : null;

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={menuId}
        aria-label={isOpen ? "Đóng menu" : "Mở menu"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isOpen ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {dialog ? createPortal(dialog, document.body) : null}
    </div>
  );
}
