# Visitor Experience Contract

## 1. Mục tiêu của người truy cập
Khách truy cập vào cổng thông tin với mục tiêu tìm hiểu trong 10-20 giây để trả lời sáu câu hỏi:
1. Bây giờ có đáng đi Hoàng Su Phì không?
2. Đi đâu đẹp nhất?
3. Ở đâu và ăn gì?
4. Đường đi và tiện ích gần nhất ở đâu?
5. Chi phí khoảng bao nhiêu?
6. Liên hệ trực tiếp bằng cách nào?

## 2. Luồng chuyển đổi chính
`Khám phá → Tìm thông tin → Chọn địa điểm/cơ sở → Gọi điện / Zalo / Chỉ đường`

**Lưu ý quan trọng:**
- Website KHÔNG PHẢI OTA. Không thiết kế luồng đặt phòng.
- Mọi thông tin (Search, xem địa điểm, Nearby/danh sách khoảng cách, số điện thoại, Zalo, chỉ đường) đều **MỞ (Public)**. KHÔNG BẮT ĐĂNG NHẬP để xem thông tin.
- Đăng nhập chỉ dành cho cá nhân hóa: Lưu Favorite, Viết Review.
- Phone/Zalo chỉ được hiện khi public contact projection đã xác minh; không được bịa hoặc suy diễn từ trường khác. Chỉ đường chỉ hiển thị khi có tọa độ public hợp lệ.

## 3. Phong cách giao diện
- **Cảm giác:** Bản địa, chân thực, đáng tin, gần gũi.
- **Thiết kế:** Mobile-first, tốc độ tải cực nhanh, ít animation rườm rà.
- **Nghiêm cấm:** Không mang cảm giác Dashboard SaaS, Danh bạ doanh nghiệp, trang đặt phòng OTA, hay có quá nhiều Pop-up.

## 4. Visual Direction
- **Màu sắc:** Xanh núi, Vàng lúa, Nâu đất, Nền kem.
- **Media:** Ảnh thực tế của ruộng bậc thang, bản làng.
- **Typography:** Rõ ràng, dễ đọc tiếng Việt.
