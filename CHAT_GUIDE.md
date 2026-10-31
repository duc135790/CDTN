# Nhân viên tư vấn

## Luồng sử dụng

Khung **Nhân viên tư vấn** nằm ở góc dưới bên phải trang mua sắm. Khách chưa đăng nhập có thể mở khung để vào đăng nhập/đăng ký. Khách đăng nhập bằng tài khoản mua sắm sẽ có lịch sử riêng, được lưu trong MongoDB và xem lại sau khi tải lại trang hoặc đăng nhập lần sau.

Khách có thể nhập nhu cầu về mẫu giày, size, màu hoặc ngân sách; các gợi ý chỉ điền nội dung để khách tự gửi. Ở trang chi tiết sản phẩm, **Hỏi về đôi giày đang xem** đính kèm sản phẩm thật, gồm tên, ảnh và đường dẫn. Có thể bỏ đính kèm trước khi gửi. Nội dung không tự tạo đơn, giữ hàng, thay đổi giá hoặc cấp ưu đãi.

Nhân viên có nút **Chọn giày để gợi ý** trong cuộc tư vấn đã nhận. Bộ chọn lọc theo tên/thương hiệu/phong cách, loại, màu, size và khoảng giá sau giảm; chỉ chọn giày đang bán, còn hàng đúng biến thể. Sau khi chọn, nhân viên xem/sửa lời nhắn nháp rồi bấm Gửi tin. Thẻ gợi ý có ảnh, tên, giá tham khảo do server đọc từ Product và liên kết chi tiết. Nếu vừa hết hàng, yêu cầu gửi bị chặn và giữ nội dung nháp. Gợi ý không giữ kho hoặc cam kết giá tại thời điểm mua. Xem quy trình ở [STAFF_GUIDE.md](STAFF_GUIDE.md).

Nhân viên vào **Không gian làm việc → Tư vấn khách hàng** (`/staff?tab=chat`):

1. Mở **Chờ tiếp nhận**, xem tên khách và đoạn tin mới nhất.
2. Chọn cuộc trò chuyện rồi **Nhận tư vấn**. Chỉ sau khi nhận mới được đọc toàn bộ lịch sử và trả lời.
3. Các cuộc đã nhận nằm trong **Tôi phụ trách**. Tin nhắn hiện tên người gửi và thời gian; trạng thái đã xem dựa trên xác nhận đọc.
4. Chọn **Kết thúc** khi đã hỗ trợ xong. Lịch sử vẫn được giữ trong **Đã kết thúc**.
5. Nếu khách gửi tin mới sau khi kết thúc, cuộc trò chuyện trở lại hàng chờ, giữ lịch sử và chờ được nhận lại.

Admin vào **Quản trị → Tư vấn khách hàng** để xem toàn bộ hộp thư. Admin có thể nhận cuộc đang chờ, **Chuyển về tôi**, chuyển cho nhân viên đang hoạt động, đưa về hàng chờ hoặc kết thúc. Admin cần nhận/chuyển về mình trước khi trả lời để khách có một người phụ trách rõ ràng. Nếu nhân viên bị khóa/nghỉ việc, admin chủ động chuyển các cuộc còn mở; hệ thống không tự chọn một nhân viên khác.

## Quyền và độ tin cậy

- Khách chỉ đọc/gửi/đánh dấu đã xem trong cuộc trò chuyện của mình. Không nhận ID tài khoản khách khác, ID người tư vấn hoặc mã kiểm tra nội bộ.
- Nhân viên không có quyền đọc toàn bộ hộp thư hoặc lịch sử do người khác phụ trách. Hàng chờ chỉ có đoạn xem trước; quyền đọc/trả lời được kiểm tra lại tại API.
- Hai nhân viên cùng nhận tư vấn chỉ có một người thành công. Nhận, chuyển và kết thúc có kiểm tra phiên bản; dữ liệu cũ nhận 409 và phải tải lại.
- Tin nhắn và số thứ tự, trạng thái mở lại, nội dung mới nhất, dấu chưa đọc cùng commit trong một transaction MongoDB. Đổi người phụ trách hoặc kết thúc đồng thời không cho phép người tư vấn cũ ghi dựa trên bản đọc cũ.
- Mỗi lần gửi có `clientId`. Gửi lại đúng nội dung dùng lại ID để không tạo bản sao, kể cả khi phản hồi lần trước bị mất. Dùng cùng ID cho nội dung khác bị từ chối. Khi chưa xác nhận gửi được, giao diện giữ nội dung và cho gửi lại.
- Tin nhắn tối đa 2.000 ký tự, hiển thị văn bản thuần; không render HTML. Người gửi và tên lấy từ phiên đã xác thực, sản phẩm đính kèm được đọc từ Product đang hiển thị. Giới hạn gửi là 30 yêu cầu/phút/tài khoản/tiến trình.
- Đã xem dùng con trỏ tăng dần, không đánh dấu cả các tin mới đến sau con trỏ. Khi người đọc cuộn lên xem tin cũ, tin mới ngoài phần đang đọc chưa được xác nhận đã xem cho đến khi quay về cuối cuộc trò chuyện.
- Dữ liệu nhạy cảm có `Cache-Control: no-store`; phản hồi đến muộn sau đổi tài khoản, đóng khung hoặc unmount không được đưa vào phiên mới. Đọc lịch sử phân trang 40 tin, không cắt/xóa tin cũ để giới hạn kích thước giao diện.

