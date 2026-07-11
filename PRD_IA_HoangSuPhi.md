# TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD) & KIẾN TRÚC THÔNG TIN (IA) - PHIÊN BẢN V3 (HOÀN CHỈNH)
## DỰ ÁN: CỔNG THÔNG TIN DU LỊCH HOÀNG SU PHÌ (HÀ GIANG)
---
**Vai trò thiết kế:** Senior UX/UI Designer, Product Manager & Full-stack Architect.
**Định hướng chiến lược:** Xây dựng cổng thông tin du lịch số 1 về Hoàng Su Phì dựa trên thế mạnh tuyệt đối về **Nội dung bản địa sâu sắc** và **Tối ưu hóa SEO nâng cao**. Hệ thống không cạnh tranh trực tiếp với các nền tảng OTA lớn (Agoda, Booking...) mà hướng tới dẫn dắt hành vi người dùng từ tìm kiếm thông tin trải nghiệm thực tế sang liên hệ đặt phòng trực tiếp và định vị tiện ích thiết yếu trên bản đồ.

---

## 1. THIẾT KẾ SITEMAP TOÀN DIỆN (SITEMAP TREE)

Sitemap được cấu trúc lại nhằm bao phủ toàn bộ các góc độ tìm kiếm của du khách, từ hình ảnh chất lượng cao đến câu hỏi thực tế trên đường đi.

```
Trang Chủ (Homepage)
├── Khám Phá Theo Mùa (Seasonal Guides)
│   ├── Mùa nước đổ (Tháng 5 - 6)
│   ├── Mùa lúa xanh (Tháng 7 - 8)
│   ├── Mùa lúa chín (Tháng 9 - 10)
│   ├── Mùa săn mây (Tháng 11 - 4)
│   ├── Mùa hoa cải & Hoa đào
│   └── Bảng cập nhật tiến độ mùa lúa (Live Harvest Status)
├── Lưu Trú (Accommodations)
│   ├── Homestay (Địa phương)
│   ├── Bungalow / Resort
│   ├── Nhà nghỉ / Khách sạn
│   └── [Chi tiết cơ sở Lưu trú (Hình ảnh, giá tham khảo, Hotline/Zalo, vị trí)]
├── Ăn Uống (Dining)
│   ├── Nhà hàng (Đặc sản)
│   ├── Quán Cafe (View ruộng bậc thang/săn mây)
│   └── [Chi tiết địa điểm Ăn uống]
├── Top Tuyển Chọn (Top Picks)
│   ├── Top Homestay đẹp nhất
│   ├── Top quán ăn ngon nên thử
│   ├── Top điểm săn mây & chụp ảnh đẹp
│   └── Top cung đường trekking thử thách
├── Cẩm Nang & Blog Tin Tức (Travel Blog & Guides)
│   ├── Kinh nghiệm du lịch (Guides)
│   ├── Mẹo & Hướng dẫn phượt (Tips & Tricks)
│   ├── Nhật ký / Review thực tế (User Stories)
│   └── Tin tức & Lễ hội văn hóa địa phương
├── Thư Viện Phương Tiện (Advanced Media Gallery)
│   ├── Góc nhìn Flycam/Drone từ trên cao
│   ├── Ảnh 360° Panorama các bản ruộng bậc thang
│   └── Video trải nghiệm du lịch
├── Bản Đồ Du Lịch Tiện Ích (Interactive & Utility Map)
│   ├── Bản đồ vị trí Homestay & Nhà hàng
│   ├── Bản đồ điểm Check-in & Săn mây
│   └── Bản đồ tiện ích khẩn cấp (Trạm xăng, ATM, WC công cộng, Điểm gửi xe)
├── Trung Tâm Hỏi-Đáp Toàn Quốc (Global FAQ Hub)
│   ├── FAQ di chuyển, xe cộ & đường xá
│   ├── FAQ tài chính & điểm rút tiền ATM
│   ├── FAQ viễn thông (Điểm sóng khỏe/yếu, 4G Viettel/Vina)
│   └── FAQ thời tiết & Trang phục chuẩn bị
└── Đặc Sản Làm Quà (Local Specialties)
    ├── Chè Shan Tuyết cổ thụ
    └── Nông sản & Quà lưu niệm địa phương
```

