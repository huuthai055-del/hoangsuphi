# Backend Gap Register

| ID | Khả năng cần có | Bằng chứng hiện tại | Mức độ | Ảnh hưởng | Hành động | Unlock |
| --- | --- | --- | --- | --- | --- | --- |
| GAP-01 | Public list/detail chỉ published/active, cursor và DTO presentation | Public catalog archive/detail additive đã có | CRITICAL | Mở archive P0/P1 và homepage cards | Closeout 22 accepted and locked | 🔒 Locked |
| GAP-02 | Phone, `zaloUrl` và contact CTA đã xác minh | Contact projection additive đã có, không suy diễn Phone → Zalo | HIGH | Mở CTA liên hệ trực tiếp P0 | Closeout 22 accepted and locked | 🔒 Locked |
| GAP-03 | Public taxonomy/reference cho business type, amenity, region filter | Public reference contract đã resolve nhãn/slug an toàn | HIGH | Mở filter Lưu trú/Ăn uống theo nhãn | Closeout 22 accepted and locked | 🔒 Locked |
| GAP-04 | Homepage composition | Không có `/home` aggregate | MEDIUM | Không chặn skeleton homepage | Ghép module safe với `Promise.allSettled`; aggregate chỉ khi cần hiệu năng | Không bắt buộc |
| GAP-05 | Weather đáng tin cậy | Route tồn tại nhưng provider/runtime chưa được xác minh cho UX | MEDIUM | P1 | Defer hoặc fallback về Harvest | Không bắt buộc |
| GAP-06 | Auth BFF/session | Backend token endpoints có; BFF được duyệt nhưng chưa triển khai | MEDIUM | P2 Favorites/Auth | Implement Route Handler allowlist ở Step 5.6 | Không sửa backend trước approval riêng |
| GAP-07 | Profile | Không có `/auth/me`; display name không persist | LOW | P3 | Chỉ tài khoản cơ bản, Favorites/Logout/password/review khi API hỗ trợ | ✅ Reduced scope approved; profile nâng cao defer |

GAP-01 đến GAP-03 không được “khắc phục” bằng lọc ở frontend, hardcode ID/slug, hoặc gọi legacy API rồi che kết quả. Chúng là điều kiện cần để giao diện khách truy cập an toàn.
