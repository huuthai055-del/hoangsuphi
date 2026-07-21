import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";

export const metadata = {
  title: "404 - Không tìm thấy trang",
  robots: "noindex,follow",
};

export default function NotFound() {
  return (
    <div className="layout-container py-12 md:py-20">
      <EmptyState
        title="Không tìm thấy trang"
        description="Đường dẫn có thể đã thay đổi hoặc nội dung không còn được công khai."
        action={<LinkButton href="/">Trở về trang chủ</LinkButton>}
      />
    </div>
  );
}
