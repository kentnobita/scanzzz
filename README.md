# Scan Pro Max — Hệ Thống Quét & Trích Xuất Phiếu Kho Bằng AI 📦🚀

<p align="center">
  <img src="public/icon-192.png" width="88" height="88" alt="Scan Pro Max Logo" style="border-radius: 18px;" />
</p>

<p align="center">
  <strong>Ứng dụng quét, đọc OCR và trích xuất dữ liệu phiếu kho / giao hàng thông minh bằng AI Vision đa nền tảng (Web, PWA, Android App & Telegram Bot).</strong>
</p>

<p align="center">
  <a href="https://scanzzz.vercel.app"><img src="https://img.shields.io/badge/Web_App-Live_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></a>
  <a href="https://github.com/kentnobita/scanzzz/releases/latest"><img src="https://img.shields.io/badge/Android_App-Download_.APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" /></a>
  <a href="https://t.me/vd81997"><img src="https://img.shields.io/badge/Liên_Hệ-Telegram-229ED9?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" /></a>
</p>

---

## 🌟 Tính Năng Nổi Bật

- **🤖 Đa Mô Hình AI Vision**: Hỗ trợ Google Gemini, Kira AI (Qwen 3.8 Flash, DeepSeek V4.1...), B.AI và OpenRouter. Tự động luân chuyển Key dự phòng khi gặp giới hạn 429.
- **📄 Bóc Tách & Tự Động Gộp Dòng**: Đọc chuẩn xác chữ in và chữ viết tay (Số phiếu, Tên hàng, Số OS/PO, ĐVT, Số lượng chứng từ / thực nhập, Số Pallet, Ghi chú).
- **🖼️ Quét Hàng Loạt & PDF**: Hỗ trợ nạp cùng lúc nhiều ảnh hoặc tài liệu PDF nhiều trang, theo dõi tiến trình và cho phép quét lại từng trang nếu có lỗi mạng.
- **📊 Bộ Đếm Thống Kê Toàn Hệ Thống**: Quản lý tập trung qua Backend Server, tự động thống kê số lượt thành công/thất bại theo Ngày (reset 05:00 GMT+7), Tuần, Tháng, hiển thị biểu đồ Donut Chart phân bổ model đồng bộ trên mọi trình duyệt.
- **📈 Tự Động Đồng Bộ Google Sheet**: Ghi trực tiếp các dòng phiếu đã bóc tách vào Google Spreadsheet theo thời gian thực.
- **☁️ Đồng Bộ Cloud Sync Đa Nền Tảng**: Đồng bộ cấu hình API Key & Google Sheet giữa Web, App Android và Telegram Bot qua một mã code ngắn (ví dụ: `KHO-01`).
- **🤖 Trợ Lý Telegram Bot (Akko Bot)**: Quét phiếu kho trực tiếp qua tin nhắn Telegram trong nhóm hoặc chat riêng 24/7.

---

## 🤖 HƯỚNG DẪN CÀI ĐẶT & CHẠY TELEGRAM BOT (DÀNH CHO REPO PRIVATE)

> [!IMPORTANT]
> Vì repository **`kentnobita/scanzzz`** được đặt ở chế độ **Private (Riêng tư)**, các thiết bị khi tải mã nguồn về bắt buộc phải có bước **Xác thực quyền truy cập** (bằng **Personal Access Token** hoặc **SSH Key**). Dưới đây là hướng dẫn chi tiết từng bước.

---

### BƯỚC 1: XÁC THỰC ĐỂ TẢI (CLONE) REPO PRIVATE

Chọn **một trong hai cách** sau để clone code về thiết bị của bạn:

