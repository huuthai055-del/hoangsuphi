import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/navigation/skip-link";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: Readonly<SiteShellProps>) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <div id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
