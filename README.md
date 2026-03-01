# KiKi Research – Hỗ Trợ Nghiên Cứu Khoa Học

Website hỗ trợ nghiên cứu khoa học, bao gồm các tính năng:

- 🔍 **Tìm kiếm bài báo** – Kết nối API arXiv để tìm kiếm hàng triệu bài báo khoa học mở theo từ khóa và lĩnh vực.
- 📝 **Ghi chú nghiên cứu** – Tạo, chỉnh sửa và lưu ghi chú trực tiếp trên trình duyệt (localStorage).
- 📚 **Tạo trích dẫn** – Tự động tạo trích dẫn theo các chuẩn APA, MLA, Chicago, IEEE, BibTeX.
- 🧪 **Khám phá chủ đề** – Truy cập nhanh vào các lĩnh vực nghiên cứu phổ biến như AI, Vật lý lượng tử, Sinh học phân tử, v.v.

## Cách mở app

Đây là website tĩnh (không cần cài đặt gì thêm). Có **3 cách** để mở:

---

### Cách 1 – Mở trực tiếp bằng trình duyệt (đơn giản nhất)

1. **Tải về** (hoặc clone) toàn bộ thư mục dự án.
2. Vào thư mục `kiki/`, tìm file **`index.html`**.
3. **Double-click** vào `index.html` → trình duyệt sẽ tự mở trang web.

> ⚠️ Một số trình duyệt chặn tính năng gọi API khi mở file trực tiếp (`file://`).
> Nếu tính năng **Tìm kiếm bài báo** không hoạt động, hãy dùng Cách 2 hoặc Cách 3.

---

### Cách 2 – Dùng VS Code + Live Server (khuyến nghị)

1. Cài **[Visual Studio Code](https://code.visualstudio.com/)** (miễn phí).
2. Cài extension **[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)** trong VS Code.
3. Mở thư mục `kiki/` trong VS Code.
4. Click chuột phải vào file `index.html` → chọn **"Open with Live Server"**.
5. Trình duyệt sẽ tự động mở tại địa chỉ `http://127.0.0.1:5500`.

---

### Cách 3 – Dùng Python (nếu đã cài Python)

Mở **Terminal** (hoặc Command Prompt), di chuyển vào thư mục `kiki/` rồi chạy:

```bash
# Python 3
python3 -m http.server 8080

# Hoặc trên Windows
python -m http.server 8080
```

Sau đó mở trình duyệt và truy cập: **`http://localhost:8080`**

---

### Cách 4 – Triển khai lên GitHub Pages (trực tuyến, miễn phí)

1. Push code lên một repository GitHub.
2. Vào **Settings → Pages**.
3. Chọn nhánh `main` (hoặc `master`), thư mục `/ (root)` → nhấn **Save**.
4. GitHub sẽ cấp cho bạn một URL dạng `https://<tên-user>.github.io/<tên-repo>/`.

---

> **Yêu cầu kết nối Internet**: tính năng **Tìm kiếm bài báo** cần kết nối mạng để gọi API arXiv.
> Các tính năng **Ghi chú** và **Trích dẫn** hoạt động hoàn toàn offline.

## Cấu trúc

```
kiki/
├── index.html        # Giao diện chính
├── css/
│   └── style.css     # Stylesheet
└── js/
    └── app.js        # Logic ứng dụng
```