import { LoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <div className="layout-container py-8 md:py-12">
      <LoadingState label="Đang tải trang" rows={3} />
    </div>
  );
}