---

## 2. THIẾT KẾ HỆ THỐNG URL CHUẨN SEO & HỆ THỐNG TAG PHÂN LOẠI

Hệ thống URL được phân cấp mạch lạc, thân thiện với Google Bot và kết hợp chặt chẽ với hệ thống Tag động.

### 2.1. Cấu trúc URL chính:

| Phân hệ / Trang | Cấu trúc URL (Hoàng Su Phì) | Mục tiêu SEO |
| :--- | :--- | :--- |
| **Trang chủ** | `/` | Từ khóa tổng quan về du lịch Hoàng Su Phì |
| **Cẩm nang / Blog** | `/cam-nang` | Thư mục cha chứa tất cả bài viết cẩm nang |
| **Kinh nghiệm / Review**| `/cam-nang/kinh-nghiem-phuot-xe-may` | Các bài viết cẩm nang chi tiết |
| **Bài viết theo Mùa** | `/mua/mua-lua-chin` <br> `/mua/hoang-su-phi-thang-9` | Bắt các từ khóa tìm kiếm theo mốc thời gian |
| **Bài viết dạng Top** | `/top/top-10-homestay-dep-nhat-hoang-su-phi` | Tối ưu hóa từ khóa so sánh, đánh giá |
| **Hệ thống Tags** | `/tag/ruong-bac-thang` <br> `/tag/san-may` | Gom nhóm nội dung đa chiều để SEO chéo |
| **Thư viện Media** | `/gallery` <br> `/gallery/drone-ruong-bac-thang` | SEO hình ảnh / video chất lượng cao |
| **Bản đồ Tiện ích** | `/ban-do` <br> `/ban-do/tram-xang` | SEO các từ khóa định vị địa điểm thiết yếu |
| **Trung tâm Hỏi-Đáp** | `/hoi-dap` <br> `/hoi-dap/co-song-viettel-tren-chieu-lau-thi` | SEO các câu hỏi dạng truy vấn dài (Long-tail keywords) |

### 2.2. Hệ thống Tags đa chiều (Taxonomy Tags):
Thay vì chỉ lọc theo danh mục cứng, tất cả thực thể (`Business`, `Attraction`, `Article`, `Media`) đều được gắn các thẻ **Tags** để tạo mạng lưới liên kết nội bộ tự động:
*   **Tags Phong cách:** `phuot-xe-may`, `trekking`, `camping`, `du-lich-nghi-duong`, `check-in-song-ao`.
*   **Tags Đối tượng:** `gia-dinh`, `couple`, `nhom-ban`, `solo-traveler`.
*   **Tags Chủ đề:** `ruong-bac-thang`, `san-may`, `hoa-tam-giac-mach`, `van-hoa-dan-toc`.
*   **Tags Thiết bị (Dành riêng cho Media):** `flycam-drone`, `anh-360`, `gopro-action-cam`.

---

## 3. THIẾT KẾ THỰC THỂ HỆ THỐNG (ENTITY DATA MODEL)

Dưới đây là thiết kế chi tiết các thực thể dữ liệu, được bổ sung Hệ thống Media nâng cao, CMS Workflow và Tagging System.

### 3.1. Entity: `Media` (Quản lý hình ảnh/video chất lượng cao)
Thiết kế riêng một thực thể Media để SEO hình ảnh lên Google Images cực mạnh nhờ tối ưu hóa thẻ Alt, GPS Exif và thông tin bản quyền.
```typescript
interface Media {
  id: string;              // UUID
  url: string;            // URL ảnh gốc (lưu trữ trên Cloudinary/S3)
  thumbnailUrl: string;    // URL ảnh thu nhỏ (đã nén để tăng tốc độ load)
  type: 'image' | 'video' | 'panorama_360' | 'drone_footage';
  alt: string;            // Thẻ mô tả alt (Cực kỳ quan trọng để SEO Google Images)
  caption: string;        // Chú thích ảnh hiển thị dưới bài viết/gallery
  copyright: string;      // Tác giả/Nguồn ảnh (Tôn trọng bản quyền tác giả địa phương)
  latitude: number | null;  // GPS Vĩ độ (Để Google đọc EXIF định vị chính xác vị trí)
  longitude: number | null; // GPS Kinh độ
  tagIds: string[];        // Các thẻ liên quan (Ví dụ: ['san-may', 'flycam-drone'])
  createdAt: Date;
}
```

