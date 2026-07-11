# CÁT-TƠ-LÔG MÃ LỖI NỘI BỘ (INTERNAL ERROR CODES CATALOG)

> **Dự án:** Cổng thông tin Du lịch Hoàng Su Phì
> **Mã tài liệu:** ERROR_CATALOG_V1
> **Trạng thái:** 🟢 Hoạt động

Mỗi mã lỗi nội bộ (Internal Error Code) trong hệ thống tuân theo định dạng: `[PHÂN_NHÓM]_[SỐ_THỨ_TỰ]` (Ví dụ: `AUTH_001`, `DB_001`).

---

## 1. PHÂN NHÓM MÃ LỖI

| Phân nhóm | Ý nghĩa | HTTP Mặc định | Ý nghĩa & Phạm vi áp dụng |
|:---|:---|:---:|:---|
| **VAL** | Validation Errors | 400 | Lỗi định dạng dữ liệu đầu vào, thiếu trường bắt buộc từ client. |
| **AUTH** | Authentication & Authorization | 401 / 403 | Lỗi xác thực tài khoản, hết hạn token, hoặc không đủ quyền truy cập. |
| **DB** | Database Errors | 500 | Lỗi kết nối PostgreSQL, transaction fail, query timeout. |
| **SYS** | System & Infrastructure | 404 / 429 / 502 / 503 | Các lỗi hạ tầng, quá tải, không tìm thấy route hoặc gateway bên thứ 3 lỗi. |
| **BUS** | Business Domain Errors | 400 / 422 / 409 | Các lỗi vi phạm luật nghiệp vụ đặc thù (Phase 3+). |

---

## 2. CHI TIẾT DANH MỤC MÃ LỖI

### 2.1 Nhóm Validation (VAL)

| Mã lỗi | HTTP Status | Tiêu đề (Title) | Mô tả & Nguyên nhân | Hướng khắc phục cho Client |
|:---|:---:|:---|:---|:---|
| **VAL_001** | 400 | Validation Failed | Body/Query/Params truyền lên không qua được Zod Schema. | Hiển thị chi tiết lỗi ở trường `invalidParams` để người dùng sửa. |

### 2.2 Nhóm Authentication & Authorization (AUTH)

| Mã lỗi | HTTP Status | Tiêu đề (Title) | Mô tả & Nguyên nhân | Hướng khắc phục cho Client |
|:---|:---:|:---|:---|:---|
| **AUTH_001** | 401 | Unauthenticated | Thiếu JWT Access Token trong header hoặc token không hợp lệ / hết hạn. | Thực hiện gọi API Refresh Token để lấy token mới, hoặc chuyển hướng đến trang Đăng nhập. |
| **AUTH_002** | 403 | Forbidden | Token hợp lệ nhưng Role/Permission không có quyền thực hiện tác vụ này. | Hiển thị thông báo "Bạn không có quyền truy cập tính năng này". |
| **AUTH_003** | 401 | Refresh Token Expired | Refresh Token gửi lên đã hết hạn hoặc bị thu hồi (revoked). | Xóa sạch session/token ở local storage và ép người dùng đăng nhập lại từ đầu. |
| **AUTH_004** | 401 | Session Revoked | Thiết bị đã bị Admin hoặc người dùng đăng xuất từ xa. | Yêu cầu đăng nhập lại. |

### 2.3 Nhóm Database (DB)

| Mã lỗi | HTTP Status | Tiêu đề (Title) | Mô tả & Nguyên nhân | Hướng khắc phục cho Client |
|:---|:---:|:---|:---|:---|
| **DB_001** | 500 | Database Operation Failed | Lỗi thực thi truy vấn PostgreSQL, lỗi kết nối pool hoặc deadlock DB. | Log lỗi kèm `traceId` và hiển thị "Lỗi kết nối máy chủ". Client KHÔNG được tự động retry. |
| **DB_002** | 500 | Transaction Rollback | Rollback transaction do một trong các câu lệnh con trong khối transaction bị lỗi. | Kiểm tra logs hệ thống bằng `traceId`. |

### 2.4 Nhóm System & Infrastructure (SYS)

| Mã lỗi | HTTP Status | Tiêu đề (Title) | Mô tả & Nguyên nhân | Hướng khắc phục cho Client |
|:---|:---:|:---|:---|:---|
| **SYS_001** | 500 | Internal Server Error | Lỗi runtime không mong muốn trong mã nguồn (unhandled native exception). | Hiển thị thông báo chung lỗi hệ thống kèm `traceId` để báo cáo admin. |
| **SYS_002** | 404 | Resource Not Found | Không tìm thấy bản ghi (User, Homestay, Article) tương ứng với ID/Slug. | Chuyển hướng người dùng sang trang 404. |
| **SYS_003** | 409 | Conflict | Bản ghi đã tồn tại (ví dụ: email đã được đăng ký, slug bị trùng). | Báo lỗi trùng lặp dữ liệu trên UI để người dùng đổi giá trị. |
| **SYS_004** | 429 | Too Many Requests | Vượt quá ngưỡng Rate Limiting (Redis token bucket block). | Chờ một khoảng thời gian (theo header `Retry-After`) trước khi gửi lại request. |
| **SYS_005** | 502 | Bad Gateway | Gọi API hoặc dịch vụ bên thứ ba (như Mapbox, Resend Email) bị lỗi hoặc timeout. | Hiển thị lỗi kết nối dịch vụ ngoài, frontend có thể tự động retry tối đa 3 lần. |

---

## 3. CÁCH FRONTEND TIÊU THỤ MÃ LỖI (VÍ DỤ)

```typescript
async function handleApiResponse(response: Response) {
  if (response.ok) return response.json();

  const problem = await response.json();
  
  switch (problem.code) {
    case 'AUTH_001':
      // Tự động gọi refresh token
      return tryRefreshTokenAndRetry();
    case 'AUTH_003':
      // Logout và quay về login page
      return forceLogout();
    case 'VAL_001':
      // Map invalidParams lên Form validation UI
      return mapFormErrors(problem.invalidParams);
    case 'SYS_004':
      // Hiển thị thông báo "Bạn thao tác quá nhanh"
      return showRateLimitToast();
    default:
      // Show generic error message kèm Trace ID
      return showSystemError(problem.detail, problem.traceId);
  }
}
```
