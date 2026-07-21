import type { AnchorHTMLAttributes, ReactNode } from "react";
import { getButtonClassName, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { SAFE_EXTERNAL_LINK_PROPS } from "@/lib/contact/external-link";

export interface ContactLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  external?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

function isSafeContactHref(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:";
  } catch {
    return /^tel:\+?[0-9]+$/.test(href);
  }
}

export function ContactLink({
  href,
  children,
  external = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  ...props
}: Readonly<ContactLinkProps>) {
  if (!isSafeContactHref(href)) {
    return null;
  }

  return (
    <a
      href={href}
      className={getButtonClassName({ variant, size, fullWidth, className })}
      {...props}
      {...(external ? SAFE_EXTERNAL_LINK_PROPS : {})}
    >
      {children}
    </a>
  );
}
