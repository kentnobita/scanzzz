# Scan Pro Max — Hệ Thống Quét & Trích Xuất Phiếu Kho Bằng AI 📦🚀

<p align="center">
  <img src="public/icon-192.png" width="88" height="88" alt="Scan Pro Max Logo" style="border-radius: 18px;" />
</p>

<p align="center">
  <strong>Ứng dụng quét, đọc OCR và trích xuất dữ liệu phiếu kho / giao hàng thông minh bằng AI Vision đa nền tảng (Web, PWA & Android App).</strong>
</p>

<p align="center">
  <a href="https://scanzzz.vercel.app"><img src="https://img.shields.io/badge/Web_App-Live_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></a>
  <a href="https://github.com/kentnobita/scanzzz/releases/latest"><img src="https://img.shields.io/badge/Android_App-Download_.APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" /></a>
  <a href="https://t.me/vd81997"><img src="https://img.shields.io/badge/Liên_Hệ-Telegram-229ED9?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" /></a>
</p>

---

## 🌟 Tính Năng Chính

- **🤖 Đa Mô Hình AI Vision**: Hỗ trợ linh hoạt Google Gemini (3.6 Flash) và OpenRouter (Gemini 2.5 Flash, Qwen 2.5 VL 72B, Qwen3 VL 8B, MiniMax 01). Tự động luân chuyển Key dự phòng khi gặp giới hạn 429.
- **📄 Bóc Tách & Tự Động Gộp Dòng**: Đọc chuẩn xác chữ in và viết tay (Số phiếu, Tên hàng, Số OS/PO, Đơn vị tính, Số lượng, Số Pallet, Ghi chú). Tự động gộp mã hàng phân tách 2 dòng.
- **🖼️ Quét Hàng Loạt & PDF**: Hỗ trợ nạp cùng lúc nhiều ảnh hoặc tài liệu PDF nhiều trang, hiển thị tiến trình quét AI theo thời gian thực.
- **📊 Đồng Bộ Google Sheet**: Đẩy dữ liệu phiếu đã quét trực tiếp vào Google Spreadsheet của doanh nghiệp chỉ với 1 chạm hoặc tự động.
- **☁️ Đồng Bộ Cấu Hình Cloud**: Chia sẻ nhanh Key AI, Google Sheet và mẫu cột giữa Máy tính & Điện thoại qua Mã Đồng Bộ hoặc Quét mã QR, hỗ trợ tùy chỉnh thời gian lưu trữ từ 5 phút đến 24 giờ.
- **📱 Đa Nền Tảng**: Giao diện thích ứng hoàn hảo trên Desktop & Mobile, hỗ trợ cài đặt PWA và đóng gói ứng dụng Android APK.

---

## 🛠️ Công Nghệ

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Mobile Native**: Capacitor 6 (Android APK)
- **AI OCR**: Google Gemini API & OpenRouter API
- **Xử Lý PDF**: PDF.js

---

## 🚀 Khởi Chạy Nhanh

```bash
# Cài đặt dependencies
npm install

# Khởi chạy môi trường phát triển
npm run dev
```

Truy cập: **`http://localhost:3000`**

---

## 👨‍💻 Tác Giả

- **Phát triển bởi**: **Đắc dzaii**
- **Telegram**: [@vd81997](https://t.me/vd81997)
- **GitHub**: [kentnobita/scanzzz](https://github.com/kentnobita/scanzzz)
