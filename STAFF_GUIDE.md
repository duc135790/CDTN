# Nhân viên tư vấn SHOE STORE

## Phạm vi hiện tại

Nhân viên chỉ tư vấn khách hàng, tra cứu tồn kho và chọn giày để gợi ý trong cuộc trò chuyện. Không xem/xử lý đơn hàng, xác nhận thanh toán, hủy/hoàn tiền, chỉnh số lượng tồn, sửa giá, voucher hoặc phân quyền tài khoản.

| Chức năng | Nhân viên tư vấn | Admin |
|---|---|---|
| Nhận khách từ hàng chờ, trả lời, kết thúc tư vấn | Cuộc mình phụ trách | Xem toàn bộ, tiếp nhận và chuyển người phụ trách |
| Xem sản phẩm, giá bán và tồn theo màu/size | Chỉ xem | Được |
| Tìm giày theo tên/thương hiệu/phong cách, loại, màu, size, giá | Được | Được |
| Chọn giày và gửi gợi ý | Trong cuộc tư vấn mình phụ trách | Trong cuộc tư vấn mình phụ trách |
| Xem/xử lý đơn, xác nhận giao, hủy, hàng hoàn, thanh toán | Không | Được theo quy tắc nghiệp vụ |
| Sửa sản phẩm, giá, khuyến mãi, nhập/chỉnh tồn | Không | Được |
| Tạo/chỉnh/khóa nhân viên, đặt lại mật khẩu | Không | Được |
| Sửa tên/điện thoại và đổi mật khẩu của mình | Được | Được |

Các quyền trả về cho nhân viên là `inventory:read`, `chat:consult`, `products:recommend`. Quyền thực tế được kiểm tra ở backend; sửa dữ liệu trình duyệt không cấp thêm quyền. Tài khoản có `isAdmin: true` từ dữ liệu cũ vẫn là quản trị; màn hình tạo nhân viên không được cấp cờ này.

## Tạo và dùng tài khoản

1. Admin mở **Quản trị → Nhân viên**, tạo tài khoản riêng bằng tên, email, điện thoại và mật khẩu ban đầu.
2. Khách hàng, nhân viên và admin đăng nhập chung tại **`http://localhost:5173/login`** bằng email và mật khẩu, không cần chọn vai trò. Nhân viên tự vào **Tư vấn khách hàng**, admin vào **Quản trị**, khách hàng về trang chủ hoặc trang mua sắm đang mở. Đường dẫn cũ `/staff/login` tự chuyển về trang chung.
3. Không gian nhân viên có ba mục: **Tư vấn khách hàng**, **Tra cứu tồn kho**, **Tài khoản**.
4. Trong tài khoản, nhân viên được sửa tên/điện thoại; đổi mật khẩu cần mật khẩu hiện tại. Nếu quên, liên hệ admin đặt lại.
5. Để kiểm tra hai phía đồng thời, dùng hai hồ sơ trình duyệt hoặc cửa sổ thường và ẩn danh. Hai tab cùng hồ sơ dùng chung phiên localStorage.

Admin khóa/mở/sửa/đặt lại mật khẩu sẽ thu hồi phiên cũ bằng `authVersion`. Khi khóa người đang tư vấn, admin vào hộp thư để chuyển cuộc còn mở. Không xóa tài khoản nhân viên để giữ lịch sử người gửi.

Đăng nhập mới dùng `POST /api/auth/login`. Server kiểm tra mật khẩu trên cả Customer và Staff, trả đúng `accountType`, vai trò và token; trình duyệt không quyết định quyền. Giữ nguyên dữ liệu tài khoản và các API hồ sơ riêng. API đăng nhập cũ còn hỗ trợ client cũ. Khi hết phiên hoặc đăng xuất, mọi vai trò về `/login`.

Nên dùng email riêng cho mỗi tài khoản. Dữ liệu cũ có cùng email ở Customer và Staff vẫn đăng nhập được nếu mật khẩu khác nhau. Nếu cả email và mật khẩu đều trùng, server trả 409 và yêu cầu xử lý tài khoản trùng, tránh tự đăng nhập nhầm người hoặc nhầm quyền. Nhân viên quên mật khẩu vẫn liên hệ admin; trang tự đặt lại mật khẩu dành cho tài khoản khách hàng.

Đã kiểm tra đăng nhập chung ngày 01/11/2026: **423 backend, 249 frontend** (228 Node + 21 luồng) đạt và build thành công. **41 ca Chrome** trên 1440/390/320px đạt, gồm chuyển trang theo vai trò, khôi phục phiên, đăng xuất, tài khoản khóa/sai mật khẩu/trùng thông tin, bookmark cũ và phiên nhân viên hết hạn. Các thao tác database trong bộ kiểm tra API và API của trình duyệt được giả lập; không sửa dữ liệu MongoDB thật. Kết quả nằm trong `.tmp/unified-login/`.

