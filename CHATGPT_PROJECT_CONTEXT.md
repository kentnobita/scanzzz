# TÀI LIỆU DỰ ÁN & HƯỚNG DẪN NGỮ CẢNH DÀNH CHO CHATGPT (SCAN PRO MAX)

Tài liệu này được biên soạn để làm **Project Instructions** hoặc **Tài liệu tham khảo (Knowledge File)** khi làm việc trên ChatGPT Plus.

---

## 1. TỔNG QUAN HỆ THỐNG
- **Tên dự án**: Scan Pro Max (Hệ thống quét & bóc tách dữ liệu phiếu xuất kho / phiếu giao hàng bằng AI Vision đa phương thức).
- **Môi trường & Công nghệ**:
  - **Framework**: Next.js 14 (App Router), React 18, Tailwind CSS.
  - **Mobile Native**: Capacitor 6 (Android APK).
  - **Telegram Bot**: Node.js độc lập (`scripts/telegram-bot.js`), thư viện Telegraf & MuPDF.
  - **AI Engines**:
    1. **Google Gemini**: Gemini 3.6 Flash (chính), cơ chế luân chuyển nhiều Key dự phòng khi gặp 429.
    2. **Kira AI**: Hạ tầng máy chủ Việt Nam (tương thích OpenAI API format qua `app/api/kira/route.js`).
    3. **B.AI**: API OCR tương thích.
    4. **OpenRouter**: Đa dạng các mô hình Vision mã nguồn mở.
    5. **Tesseract.js**: Chế độ OCR Offline dự phòng khi mất mạng.

---

## 2. CẤU TRÚC THƯ MỤC CỐT LÕI
```
scan-phieu/
├── app/
│   ├── api/
│   │   ├── analytics/route.js   # Backend API bộ đếm thống kê toàn hệ thống
│   │   ├── kira/route.js        # Proxy API kết nối Kira AI (chuẩn OpenAI format)
│   │   ├── sync/route.js        # API Cloud Sync đồng bộ cấu hình đa thiết bị
│   │   ├── sheet/route.js       # Proxy Webhook đẩy dữ liệu vào Google Sheet
│   │   └── bai/route.js         # Proxy API kết nối B.AI
│   ├── globals.css              # Tối ưu giao diện Mobile, PWA, Dark mode
│   ├── layout.js                # Layout App Router
│   └── page.js                  # Toàn bộ giao diện chính, modal, logic OCR, xử lý PDF
├── components/
│   ├── ModelDistributionChart.js# Biểu đồ Donut Chart SVG phân bổ theo Model
│   ├── Icons.js                 # Bộ icon SVG chuyên dụng
│   └── QrCodeCanvas.js          # Vẽ mã QR chia sẻ Cloud Sync
├── lib/
│   ├── analytics.js             # Logic bộ đếm, mốc reset 05:00 GMT+7, sync backend
│   ├── keepAlive.js             # Chống tắt màn hình (Wake Lock) & âm thanh nền
│   ├── imageUtils.js            # Nén ảnh client, xoay ảnh, crop ảnh
│   └── pdfHandler.js            # Xử lý render PDF nhiều trang
├── scripts/
│   └── telegram-bot.js          # Bot Telegram Akko quét phiếu trực tiếp 24/7
├── .data/                       # Lưu trữ file JSON trên server (.gitignore)
│   ├── analytics_store.json     # Dữ liệu bộ đếm thống kê toàn hệ thống
│   ├── sync_store.json          # Dữ liệu đồng bộ cấu hình Cloud Sync
│   └── bot_config.json          # Cấu hình bot telegram
├── package.json                 # Cấu hình script npm và dependencies
└── README.md                    # Tài liệu hướng dẫn sử dụng & cài đặt
```

---