### 3.2. Entity: `Tag` (Hệ thống thẻ phân loại động)
```typescript
interface Tag {
  id: string;
  name: string;            // Tên tag (Ví dụ: Ruộng bậc thang)
  slug: string;            // Slug URL (Ví dụ: ruong-bac-thang)
  description: string;     // Mô tả tag
  isFeatured: boolean;     // Có đưa ra làm bộ lọc nổi bật ở trang chủ hay không
}
```

### 3.3. Entity: `GlobalFAQ` (Câu hỏi thường gặp toàn hệ thống)
Phục vụ Google Rich Snippets (Schema FAQPage) để hiển thị câu hỏi và câu trả lời trực tiếp ngoài công cụ tìm kiếm Google.
```typescript
interface GlobalFAQ {
  id: string;
  question: string;        // Câu hỏi (Ví dụ: Đi Hoàng Su Phì có trạm xăng nào không?)
  slug: string;            // Slug URL cho câu hỏi đơn lẻ phục vụ Voice Search
  answer: string;          // Câu trả lời ngắn gọn (Markdown)
  category: 'transport' | 'finance' | 'telecom' | 'weather' | 'general';
  tagIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4. Entity: `Article` (Bài viết / Cẩm nang với CMS Workflow)
Thiết kế quy trình duyệt bài chuyên nghiệp cho ban biên tập nhằm đảm bảo chất lượng nội dung trước khi xuất bản.
```typescript
interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;         // Rich Text / Markdown
  thumbnailId: string;     // Liên kết với Entity Media
  authorId: string;
  categoryId: string;
  tagIds: string[];        // Hệ thống tag liên kết
  viewCount: number;
  isFeatured: boolean;
  
  // CMS Workflow States
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  version: number;         // Phiên bản sửa đổi (Ví dụ: 1, 2, 3...)
  versionHistory: {
    editorId: string;
    updatedAt: Date;
    changeSummary: string; // Nội dung cập nhật (Ví dụ: Cập nhật tình hình hoa tam giác mạch)
  }[];
  
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.5. Entity: `Business` (Doanh nghiệp/Homestay) & `Attraction` (Điểm đến & Tiện ích)
*   **`Business`**: Trường `images: string[]` được thay thế bằng `mediaIds: string[]` (liên kết thực thể `Media`). Bổ sung `tagIds: string[]`.
*   **`Attraction`**: Trường `images: string[]` được thay thế bằng `mediaIds: string[]`. Bổ sung `tagIds: string[]`. Thêm phân loại tiện ích: `'parking' | 'gas_station' | 'atm' | 'restroom' | 'natural' | 'cultural' | 'viewpoint'`.

---

## 4. BỘ MÁY TÌM KIẾM TOÀN DIỆN (SEARCH SYSTEM DESIGN)

Một hệ thống thông tin lớn đòi hỏi công cụ tìm kiếm hoạt động cực kỳ mượt mà.

### 4.1. Chức năng tìm kiếm cốt lõi:
*   **Global Search Bar (Đặt trên Header)**: Tìm kiếm tức thời trên toàn hệ thống (Bài viết, Homestay, Địa điểm, Chợ phiên).
*   **Autocomplete (Tự động hoàn thành)**: Khi người dùng gõ 2 ký tự, hệ thống hiển thị danh sách gợi ý phân loại rõ ràng:
    *   *Khu vực:* Bản Phùng, Thông Nguyên...
    *   *Lưu trú:* Chí Tài Homestay, Nam Son Bungalow...
    *   *Bài viết:* Kinh nghiệm phượt xe máy...
