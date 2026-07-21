"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function Error({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <div className="layout-container py-12 md:py-20">
      <ErrorState
        title="Không thể tải trang"
        description="Hệ thống đang gặp sự cố tạm thời. Bạn có thể thử tải lại nội dung."
        action={<Button onClick={reset}>Thử lại</Button>}
      />
    </div>
  );
}