## Cập nhật và giới hạn phiên bản này

Khung mở kiểm tra tin mới khoảng 3 giây/lần; hộp thư nhân viên/admin 5 giây/lần; khung khách đang đóng kiểm tra dấu có tin mới 10 giây/lần. Dừng kiểm tra định kỳ khi tab bị ẩn và kiểm tra lại khi quay về. Không hiển thị trạng thái online giả, không có chatbot tự trả lời hoặc cam kết thời gian phản hồi. Cửa hàng cần có người mở hộp thư để tiếp nhận khách.

Đã hỗ trợ tin văn bản và đính kèm một sản phẩm; chưa có gửi tệp/ảnh từ khách, thông báo đẩy khi đóng trình duyệt, gửi email thông báo hay tích hợp Messenger/Zalo. Tài khoản admin/nhân viên dùng hộp thư công việc; nếu muốn đóng vai khách mua sắm thì dùng tài khoản khách riêng. Để thử hai phía cùng lúc, dùng hai hồ sơ trình duyệt hoặc cửa sổ thường và ẩn danh, vì phiên đăng nhập hiện dùng localStorage chung giữa các tab cùng hồ sơ.

## Chạy và dữ liệu

- Khởi động lại backend sau khi cập nhật code; chạy dự án như cũ bằng `npm run dev` tại thư mục ứng dụng `web-main`.
- Không cần cài thêm dịch vụ chat hoặc sửa khóa VNPAY/MongoDB trong `.env`. Chức năng dùng kết nối MongoDB hiện có.
- **Gửi tin nhắn cần MongoDB hỗ trợ transaction: Atlas hoặc replica set.** MongoDB standalone không hỗ trợ luồng ghi này; cần cấu hình replica set hoặc dùng Atlas để dùng chức năng. Không có thao tác tự chuyển đổi/cấu hình lại database của cửa hàng.
- Hai collection mới là `chatconversations`, `chatmessages`. Collection và unique index được chuẩn bị trước transaction đầu tiên. Không thay đổi dữ liệu đơn hàng, thanh toán, kho hay quyền tài khoản hiện có.
- API nằm ở `/api/chats`: `mine`, `mine/messages`, `inbox`, `:id/messages`, `:id/claim`, `:id/assignment`, `:id/close`, `:id/read`.

## Kiểm tra ngày 31/10/2026

Các ca API nằm trong `backend/tests/chatApi.test.js`; luồng giao diện và phản hồi muộn trong `frontend/tests/chat.test.cjs`. Kiểm tra tích hợp thật chạy bằng `node --test --test-concurrency=1 backend/integration/chat.integration.test.js`.

7 ca nghiệp vụ HTTP/MongoDB thật đã đạt: gửi lần đầu/đính kèm/gửi lại, hai nhân viên nhận cùng lúc, con trỏ đã đọc, admin chuyển người phụ trách/kết thúc/mở lại, gợi ý dùng giá sau giảm và chặn giày vừa hết hàng/ẩn, rollback khi sản phẩm không hợp lệ, và các tin đầu tiên đồng thời có số thứ tự liên tục. Database thử được sinh riêng, xác nhận quyền sở hữu rồi xóa sau khi hoàn tất; không thay đổi dữ liệu cửa hàng hoặc gửi tin nhắn cho khách thật.

Sau khi thu hẹp vai trò nhân viên và bổ sung bộ chọn gợi ý: **413 backend, 240 frontend** (219 Node + 21 luồng) đạt; build đạt. **54 tình huống Chrome** ở 1440/390/320px đạt, bao gồm luồng khách/nhân viên/admin, lọc/chọn/gửi giày, mất phản hồi sau gửi, tải lịch sử, chuyển tài khoản, dấu chưa đọc và cuộn về tin mới. API trong kiểm tra trình duyệt được giả lập hoàn toàn; kết quả mới ở `.tmp/advisor-recommendations/`, kết quả giai đoạn chat trước đó ở `.tmp/chat-consultation/`.
