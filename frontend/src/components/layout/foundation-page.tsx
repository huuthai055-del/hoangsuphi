import type { ReactNode } from "react";
import { EmptyState, SectionHeading } from "@/components/ui";

interface FoundationPageProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function FoundationPage({
  title,
  description,
  children,
}: Readonly<FoundationPageProps>) {
  return (
    <main className="layout-container py-8 md:py-12">
      <SectionHeading title={title} description={description} />
      <div className="mt-8">
        {children ?? (
          <EmptyState
            title="Nội dung đang được kết nối"
            description="Nền tảng giao diện đã sẵn sàng. Dữ liệu và hành trình chi tiết sẽ được triển khai ở các bước tính năng tiếp theo."
          />
        )}
      </div>
    </main>
  );
}
