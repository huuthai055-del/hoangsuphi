# Responsive & Accessibility Blueprint

## 1. Responsive Blueprint (Mobile-first)

Dự án ưu tiên trải nghiệm trên điện thoại (Mobile-first) với các điểm dừng (Breakpoints) cụ thể:

- **320px – 430px (P0 - Critical):**
  - Header: Chỉ hiện Logo và Hamburger menu.
  - Detail Page: Sticky Mobile CTA chỉ hiển thị các hành động có dữ liệu đã xác minh (Gọi, Zalo, Chỉ đường, Lưu); không dùng số điện thoại để suy diễn Zalo.
  - Nearby: Danh sách khoảng cách một cột, filter chạm tối thiểu 44px, không có map/toggle map.
  - Safe area padding cho các viền tai thỏ (Notch).
- **431px – 767px (Large Phones):** Bố cục tương tự, ảnh to hơn.
- **768px – 1023px (Tablets):** 
  - Listing grid chuyển sang 2 cột.
  - Nearby giữ danh sách và panel filter rõ ràng; không có bố cục Map/List.
- **1024px – 1439px (Laptops):** 
  - Header mở rộng đầy đủ Menu.
  - Listing 3-4 cột.
- **1440px – 1920px (Desktop):** 
  - Max-width container (VD: `max-w-7xl` ~1280px) để nội dung không bị bè quá mức.

## 2. Accessibility Blueprint (A11y)

Mục tiêu Lighthouse Accessibility ≥ 90.

- **Semantic HTML:** Bắt buộc dùng `header`, `nav`, `main`, `article`, `footer`.
- **Heading Hierarchy:** `<h1>` chỉ dùng 1 lần cho Tiêu đề trang. Các phân mục dùng `<h2>`, `<h3>` tuần tự.
- **Keyboard Navigation:** 
  - Phải có Focus-visible (Outline rõ ràng khi dùng phím Tab).
  - Modal/Drawer/Dialog phải có Focus trap (Giữ focus bên trong khi mở) và Focus return (Trả về nút bấm cũ khi đóng).
- **Màu sắc & Contrast:** Đảm bảo độ tương phản màu (Ratio > 4.5:1). Không phụ thuộc 100% vào màu sắc để truyền đạt lỗi (Dùng icon + text).
- **Alt Text:** Mọi ảnh phải có `alt` text. Ảnh trang trí (Decorative) dùng `alt=""`.
- **Nearby list:** Danh sách khoảng cách là giao diện chính, có heading, nhãn khoảng cách, filter và CTA Chỉ đường có accessible name; không có marker hay nội dung map cần fallback.
- **Tap Targets:** Nút bấm trên mobile tối thiểu `44px x 44px`.
- **Language:** Document phải có `<html lang="vi">`. Root layout hiện đang dùng `lang="en"`; đây là hạng mục bắt buộc của Step 5.1.
