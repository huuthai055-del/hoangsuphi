import Link from "next/link";
import { SiteBrand } from "@/components/brand/site-brand";
import {
  FOOTER_SUPPORT_LINKS,
  NAVIGATION_CONFIG,
} from "@/components/navigation/navigation-config";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="layout-container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <SiteBrand className="mb-4" />
            <p className="max-w-sm text-body text-muted-foreground">
              Khám phá điểm đến, lưu trú, ẩm thực và cẩm nang du lịch Hoàng
              Su Phì.
            </p>
          </div>

          <nav aria-labelledby="footer-explore-heading">
            <h2 id="footer-explore-heading" className="mb-4 text-body font-bold">
              Khám phá
            </h2>
            <ul className="flex flex-col gap-1">
              {NAVIGATION_CONFIG.filter((item) => item.showInFooter).map(
                (item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 items-center rounded-sm text-body-small text-muted-foreground transition-colors duration-[var(--duration-fast)] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <nav aria-labelledby="footer-support-heading">
            <h2 id="footer-support-heading" className="mb-4 text-body font-bold">
              Hỗ trợ
            </h2>
            <ul className="flex flex-col gap-1">
              {FOOTER_SUPPORT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-sm text-body-small text-muted-foreground transition-colors duration-[var(--duration-fast)] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center md:text-left">
          <p className="text-caption">
            &copy; {currentYear} Du lịch Hoàng Su Phì.
          </p>
        </div>
      </div>
    </footer>
  );
}