## Gợi ý giày theo nhu cầu

1. Nhân viên đọc nhu cầu của khách trong **Chờ tiếp nhận**, chọn **Nhận tư vấn**.
2. Trong khung trả lời, bấm **Chọn giày để gợi ý**.
3. Lọc theo tên/thương hiệu/phong cách, loại giày, màu, size, giá từ/đến. Khoảng giá dùng giá sau giảm, không dùng giá gốc.
4. Bộ chọn chỉ hiển thị giày đang bán, còn hàng. Màu, size và số lượng dương phải thuộc cùng một biến thể; không ghép màu của dòng này với size của dòng khác.
5. Xem tồn từng dòng rồi chọn **Chọn giày này**. Hệ thống điền tên giày vào lời nhắn nháp; có thể sửa nội dung cho phù hợp với sở thích của khách.
6. Bấm **Gửi tin** sau khi kiểm tra. Chọn sản phẩm không tự gửi. Nếu đổi từ mẫu này sang mẫu khác, lời nhắn mặc định cập nhật theo mẫu mới; lời nhắn tự viết được giữ.
7. Khách nhận thẻ ảnh/tên giày, giá tham khảo và liên kết xem giá, màu, size hiện tại. Có thể tiếp tục gửi thêm từng mẫu khác để khách so sánh.

Server đọc lại Product khi gửi, tự lấy tên/ảnh/giá sau giảm và từ chối giày bị ẩn, lưu trữ hoặc đã hết hàng. Nếu hết hàng sau khi chọn, không tạo tin gợi ý; nội dung nháp được giữ để nhân viên chọn lại. Đây là tư vấn, không giữ chỗ hoặc trừ kho; giá và tồn tiếp tục được kiểm tra khi khách đặt hàng. Khách vẫn được hỏi về sản phẩm đang hiển thị nhưng hết hàng, chẳng hạn hỏi thời điểm nhập lại.

Mục **Tra cứu tồn kho** có thể xem cả hàng đang ẩn bán và các biến thể tồn 0 để nắm tình hình kho; không có nút sửa tồn. Sản phẩm đã lưu trữ không xuất hiện. **Xem chi tiết** mở tab khác để tham khảo mà không rời cuộc tư vấn.

## Thu hẹp quyền xử lý đơn

- API `/api/staff/orders`, `/api/staff/orders/:id`, `/api/staff/orders/:id/status`, `/api/staff/orders/:id/delivery-failure` trả 403 sau xác thực, kể cả đơn từng được phân công cho nhân viên.
- API phân công xử lý đơn `/api/orders/:id/assignment` đã ngừng: admin nhận 410; nhân viên nhận 403. Không còn phần phân công đơn trong quản lý nhân viên.
- Dữ liệu phân công và lịch sử cũ được giữ để admin đối chiếu; không tự xóa hoặc sửa đơn/kho. Lịch sử xử lý hiển thị trong quản lý đơn hàng của admin.
- Bookmark `/staff?tab=orders` chuyển về nội dung tư vấn, không gọi API đơn hàng.
- Token nhân viên cũ cũng chịu chính sách mới ngay tại API, không cần sửa hàng loạt dữ liệu tài khoản.

Chi tiết bảo vệ lịch sử, nhận/chuyển tư vấn, chống gửi trùng và yêu cầu MongoDB: [CHAT_GUIDE.md](CHAT_GUIDE.md).

## Kiểm tra ngày 31/10/2026

- **413 backend, 240 frontend** (219 Node + 21 luồng) đạt; build thành công.
- **11 ca nghiệp vụ HTTP/MongoDB thật** đạt: 4 ca vai trò/kho và 7 ca nhắn tin/gợi ý. Các database thử đều được xác nhận quyền sở hữu và tự xóa; không thay đổi dữ liệu cửa hàng.
- **54 tình huống Chrome** ở 1440/390/320px đạt, cùng kiểm tra tiêu đề/nút đóng bộ chọn vẫn nhìn thấy khi cuộn trên điện thoại. Toàn bộ API trình duyệt được giả lập.
- Có kiểm tra nhân viên bị chặn cả đơn đã phân công từ trước, API phân công cũ ngừng hoạt động, bộ lọc không ghép nhầm màu/size, lọc theo giá sau giảm với làm tròn VND, chọn giày chỉ điền nháp, đổi mẫu cập nhật lời nhắn mặc định, server chặn gợi ý khi vừa hết hàng và khách nhận được thẻ sản phẩm.
- Log, ảnh và kết quả: `.tmp/advisor-recommendations/`.
