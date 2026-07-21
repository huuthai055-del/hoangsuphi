# UX State Matrix

Không hiển thị nguyên văn lỗi kỹ thuật/backend cho khách truy cập.

| Thành phần | Trạng thái | UX cần có |
| --- | --- | --- |
| Search/Nearby | Loading | Skeleton giữ cấu trúc thẻ, disable control đang gửi. |
| Search/Nearby | Success | Danh sách, URL phản ánh query/cursor hợp lệ. |
| Search/Nearby | Empty | Giải thích ngắn, nút xóa filter hoặc sửa tìm kiếm. |
| Search/Nearby | Invalid cursor | Thông báo kết quả đã đổi, nút “Tải lại từ đầu”; không tự xóa cursor. |
| Search/Nearby | Error | Thông báo thân thiện và thử lại. |
| Nearby / “Gần tôi” | Loading | Skeleton kèm nhãn đang tải danh sách khoảng cách. |
| Nearby / “Gần tôi” | Geolocation denied | Giữ danh sách và cho chọn cơ sở/khu vực có tọa độ public hợp lệ; không tự đoán tọa độ. |
| Nearby / “Gần tôi” | Network failure | Giữ điểm gốc đã chọn, hiển thị thử lại; không có provider/map fallback. |
| Media | Image error | Placeholder đã duyệt, alt text không giả mạo. |
| CTA liên hệ | Không có contact contract | Ẩn hành động không thực hiện được; vẫn giữ chỉ đường nếu có tọa độ. |
| Yêu thích | Chưa đăng nhập | Mở sign-in và giữ `returnTo` nội bộ đã validate. |
| Yêu thích | Lỗi | Giữ trạng thái cũ, thông báo thử lại; không lạc quan vĩnh viễn. |
