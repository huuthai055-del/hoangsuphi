# Component Inventory (Step 5.1.2)

Dưới đây là danh sách các UI Components đã được tạo lập trong bước này để thiết lập Layout Foundation:

### 1. `SiteShell`
- **Mục đích:** Bọc toàn bộ các vùng chính (Header, Main, Footer, SkipLink).
- **Type:** Server Component.
- **Test:** Pass.

### 2. `SiteHeader`
- **Mục đích:** Sticky outer shell cho Logo, Desktop Nav, Mobile Nav và Action icons.
- **Type:** Server Component.
- **Test:** Pass.

### 3. `SiteFooter`
- **Mục đích:** Link grid phần chân trang (Khám phá, Hỗ trợ, Copyright).
- **Type:** Server Component.
- **Test:** Pass.

### 4. `SkipLink`
- **Mục đích:** Giúp Screen Reader và Keyboard User nhảy thẳng đến `#main-content`.
- **Type:** Server Component.
- **Accessibility:** `sr-only`, `focus:not-sr-only`.

### 5. `DesktopNavigation`
- **Mục đích:** Hiển thị List menu ngang ở Desktop (từ breakpoing `lg`).
- **Type:** Client Component (`usePathname`).
- **Accessibility:** Sử dụng `aria-current="page"` khi active.

### 6. `MobileNavigation`
- **Mục đích:** Hiển thị Hamburger Button và Menu trượt ra ở Mobile (dưới `lg`).
- **Type:** Client Component (`useState`, `useEffect`).
- **Accessibility:** Hỗ trợ phím `Escape` đóng menu, khóa Body Scroll, `aria-expanded`, và backdrop overlay.

### 7. `SiteBrand`
- **Mục đích:** Chứa Logo/Wordmark văn bản.
- **Type:** Server Component.
- **Accessibility:** Focus outline chuẩn, aria-label "Trang chủ Du lịch Hoàng Su Phì".
