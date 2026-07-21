# Step 5.0 — Approved Decisions

**Ngày:** 2026-07-20
**Nguồn:** quyết định chính thức của chủ dự án cho Step 5.0
**Trạng thái:** DG-5.0-01 đến DG-5.0-04 **APPROVED**

Tài liệu này là bản ghi quyết định hiện hành cho các gate Step 5.0. User đã chấp nhận closeout implementation GAP-01 → GAP-03 → GAP-02 tại `22-public-catalog-implementation-closeout.md`; vì vậy Step 5.0 được **LOCKED** ngày 2026-07-20.

## DG-5.0-01 — Vị trí, Nearby và chỉ đường

- Phase 5 **không dùng interactive map**: không cài Leaflet, Mapbox, Google Maps JavaScript API, tile provider, map preview, marker/cluster, map filter, List↔Map hay route `/ban-do`.
- `latitude`/`longitude` đã có trong public projection là dữ liệu chính thức cho cơ sở, địa điểm, điểm tham quan/tiện ích và khu vực. Frontend không suy đoán hay tự tạo tọa độ.
- “Gần tôi” là **danh sách khoảng cách** từ `GET /api/v1/nearby`, sắp xếp theo khoảng cách. Khi có quyền vị trí, dùng tọa độ thiết bị; khi bị từ chối hoặc không khả dụng, người dùng chọn một cơ sở hoặc khu vực có tọa độ hợp lệ làm điểm gốc. Danh sách vẫn phải dùng được trong cả hai trường hợp.
- Bộ lọc chỉ dùng contract Nearby hiện hữu và public reference đã kiểm chứng: Lưu trú/Ăn uống (`types=business`), Điểm tham quan (`types=attraction`), ATM/Trạm xăng/WC (`types=utility`); `categoryId` được resolve từ reference API, không hard-code UUID.
- Nút **Chỉ đường** chỉ hiển thị khi bản ghi có đủ tọa độ hợp lệ và mở Google Maps theo mẫu sau:

  ```text
  https://www.google.com/maps/dir/?api=1&destination={latitude},{longitude}&travelmode=driving
  ```

## DG-5.0-02 — Login và session security

- Browser chỉ giao tiếp với Next.js Route Handler/BFF; BFF mới trao đổi token với backend qua allowlist use case.
- Refresh token ở cookie `HttpOnly`; không dùng `localStorage`, `sessionStorage` hoặc bearer token trong JavaScript. Production bắt buộc `Secure` và cấu hình `SameSite` phù hợp; token thô không được trả về hay log ở browser.
- BFF phải có luồng login, refresh và logout; public page không yêu cầu đăng nhập.
- Chỉ favorite, đồng bộ dữ liệu cá nhân, review và tài khoản mới yêu cầu đăng nhập. Redirect sau login dùng `returnTo` nội bộ đã validate.

## DG-5.0-03 — Profile reduced scope

- Phase 5 chỉ phát hành phần tài khoản cơ bản đã được backend hỗ trợ: đăng xuất, đổi mật khẩu nếu endpoint hiện hữu, yêu thích và review của người dùng nếu API/permission hiện hữu đáp ứng.
- Hoãn avatar, profile nâng cao, chỉnh sửa phức tạp, social profile và mọi UI dựa trên `/auth/me` hoặc profile API chưa tồn tại.
- Không mở controlled unlock backend riêng cho Profile trong Phase 5; UI phải biểu đạt rõ permission và API hiện có.

## DG-5.0-04 — Brand direction

- Dùng hướng màu xanh núi, vàng lúa, nâu đất và nền kem; cảm giác bản địa, chân thực, rõ ràng tiếng Việt, mobile-first và ít animation.
- Ưu tiên ảnh Hoàng Su Phì xác thực; không biến giao diện thành OTA hoặc SaaS dashboard.
- CTA chuẩn: **Gọi**, **Zalo**, **Chỉ đường**, **Lưu**. CTA chỉ render khi public contract xác minh dữ liệu cần thiết.
- Placeholder được kiểm soát, tách biệt dữ liệu production. Dùng font Việt mã nguồn mở; logo/asset chính thức vẫn phải được hoàn thiện trước Phase 10/11.

## Phạm vi được điều chỉnh

**Loại khỏi Phase 5:** mọi map SDK/tile, interactive map, `/ban-do`, marker/cluster, map preview, map fallback, keyboard-map testing và chi phí tile.

**Giữ trong Phase 5:** tọa độ chính thức, Nearby, “Gần tôi”, danh sách khoảng cách, các filter đã nêu, deep link Google Maps, xử lý từ chối vị trí và fallback theo tọa độ cơ sở/khu vực.

## Hành trình nghiệm thu cần giữ

1. Khám phá mùa vụ.
2. Tìm cơ sở/địa điểm.
3. Mở chỉ đường.
4. Tìm tiện ích gần nhất.
5. Lưu yêu thích: yêu cầu đăng nhập rồi quay lại trang ban đầu.
