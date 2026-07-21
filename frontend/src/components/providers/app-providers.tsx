"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/auth/session-context";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return <SessionProvider>{children}</SessionProvider>;
}
