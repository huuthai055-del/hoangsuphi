import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  getButtonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";

export interface LinkButtonProps
  extends LinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: Readonly<LinkButtonProps>) {
  return (
    <Link
      className={getButtonClassName({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
