# Render Strategy

## Nguyên tắc ràng buộc

- Giữ nguyên các SEO shell và Harvest fetch hiện có: server-first với `cache: 'no-store'`. Không tự chuyển sang ISR hay thêm `revalidate` trong Phase 5.
- Dùng Server Components cho HTML/metadata; client islands chỉ dành cho tìm kiếm tương tác, danh sách Nearby và yêu thích.
- Không cache dữ liệu cá nhân. Token không bao giờ được đưa vào JavaScript phía trình duyệt.
- Không có map component, map SDK hay dynamic import map trong Phase 5.

| Phần | Chiến lược | Ràng buộc |
| --- | --- | --- |
| SEO shell hiện hữu | Server, `no-store` | Giữ contract Phase 4. |
| Harvest | Server, `no-store` | Dữ liệu biến động theo mùa. |
| Trang chủ | Server-first | Dùng `Promise.allSettled`; từng mô-đun tự fallback, không gọi unsafe legacy lists. |
| Search | SSR initial state + client island | Chỉ dùng `/api/v1/search`, criteria và opaque cursor từ URL. |
| Nearby / “Gần tôi” | Client distance-list island | `lat`/`lng` bắt buộc; dùng vị trí thiết bị nếu được cấp, nếu không dùng tọa độ cơ sở/khu vực hợp lệ. |
| Archive mới | Server-first | Chỉ sau public-safe read projection. |
| Yêu thích/Auth | BFF, `no-store` | Chỉ sau DG-5.0-02. |

Mọi thay đổi cache của SEO/Harvest là thay đổi contract Phase 4 và cần controlled unlock riêng.