*   **Search-as-you-type (Tìm kiếm thời gian thực)**: Kết quả tìm kiếm thay đổi ngay lập tức trên trang kết quả khi người dùng lọc tag hoặc gõ từ khóa mà không cần tải lại trang.

### 4.2. Lộ trình nâng cấp công kiếm:
*   **Giai đoạn 1 (Hiện tại):** Tích hợp tìm kiếm Full-text Search trên Postgres/MySQL hoặc sử dụng Algolia/Typesense để đạt tốc độ tìm kiếm dưới 50ms.
*   **Giai đoạn 2 (Tương lai):** Phát triển **AI Semantic Search** (Tìm kiếm ngữ nghĩa bằng mô hình Vector Embeddings). Người dùng có thể gõ câu hỏi tự nhiên: *"Nên ở homestay nào view đẹp có chỗ đỗ xe 16 chỗ?"*, AI sẽ tự động phân tích và trả về các homestay phù hợp nhất thay vì chỉ tìm các từ khóa khớp chính xác.

---

## 5. THIẾT KẾ ĐIỀU HƯỚNG & TRẢI NGHIỆM CHI TIẾT TỪNG TRANG

### 5.1. Trang Chủ (Homepage) - Thiết kế lại
*   **Header**: Logo, Global Search Bar (với tính năng Autocomplete gợi ý), Danh mục Mega Menu, chọn ngôn ngữ.
*   **Live Status & Live Map Widget**:
    *   Bảng trạng thái lúa chín (Do Admin cập nhật live).
    *   Widget bản đồ tiện ích ăn liền: `[Tìm trạm xăng gần nhất]`, `[Tìm ATM]`, `[Chỗ gửi xe ô tô]`.
*   **Seasonal Navigation Carousel**: Khám phá Hoàng Su Phì qua các mùa trong năm.
*   **Top Picks Grid**: Giới thiệu các danh sách xếp hạng chất lượng cao (Top 10 homestay đẹp nhất, top săn mây...).
*   **Tag Cloud (Đám mây từ khóa)**: Hiển thị các tag nổi bật như `#ruong-bac-thang`, `#san-may`, `#trekking-chieu-lau-thi` để người dùng click khám phá ngay.

### 6.2. Trang Chi Tiết Homestay / Doanh Nghiệp (Tập trung SEO & Chuyển đổi trực tiếp)
Khắc phục triệt để lỗi thiếu liên kết và dữ liệu cấu trúc của các web du lịch Việt Nam:
*   **Header & Gallery**: Tích hợp hình ảnh định dạng thế hệ mới (WebP/AVIF), tự động tải kích thước phù hợp với thiết bị, đầy đủ thẻ Alt tối ưu SEO.
*   **Direct Contact Box (Sticky Mobile Bar)**:
    *   Nút Gọi (Call), Zalo, Messenger, chỉ đường Google Maps.
*   **Nearby Widget (Địa điểm lân cận)**: Tự động tính toán khoảng cách địa lý dựa trên tọa độ để gợi ý: "Cơ sở ăn uống cách đây 1.5km", "ATM cách đây 2km", "Trạm xăng cách đây 4km".
*   **Related Articles (Bài viết liên quan)**: Hiển thị cẩm nang du lịch khu vực đó để giữ chân người dùng (Ví dụ: đang xem Homestay ở Bản Phùng sẽ thấy bài viết "Kinh nghiệm du lịch Bản Phùng").

---

## 6. TIÊU CHUẨN TỐI ƯU SEO ON-PAGE & DỮ LIỆU CẤU TRÚC (STRUCTURED DATA)

Đây là vũ khí chiến lược cốt lõi để trang web đạt vị trí Top 1 Google nhanh chóng và bền vững. Hệ thống tự động nhúng các đoạn mã JSON-LD chuẩn Schema.org vào mã nguồn HTML của từng trang:

### 6.1. Dữ liệu cấu trúc Schema JSON-LD chi tiết:

