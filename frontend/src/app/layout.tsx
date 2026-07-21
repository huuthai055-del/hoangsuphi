import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/layout/site-shell";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "Du lịch Hoàng Su Phì",
    template: "%s | Du lịch Hoàng Su Phì",
  },
  description:
    "Khám phá điểm đến, lưu trú, ẩm thực và cẩm nang du lịch Hoàng Su Phì.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="vi" className="h-full">
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
      </body>
    </html>
  );
}
