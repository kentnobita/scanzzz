# Scan Pro Max

Ứng dụng web quét và trích xuất dữ liệu phiếu kho / phiếu giao hàng bằng AI Vision. Repo hiện là **web-only**, chạy trên Next.js và PWA; không còn phần Telegram Bot, Android APK hay Capacitor.

## Tính năng

- Quét bằng camera hoặc tải ảnh JPG, PNG, WEBP.
- Hỗ trợ nhiều ảnh và PDF nhiều trang.
- OCR chữ in, chữ viết tay và tự động gộp dòng hàng hóa.
- Hỗ trợ Google Gemini và các Custom API tương thích OpenAI (`/chat/completions`), gồm 9router, OpenRouter, vLLM, Ollama và các gateway khác.
- Tự động retry một số lỗi tương thích API, xử lý JSON/SSE và hiển thị tiến trình quét.
- Chỉnh sửa ảnh trước khi quét: xoay, cắt và làm nét.
- Lưu lịch sử kết quả trên trình duyệt.
- Đồng bộ cấu hình qua mã Cloud Sync.
- Gửi dữ liệu kết quả sang Google Sheets qua Google Apps Script Webhook.
- Thống kê số lượt quét và phân bổ model.
- Giao diện responsive cho máy tính và trình duyệt di động.

## Yêu cầu

- Node.js 18 trở lên (khuyến nghị Node.js 20+).
- npm.
- API key của nhà cung cấp AI nếu muốn quét thật.

## Cài đặt

```bash
git clone https://github.com/kentnobita/scanzzz.git
cd scanzzz
npm install
```

Tạo file môi trường local:

```bash
cp .env.example .env
```

Không commit `.env` và không đặt API key thật trong `.env.example` hoặc README.

## Chạy local

```bash
npm run dev
```

Mở trình duyệt tại:

```text
http://localhost:3000
```

Nếu cổng 3000 đang được sử dụng:

```bash
PORT=3001 npm run dev
```

## Cấu hình AI

### Google Gemini

1. Mở **Cài đặt → Mô Hình AI**.
2. Chọn **Google Gemini**.
3. Nhập một hoặc nhiều Gemini API key; mỗi dòng một key.
4. Chọn model và lưu cấu hình.

Key được lưu trong `localStorage` của trình duyệt và không đưa vào repository.

### Custom API / 9router

1. Mở **Cài đặt → Mô Hình AI → Custom API**.
2. Nhập Base URL, ví dụ:

   ```text
   http://localhost:20128/v1
   ```

3. Nhập API key và Model ID.
4. Bấm **Kiểm tra kết nối**, sau đó lưu profile.

Ứng dụng tự nối `/chat/completions` vào Base URL nếu URL chưa có endpoint này. Với 9router chạy trên máy khác, điện thoại/máy tính phải truy cập được IP hoặc URL tunnel của máy đó.

## Google Sheets

Ứng dụng không truy cập trực tiếp Google Sheets bằng credential server. Để đồng bộ dữ liệu:

1. Tạo Google Apps Script Web App Webhook.
2. Đặt quyền thực thi phù hợp.
3. Dán URL `/exec` vào **Cài đặt → Google Sheet**.

## Build và chạy production

```bash
npm run build
npm start
```

Mặc định production chạy tại `http://localhost:3000`.

## Cấu trúc chính

```text
app/
├── page.js                 # Giao diện và luồng quét chính
├── globals.css             # Tailwind/CSS responsive
└── api/
    ├── analytics/          # Thống kê quét
    ├── custom/             # Proxy Custom API OpenAI-compatible
    ├── sheet/              # Webhook Google Sheets
    └── sync/               # Cloud Sync
components/                 # Các component giao diện
lib/                        # Xử lý ảnh, PDF, Gemini, analytics, keep-alive
public/                     # Icon, manifest và tài nguyên PWA
backend/                    # Backend tùy chọn cho các triển khai riêng
```

## Biến môi trường

Xem `.env.example`. Các biến chính:

| Biến | Mục đích |
| --- | --- |
| `PORT` | Cổng chạy web, mặc định `3000` |
| `DEBUG_CUSTOM_API` | Bật log chẩn đoán Custom API; mặc định nên để `0` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Tùy chọn, chỉ dùng nếu triển khai Clerk |
| `CLERK_SECRET_KEY` | Tùy chọn, lưu trong môi trường server; không đưa lên client |

## Lưu ý triển khai

- `.data/` được dùng cho dữ liệu local và đã nằm trong `.gitignore`.
- Khi triển khai serverless, file local có thể không bền vững; nên cấu hình Redis/Upstash cho Cloud Sync nếu cần lưu trữ lâu dài.
- Không mở Custom API proxy ra Internet nếu chưa có cơ chế xác thực phù hợp.
- Không đưa API key AI, Clerk secret hoặc webhook riêng tư vào Git.

## Kiểm tra

```bash
npm run build
```

Nếu dev server báo lỗi chunk Next.js bị thiếu, dừng server rồi xóa cache build và chạy lại:

```bash
rm -rf .next
npm run dev
```

## Tác giả

Scan Pro Max — Đắc dzaii.