## 3. CƠ CHẾ BỘ ĐẾM THỐNG KÊ (RESET 05:00 GMT+7)
- **Phạm vi**: Toàn hệ thống (Global), dùng chung cho mọi thiết bị và trình duyệt (Chrome, Safari, Edge, Mobile, App...).
- **Cơ chế lưu trữ**:
  - Gửi sự kiện qua `POST /api/analytics` lưu tập trung vào `.data/analytics_store.json`.
  - Frontend gọi `fetchServerAnalytics` để lấy số liệu đồng nhất, kết hợp cache local để phản hồi tức thì.
  - Lắng nghe sự kiện `visibilitychange` & `window.focus` để tự động làm mới số lượt khi chuyển đổi tab/thiết bị.
- **Thuật toán Reset mốc 05:00 AM (GMT+7)**:
  - Múi giờ GMT+7 = UTC + 7. Để mốc 05:00:00 sáng thành 00:00:00 UTC, sử dụng phép dịch chuyển:
    `shiftedTs = timestamp + (7 - 5) * 3600 * 1000 = timestamp + 2 * 3600 * 1000` ms.
  - Chu kỳ **Hôm nay**: `d1.getUTCDate() === d2.getUTCDate()` trong hệ quy chiếu shifted UTC.
  - Chu kỳ **Tuần**: Tính từ Thứ Hai 05:00 sáng.
  - Chu kỳ **Tháng**: Tính từ ngày 1 lúc 05:00 sáng.
- **Biểu đồ Donut Chart**:
  - Card bo tròn `rounded-2xl`, tiêu đề icon `🟤 Phân bổ theo Model`.
  - Dropdown lọc model ở góc trên bên phải.
  - Khi chọn "Tất cả model": Hiển thị thị phần từng model.
  - Khi chọn 1 model cụ thể: Hiển thị phân bổ Thành công vs Thất bại của model đó.

---

## 4. QUY TẮC PHÁT TRIỂN & LƯU Ý NGHIÊM NGẶT
1. **Không hiển thị các từ ngữ "miễn phí", "free" trên giao diện**: Người dùng tự chủ động lựa chọn mô hình thích hợp kể cả có trả phí.
2. **Không hiển thị ghi chú "từ 5h" trên giao diện**: Tab hiển thị tên gọn gàng là **`Hôm nay`** (thuật toán reset 5h GMT+7 chạy ngầm chuẩn xác).
3. **Phần chọn model Kira AI và OpenRouter**: Người dùng **tự chủ động điền mã mô hình (Model ID)** vào ô input, không hiển thị danh sách thẻ nút gợi ý gây rối mắt.
4. **Giữ nguyên khả năng chống tắt màn hình (Keep-Alive)**: Không làm ảnh hưởng đến `requestScreenWakeLock()` và `startBackgroundAudioKeepAlive()` khi người dùng chuyển ứng dụng hay khóa màn hình điện thoại.
5. **Đồng bộ hóa 2 chiều**: Mọi sửa đổi đề xuất từ ChatGPT cần phù hợp với Next.js 14 App Router và React Client Component (`'use client'`).

---

## 5. SYSTEM PROMPT GỢI Ý CHO CHATGPT PROJECT
```
Bạn là cộng sự lập trình viên cao cấp phát triển dự án "Scan Pro Max" (Next.js 14 + Tailwind CSS + Telegram Bot + Capacitor Android).
Hãy đọc kỹ tài liệu CHATGPT_PROJECT_CONTEXT.md và các file mã nguồn đính kèm để hiểu toàn bộ kiến trúc.
Khi hỗ trợ:
- Luôn giữ code sạch, tối ưu hiệu năng và tương thích với giao diện di động/máy tính hiện có.
- Tuân thủ nghiêm ngặt các quy ước: không dùng từ "miễn phí/free" trên giao diện, giữ ô input tự nhập cho Kira AI & OpenRouter, bảo toàn cơ chế reset bộ đếm 5:00 GMT+7.
- Giải thích rõ ràng các thay đổi để người dùng dễ dàng chuyển về Antigravity kiểm tra.
```
