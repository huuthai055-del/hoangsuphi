# URL State & Pagination Contract

## Quy tắc chung

- URL là source of truth; Back/Forward phải tái tạo được truy vấn.
- Chỉ giữ query parameter được endpoint hỗ trợ; chuẩn hóa thứ tự khi tạo URL.
- Thay đổi bất kỳ filter hoặc sort nào phải bỏ `cursor` để trở về tập kết quả đầu.

## Search và Nearby

`GET /api/v1/search` hỗ trợ `q`, `types`, `regionId`, `includeDescendants`, `articleCategoryId`, `attractionCategoryId`, `businessTypeId`, `minRating`, `priceMin`, `priceMax`, `amenityIds`, `sort`, `cursor`, `limit`. Nếu có `q`, độ dài tối thiểu là 2; luôn phải có ít nhất một criterion.

`GET /api/v1/nearby` yêu cầu `lat` và `lng`; dùng thêm các tham số đã được endpoint xác nhận. Cả hai endpoint dùng signed opaque cursor. Frontend không decode, sửa, hoặc chuyển cursor thành `page`.

“Gần tôi” ưu tiên tọa độ thiết bị sau khi người dùng cấp quyền. Nếu từ chối/không khả dụng, URL chỉ dùng latitude/longitude đã lấy từ public detail của cơ sở hoặc khu vực người dùng chọn; frontend không tự đoán tọa độ. Nhãn Lưu trú/Ăn uống/Điểm tham quan/ATM/Trạm xăng/WC phải được resolve qua public references trước khi dùng `types` và `categoryId` mà Nearby hỗ trợ.

Các CRUD list legacy dùng `page`/`limit` offset; chúng không thuộc public UI Phase 5 và không được áp dụng quy tắc cursor này.

## Lỗi và trạng thái trống

- Cursor không hợp lệ: giữ URL hiện tại, hiển thị thông báo “Kết quả đã thay đổi” và nút rõ ràng “Tải lại từ đầu”. Chỉ khi người dùng bấm nút mới điều hướng đến URL bỏ cursor.
- Không có kết quả: mô tả ngắn, nút xóa bộ lọc và giữ lại truy vấn để người dùng sửa.
- Lỗi mạng: không lộ `ProblemDetails` kỹ thuật; có nút thử lại.
