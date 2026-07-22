# Wireframes Blueprint

Các wireframe là hợp đồng UX, không cho phép suy diễn dữ liệu chưa có trong API.

## Trang chủ

```text
[Header: logo | tìm kiếm | điều hướng | đăng nhập]
[Hero theo mùa: gần tôi | khám phá địa điểm]
[Dải trạng thái mùa vụ: dữ liệu Harvest mới nhất]
[Lối tắt: địa điểm | cơ sở | cẩm nang | gần tôi]
[Bộ sưu tập theo mùa]
[Các mô-đun nội dung public-safe có fallback độc lập]
[Footer]
```

Không dùng legacy list API để lấp các khối “nổi bật”. Trước controlled unlock, trang chủ chỉ dùng Harvest và các SEO projection đã được xác minh; mô-đun còn lại hiển thị trạng thái chưa có dữ liệu thay vì nội dung không an toàn.

## Trang danh sách

```text
[Breadcrumb]
[Tiêu đề]
[Bộ lọc chỉ gồm tiêu chí có public contract]
[Danh sách thẻ]
[Tải thêm bằng opaque cursor, nếu endpoint hỗ trợ]
```

Không phát hành archive cơ sở/địa điểm/bài viết bằng các legacy CRUD list hiện tại. Bộ lọc loại, khu vực và giá chỉ hiện diện sau khi public projection/reference API được controlled-unlock.

## Trang chi tiết

```text
[Breadcrumb]
[Gallery khi SEO/contact projection có media hợp lệ]
[Tên | khu vực | mô tả | giá tham khảo | tiện ích]
[Vị trí, danh sách gần đây và chỉ đường khi có tọa độ]
[CTA điều kiện: Gọi | Zalo | Chỉ đường | Lưu]
[Đánh giá công khai | nội dung liên quan]
```

- Không biến số điện thoại thành Zalo. CTA Gọi chỉ có khi có phone; CTA Zalo chỉ có khi có `zaloUrl` đã kiểm duyệt.
- Nếu không có contact, ẩn CTA liên hệ và không thay bằng dữ liệu giả.
- Trên mobile, sticky CTA chỉ chứa những hành động thực sự khả dụng; “Lưu” dẫn đến đăng nhập khi cần.
