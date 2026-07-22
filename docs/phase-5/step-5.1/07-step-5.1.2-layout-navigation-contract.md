# Layout & Navigation Contract

## 1. Route Taxonomy (Source of Truth)
Các route điều hướng được xây dựng và xác minh chính xác với quyết định từ Step 5.0 (Không chứa bản đồ, không yêu cầu login cho tính năng khám phá, bảo toàn SEO):

| Navigation Item | Label | Route | Match Strategy | Visibility | Surface |
| --- | --- | --- | --- | --- | --- |
| Trang chủ | Trang chủ / Logo | `/` | `exact` | public | Header, Footer |
| Khám phá | Khám phá | `/dia-diem` | `prefix` | public | Header, Mobile, Footer |
| Lưu trú | Lưu trú | `/co-so?type=homestay` | `prefix` | public | Header, Mobile, Footer |
| Ăn uống | Ăn uống | `/co-so?type=nha-hang` | `prefix` | public | Header, Mobile, Footer |
| Cẩm nang | Cẩm nang | `/cam-nang` | `prefix` | public | Header, Mobile, Footer |
| Gần tôi | Gần tôi | `/gan-toi` | `prefix` | public | Header (Icon), Mobile |
| Đã lưu | Đã lưu | `/yeu-thich` | `prefix` | authenticated | Header (Icon), Mobile |
| Tài khoản | Tài khoản | `/tai-khoan` | `prefix` | authenticated | Header (Icon), Mobile |

## 2. Server / Client Boundary
- **Server Components:** `SiteShell`, `SiteHeader`, `SiteFooter`, `SkipLink`. Các Layout tĩnh không cần state, tiết kiệm JS bundle.
- **Client Components:** `DesktopNavigation`, `MobileNavigation`. Các tính năng cần tương tác (Menu Modal, Escape key) và Active State (`usePathname`) được cô lập ở mức lá (Leaf Components) để không kéo cả Header thành Client.
