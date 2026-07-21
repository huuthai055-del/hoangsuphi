# Vị trí, Nearby và Chỉ đường — Architecture Decision Record

**Trạng thái:** APPROVED (DG-5.0-01, 2026-07-20)

## Quyết định

Phase 5 không triển khai interactive map. Không cài Leaflet, Mapbox, Google Maps JavaScript API hay tile provider; không có `/ban-do`, map preview, marker/cluster, map filter hoặc List↔Map.

Vị trí là dữ liệu public projection đã xác minh. “Gần tôi” dùng `GET /api/v1/nearby` để hiển thị danh sách sắp xếp theo khoảng cách, không phải một map island. Nếu người dùng cấp quyền, điểm gốc là tọa độ thiết bị. Nếu từ chối hoặc không có vị trí, UI cho chọn một cơ sở hoặc khu vực có tọa độ public hợp lệ làm điểm gốc; không suy đoán tọa độ ở frontend.

Nút **Chỉ đường** chỉ xuất hiện khi có latitude/longitude hợp lệ và mở:

```text
https://www.google.com/maps/dir/?api=1&destination={latitude},{longitude}&travelmode=driving
```

## Filter và khả năng truy cập

- Lưu trú/Ăn uống dùng `types=business`; Điểm tham quan dùng `types=attraction`; ATM/Trạm xăng/WC dùng `types=utility`.
- Khi cần `categoryId`, frontend resolve nhãn qua public reference API trước khi gọi Nearby; không hard-code UUID.
- Danh sách khoảng cách là UI chính, đọc được bằng keyboard/screen reader và không có map fallback riêng.
- Khi không có tọa độ hợp lệ, ẩn “Chỉ đường” và giải thích ngắn cách chọn điểm gốc cho Nearby.
