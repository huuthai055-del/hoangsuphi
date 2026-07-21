# Information Architecture

## Nguyên tắc

- Dùng ngôn ngữ của khách du lịch: “Lưu trú”, “Ăn uống”, “Địa điểm”, không dùng tên entity backend.
- Cổng thông tin là công cụ khám phá và liên hệ trực tiếp, không phải OTA; không có luồng đặt phòng hay thanh toán.
- Mọi nội dung khám phá phải công khai. Đăng nhập chỉ xuất hiện khi lưu mục yêu thích hoặc viết đánh giá.
- Không hiển thị liên kết lọc theo loại cơ sở cho đến khi có public reference contract chuyển nhãn (ví dụ “Homestay”) thành `businessTypeId` an toàn.

## Điều hướng chính

| Nhãn | Canonical route | Ghi chú |
| --- | --- | --- |
| Khám phá | `/dia-diem` | Dùng public catalog contract đã LOCK. |
| Khu vực | `/khu-vuc` | Ưu tiên điều hướng huyện → xã → thôn/bản khi contract sẵn sàng. |
| Lưu trú | `/co-so` | Không gắn `filter=homestay` giả định. |
| Ăn uống | `/co-so` | Cùng archive với Lưu trú; phân loại resolve qua public references. |
| Cẩm nang | `/cam-nang` | Dùng public article projection published-only. |
| Gần tôi | `/tim-kiem` | Chế độ danh sách khoảng cách/Nearby, không có route bản đồ riêng. |

## Header và điều hướng trên mobile

- Desktop: logo, tìm kiếm, các liên kết chính, nút Yêu thích và trạng thái đăng nhập.
- Mobile: logo, nút tìm kiếm và menu; không dùng bottom navigation cố định để giữ không gian đọc nội dung và CTA.
- Trang chi tiết chỉ có sticky CTA khi dữ liệu hành động đã được xác minh: `tel:` khi có số điện thoại, liên kết Zalo khi có `zaloUrl`, và chỉ đường khi có tọa độ hợp lệ.

## Luồng nội dung

1. Google hoặc truy cập trực tiếp → landing/detail SEO.
2. Khám phá theo mùa, tìm kiếm hoặc “Gần tôi” → danh sách/chi tiết công khai.
3. Liên hệ trực tiếp chỉ khi bản ghi có contact projection đã xác minh.
4. Người dùng có thể đăng nhập để lưu yêu thích; không cần tài khoản để đọc nội dung.

`/hoi-dap`, `/tag/[slug]` và `/top/[slug]` giữ canonical route hiện hữu. Không tạo `/faq`, `/the/[slug]` hay các route archive trùng lặp.