#### A. Schema dành cho Homestay / Doanh nghiệp (`LocalBusiness` / `LodgingBusiness`)
Giúp Google hiểu rõ thực thể địa lý, số điện thoại, khoảng giá và xếp hạng đánh giá để hiển thị nổi bật trên Google Search và Google Maps.
```json
{
  "@context": "https://schema.org",
  "@type": "BedAndBreakfast",
  "name": "Chí Tài Homestay",
  "image": "https://hoangsuphi.vn/images/chi-tai-homestay.webp",
  "@id": "https://hoangsuphi.vn/homestay/chi-tai-homestay",
  "url": "https://hoangsuphi.vn/homestay/chi-tai-homestay",
  "telephone": "+84912345678",
  "priceRange": "VND 300,000 - VND 600,000",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Bản Phùng",
    "addressLocality": "Hoàng Su Phì",
    "addressRegion": "Hà Giang",
    "addressCountry": "VN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 22.754321,
    "longitude": 104.654321
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "24"
  }
}
```

#### B. Schema dành cho Bài viết / Cẩm nang (`Article` / `BlogPosting`)
Giúp bài viết cẩm nang du lịch và các trang theo Mùa dễ dàng lọt vào danh mục Google News và hiển thị đẹp mắt ngoài Google.
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Kinh nghiệm du lịch Hoàng Su Phì mùa lúa chín tự túc từ A-Z",
  "image": "https://hoangsuphi.vn/images/kinh-nghiem-lua-chin.webp",
  "author": {
    "@type": "Person",
    "name": "Hoàng Su Phì Editor"
  },
  "publisher": {
    "@type": "Organization",
    "name": "HoangSuPhi.vn",
    "logo": {
      "@type": "ImageObject",
      "url": "https://hoangsuphi.vn/logo.png"
    }
  },
  "datePublished": "2026-09-01T08:00:00+07:00",
  "dateModified": "2026-09-10T10:30:00+07:00"
}
```

#### C. Schema dành cho Câu hỏi thường gặp (`FAQPage`)
Giúp các câu hỏi đáp kỹ thuật (Điện thoại sóng nào khỏe, cách rút tiền ATM...) hiển thị trực tiếp dạng Dropdown trên kết quả tìm kiếm Google, tăng tỷ lệ nhấp chuột (CTR) lên đến 30%.
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Thời điểm nào đẹp nhất để đi ngắm lúa chín tại Hoàng Su Phì?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Thời điểm ngắm lúa chín đẹp nhất là từ giữa tháng 9 đến đầu tháng 10 hàng năm. Trong đó Bản Phùng và Bản Luốc là hai khu vực lúa chín đẹp và hùng vĩ nhất."
    }
  }, {
    "@type": "Question",
    "name": "Trên đỉnh Chiêu Lầu Thi có sóng điện thoại không?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Trên đỉnh Chiêu Lầu Thi sóng Viettel hoạt động khá ổn định và có thể sử dụng dữ liệu 4G nhẹ, trong khi sóng MobiFone và VinaPhone thường rất yếu hoặc mất kết nối hoàn toàn."
    }
  }]
}
```

### 6.2. Tiêu chuẩn On-page & Internal Linking (Liên kết nội bộ) tự động:
*   **BreadcrumbList Schema:** Luôn hiển thị vị trí cấu trúc trang rõ ràng ngoài Google (`Trang chủ > Homestay > Hoàng Su Phì > Bản Phùng`).
*   **Liên kết chéo thông minh:** Bài viết cẩm nang tự động quét cơ sở dữ liệu để tìm kiếm từ khóa liên quan đến tag và chèn link dẫn về trang chi tiết Homestay hoặc Điểm tham quan được nhắc tới.
*   **SEO hình ảnh:** Mọi bức ảnh khi được tải lên thông qua hệ thống Media sẽ được tự động xóa Metadata thừa, nén sang WebP, đặt tên file chuẩn SEO dạng `ruong-bac-thang-ban-phung.webp` và tự động gắn thẻ alt tương ứng với tiêu đề và mô tả của ảnh.