#### 👉 Cách A: Dùng GitHub Personal Access Token (Khuyên Dùng — Dễ Nhất)
1. Truy cập: [GitHub Token Settings](https://github.com/settings/tokens).
2. Bấm **Generate new token** ➔ chọn **Generate new token (classic)**.
3. Đặt tên (ví dụ: `bot-scan`), thời hạn (*Expiration*), và **tích chọn quyền `repo`** (Full control of private repositories).
4. Bấm **Generate token** ở cuối trang và **sao chép mã token** (có dạng `ghp_...`).
5. Trên thiết bị của bạn, dùng lệnh clone với token:
   ```bash
   git clone https://ghp_YOUR_TOKEN_HERE@github.com/kentnobita/scanzzz.git
   ```
   *(Thay `ghp_YOUR_TOKEN_HERE` bằng mã token bạn vừa tạo)*.

#### 👉 Cách B: Dùng SSH Key (Tối Ưu Cho VPS / Máy Chủ Linux)
1. Mở Terminal / PowerShell trên thiết bị và tạo SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Bấm Enter liên tục cho đến khi hoàn tất
   ```
2. Đọc và sao chép mã khóa công khai:
   - **Linux / VPS / Android**: `cat ~/.ssh/id_ed25519.pub`
   - **Windows PowerShell**: `Get-Content ~/.ssh/id_ed25519.pub`
3. Vào [GitHub SSH Keys](https://github.com/settings/keys) ➔ Bấm **New SSH Key** ➔ Dán mã vào và lưu.
4. Clone repo an toàn không cần mật khẩu:
   ```bash
   git clone git@github.com:kentnobita/scanzzz.git
   ```

---

### BƯỚC 2: CÀI ĐẶT & KHỞI CHẠY TRÊN CÁC THIẾT BỊ HỖ TRỢ

Yêu cầu chung: Thiết bị đã cài đặt **Node.js** (phiên bản v18 hoặc v20+). Kiểm tra bằng lệnh: `node -v`.

---

#### 💻 1. Cài Đặt Trên Windows (PC / Laptop)

1. **Cài Node.js**: Tải và cài đặt bản LTS từ trang chủ [nodejs.org](https://nodejs.org).
2. **Mở thư mục dự án**: Mở Command Prompt (CMD) hoặc PowerShell:
   ```powershell
   cd scanzzz
   npm install
   ```
3. **Cấu hình Token (Tùy chọn)**:
   - Tạo file `.env` trong thư mục `scanzzz`:
     ```env
     TELEGRAM_BOT_TOKEN=8387886894:AAG5fHgOiRN7s8q7ufOygMxTrrvavmjOW2c
     ```
     *(Nếu không tạo file `.env`, bot sẽ tự động sử dụng Token mặc định có sẵn)*.
4. **Khởi chạy Bot**:
   ```powershell
   npm run bot
   # Hoặc: node scripts/telegram-bot.js
   ```
5. **Mẹo chạy 1-Click trên Windows**:
   - Bạn có thể tạo 1 file `run-bot.bat` trong thư mục dự án với nội dung:
     ```bat
     @echo off
     title Akko Telegram Bot
     cd /d "%~dp0"
     npm run bot
     pause
     ```
   - Mỗi lần khởi động máy chỉ cần nhấp đúp vào file `run-bot.bat` là bot tự động chạy!

---

#### 🐧 2. Cài Đặt Trên VPS / Linux (Ubuntu / Debian) — Chạy 24/7 Không Tắt

Dành cho các bạn muốn bot chạy liên tục trên đám mây để phục vụ kho hàng 24/7:

1. **Cập nhật hệ thống và cài đặt Node.js 20**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```
2. **Clone Repo Private và Cài đặt**:
   ```bash
   git clone https://ghp_YOUR_TOKEN_HERE@github.com/kentnobita/scanzzz.git
   cd scanzzz
   npm install
   ```
3. **Quản lý chạy ngầm 24/7 với PM2** (Tự khởi động lại khi crash hoặc khi reboot VPS):
   ```bash
   # Cài đặt PM2 toàn cục
   sudo npm install -g pm2

   # Khởi chạy bot bằng PM2
   pm2 start scripts/telegram-bot.js --name "akko-bot"

   # Lưu cấu hình và kích hoạt tự khởi động cùng hệ thống
   pm2 save
   pm2 startup
   ```
4. **Các lệnh quản lý bot trên VPS**:
   - Xem nhật ký hoạt động: `pm2 logs akko-bot`
   - Khởi động lại bot: `pm2 restart akko-bot`
   - Dừng bot: `pm2 stop akko-bot`

---

#### 📱 3. Cài Đặt Trên Điện Thoại Android (Chạy Trực Tiếp Qua Termux)

Bạn có thể tận dụng một chiếc điện thoại Android cũ không dùng đến để làm máy chủ chạy Bot Telegram 24/7 mà không tốn điện:

1. **Cài đặt Termux**: Tải ứng dụng **Termux** từ [F-Droid](https://f-droid.org/packages/com.termux/) (tránh tải bản cũ trên Google Play).
2. **Cài đặt môi trường trong Termux**:
   Mở Termux và dán các lệnh sau:
   ```bash
   pkg update && pkg upgrade -y
   pkg install git nodejs -y
   ```
3. **Clone Repo và Cài đặt**:
   ```bash
   git clone https://ghp_YOUR_TOKEN_HERE@github.com/kentnobita/scanzzz.git
   cd scanzzz
   npm install
   ```
4. **Chạy Bot**:
   ```bash
   node scripts/telegram-bot.js
   ```
5. **Giữ Bot chạy ngầm khi khóa màn hình**:
   - Vuốt thanh thông báo Termux xuống ➔ Chọn **Acquire Wake Lock**.
   - Vào *Cài đặt điện thoại* ➔ *Ứng dụng Termux* ➔ *Pin* ➔ Chọn **Không giới hạn (Unrestricted)** để Android không đóng ứng dụng khi tắt màn hình.

---

#### 🍎 4. Cài Đặt Trên macOS

1. Mở ứng dụng **Terminal**.
2. Kiểm tra hoặc cài đặt Node.js: `brew install node` (hoặc cài từ [nodejs.org](https://nodejs.org)).
3. Clone và chạy:
   ```bash
   git clone https://ghp_YOUR_TOKEN_HERE@github.com/kentnobita/scanzzz.git
   cd scanzzz
   npm install
   npm run bot
   ```

---

## 📜 Danh Sách Câu Lệnh Bot Telegram (Akko Bot)

Sau khi khởi chạy bot, bạn chỉ cần gửi ảnh phiếu hoặc tài liệu PDF trực tiếp vào chat/group để bot tự động trích xuất. Ngoài ra có các câu lệnh điều khiển:

| Lệnh | Mô Tả Chức Năng |
| :--- | :--- |
| `/astart` | Khởi động bot & xem hướng dẫn quét phiếu |
| `/ahelp` | Xem danh sách các câu lệnh và mẹo sử dụng |
| `/astatus` | Kiểm tra trạng thái AI đang dùng, link Google Sheet & Topic |
| `/atopic` | Khóa chức năng quét vào Topic hiện tại trong Group (`/atopic all` để mở lại) |
| `/amodel` | Đổi mô hình AI (Gemini Flash, Qwen 3.8, DeepSeek, Nex AGI...) |
| `/aprovider` | Chuyển đổi nhà cung cấp AI (`gemini`, `kira`, `bai`, `openrouter`) |
| `/akey` | Cập nhật API Key AI trực tiếp trên Telegram |
| `/async <MÃ>` | Đồng bộ cấu hình từ Web/App qua Mã Cloud Sync (ví dụ: `/async KHO-01`) |
| `/asheet <URL>` | Cài đặt URL Google Apps Script Webhook để tự lưu phiếu vào Sheet |
| `/aserver <URL>` | Đổi địa chỉ máy chủ Web Cloud Sync |

---

## 🌐 Khởi Chạy Giao Diện Web App (Localhost)

Nếu bạn muốn chạy song song cả giao diện Web trên máy tính:

```bash
# 1. Cài đặt thư viện (nếu chưa cài)
npm install

# 2. Chạy môi trường Development (tự động reload khi sửa code)
npm run dev

# 3. Hoặc biên dịch bản Production tối ưu tốc độ
npm run build
npm start
```
Truy cập giao diện Web tại: **`http://localhost:3000`**

---

## 👨‍💻 Tác Giả & Hỗ Trợ Kỹ Thuật

- **Tác giả**: **Đắc dzaii**
- **Kênh Telegram hỗ trợ**: [@vd81997](https://t.me/vd81997)
- **Repository GitHub**: [kentnobita/scanzzz](https://github.com/kentnobita/scanzzz) (Private)
