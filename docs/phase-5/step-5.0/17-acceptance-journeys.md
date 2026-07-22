# Acceptance Journeys

## 1. Khám phá mùa vụ (P0)

- Vào `/` → đọc Harvest status → chọn vùng → mở `/khu-vuc/[slug]`.
- Kỳ vọng: dữ liệu dùng `/api/v1/harvest-status` hoặc timeline vùng; UI có fallback nếu mô-đun phụ lỗi.

## 2. Tìm kiếm và cursor (P0)

- Vào `/tim-kiem` → nhập `Homestay` (tối thiểu 2 ký tự) → thêm `regionId=<UUID>` từ một lựa chọn đã resolve → tải thêm.
- Kỳ vọng: URL dùng query backend hỗ trợ như `q`, `regionId`, `cursor`; đổi filter bỏ cursor. Cursor lỗi hiển thị nút “Tải lại từ đầu”, không redirect tự động.

## 3. Chi tiết và liên hệ (P0 — sau GAP-01/02)

- Mở `/co-so/[slug]` có projection public-safe, phone và/hoặc `zaloUrl` hợp lệ.
- Kỳ vọng: Gọi mở `tel:` chỉ khi có phone; Zalo chỉ xuất hiện khi có `zaloUrl`; không có contact thì CTA bị ẩn, không thay bằng giá trị suy diễn.

## 4. Tiện ích gần nhất (P1 — DG-5.0-01 approved)

- Mở “Gần tôi” từ `/tim-kiem` → cho phép vị trí hoặc chọn cơ sở/khu vực có tọa độ hợp lệ → lọc `utility` (ATM/Trạm xăng/WC).
- Kỳ vọng: Nearby luôn nhận `lat`/`lng`, sắp xếp theo khoảng cách; khi không có quyền vị trí, danh sách vẫn thao tác được với điểm gốc được chọn. Không có `/ban-do` hoặc interactive map.

## 5. Cẩm nang đến nội dung liên quan (P1 — sau GAP-01)

- Mở `/cam-nang/[slug]` → theo liên kết nội bộ sang entity liên quan.
- Kỳ vọng: link canonical, metadata SEO giữ nguyên contract Phase 4.

## 6. Lưu yêu thích (P2 — sau DG-5.0-02)

- Người dùng ẩn danh bấm Lưu → đăng nhập → trở về `returnTo` nội bộ đã validate → lưu qua BFF.
- Kỳ vọng: token không lộ ra client; trạng thái thành công/lỗi rõ ràng.
