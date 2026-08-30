# Scan Pro Max — Hệ Thống Trích Xuất Dữ Liệu Phiếu Kho & Giao Hàng Bằng AI Vision 📦🚀

<p align="center">
  <img src="public/icon-192.png" width="96" height="96" alt="Scan Pro Max Logo" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>Ứng dụng quét và trích xuất dữ liệu phiếu xuất/nhập kho, biên bản giao hàng thông minh bằng AI Vision đa nền tảng (Web, PWA & Android Native APK).</strong>
</p>

<p align="center">
  <a href="https://scanzzz.vercel.app"><img src="https://img.shields.io/badge/Web_App-Live_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></a>
  <a href="https://github.com/kentnobita/scanzzz/releases/latest"><img src="https://img.shields.io/badge/Android_App-Download_.APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" /></a>
  <a href="https://t.me/vd81997"><img src="https://img.shields.io/badge/Liên_Hệ-Đắc_dzaii-229ED9?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" /></a>
</p>

---

## 🌟 Tính Năng Nổi Bật

### 1. 🧠 AI Vision OCR Tiên Tiến (Gemini Flash)
- Tối ưu hóa prompt chuyên biệt cho hóa đơn, phiếu xuất kho, phiếu giao hàng tiếng Việt.
- Nhận diện chính xác cả **chữ in** và **chữ viết tay** (bút bi, bút mực, chữ sửa đổi, ghi đè).
- Tự động bóc tách: Số phiếu, Tên/Mã sản phẩm, Số O.S/P.O, Đơn vị tính, Số lượng chứng từ, Số lượng thực nhập/xuất, Số Pallet, Ghi chú.

### 2. 🔢 Chuẩn Hóa Cột Số O.S / P.O (Quy Tắc 5 Chữ Số Định Dạng `xxxxx`)
- Tự động chuyển đổi các dạng số viết tắt:
  - `8-999` $\rightarrow$ `80999`
  - `8-99` $\rightarrow$ `80099`
  - `8-9` $\rightarrow$ `80009`
  - `8-1999` $\rightarrow$ `81999`
  - `8-x999` $\rightarrow$ `8x999`

### 3. ⏰ Tự Động Reset Quota Vào 0h GMT+7
- Bộ đếm lượt quét API tự động làm mới vào đúng **00:00:00 hàng ngày (Múi giờ Việt Nam GMT+7)**.
- Quản lý danh sách nhiều API Key dự phòng (xoay vòng tự động khi một key hết hạn mức).

### 4. 🖼️ Chọn Nhiều Ảnh & Nạp PDF Nhiều Trang (Batch Scan)
- Hỗ trợ chọn cùng lúc **nhiều file ảnh** (`.jpg`, `.png`, `.webp`) hoặc kéo thả nhiều file vào ứng dụng.
- Nạp tài liệu PDF nhiều trang, hiển thị lưới thumbnail trực quan.
- Hỗ trợ **Quét Hàng Loạt** với thanh tiến trình AI theo thời gian thực hoặc **Quét Riêng** từng ảnh theo ý muốn.

### 5. 🕘 Lịch Sử Lưu Trữ 50 Phiếu (Cơ Chế FIFO Tự Động)
- Lưu tối đa **50 phiếu đã quét** gần nhất trên thiết bị.
- Tự động xóa phiếu cũ nhất khi có phiếu mới được lưu, đảm bảo dung lượng nhẹ và tối ưu.

### 6. 🎨 Image Studio Chuyên Nghiệp
- **Xoay ảnh 90° / 180°** theo mọi chiều.
- **Cắt góc ảnh (Crop)** linh hoạt.
- **Làm nét ảnh thông minh (Adaptive Unsharp Mask)** giúp AI đọc rõ các nét chữ mờ.
- **Đặt lại ảnh gốc** dễ dàng.

### 7. ☁️ Đồng Bộ Cloud & Mã QR Đa Thiết Bị
- Đồng bộ tức thì cấu hình API Key, Bộ đếm Quota, Cấu hình cột và Google Sheet giữa máy tính và điện thoại.
- Chia sẻ cấu hình siêu tốc qua **Mã Đồng Bộ** (ví dụ `KHO-01`) hoặc **Quét Mã QR**.

### 8. 📊 Đồng Bộ Google Sheets 1 Chạm
- Gửi trực tiếp toàn bộ dữ liệu phiếu sang Google Sheets của doanh nghiệp qua Google Apps Script Proxy an toàn (hỗ trợ xử lý 302 redirect).

### 9. 📱 Đa Nền Tảng: Web, PWA & Android Native APK
- **Web App**: Giao diện Responsive tự động co giãn vừa vặn trên mọi kích cỡ màn hình.
- **PWA (Progressive Web App)**: Cài đặt trực tiếp từ trình duyệt trên iPhone/Android không cần tải file, chạy full-screen mượt mà.
- **Android Native APK**: Tích hợp sâu phần cứng Camera quét tự động và Đèn Flashlight qua Capacitor Native.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), [React 18](https://react.dev/), [Tailwind CSS 3](https://tailwindcss.com/)
- **Mobile Runtime**: [Capacitor 6](https://capacitorjs.com/) (Android Native)
- **AI Vision Engine**: Google Gemini API (`gemini-3.6-flash` / `gemini-1.5-flash`)
- **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **CI/CD & Automation**: GitHub Actions (Tự động build file `.APK` và tạo GitHub Release)

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### 1. Yêu cầu môi trường
- Node.js 18+ hoặc 20+
- Trình quản lý gói `npm`

### 2. Cài đặt các gói phụ thuộc
```bash
git clone https://github.com/kentnobita/scanzzz.git
cd scanzzz
npm install
```

### 3. Chạy môi trường phát triển (Localhost)
```bash
npm run dev
```
Mở trình duyệt và truy cập: **`http://localhost:3000`**

### 4. Build sản phẩm Web
```bash
npm run build
npm run start
```

---

## 📦 Đóng Gói Ứng Dụng Android (.APK)

Hệ thống đã tích hợp quy trình **GitHub Actions CI/CD** tự động:
1. Mỗi khi có commit mới đẩy lên nhánh `main`, GitHub Actions sẽ tự động build file APK.
2. File cài đặt `ScanPhieuKho-v36.apk` được phát hành tại mục [Releases](https://github.com/kentnobita/scanzzz/releases).

Nếu muốn build thủ công trên máy:
```bash
npx cap sync android
cd android
./gradlew assembleDebug
```
File APK đầu ra sẽ nằm tại: `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 👨‍💻 Tác Giả & Hỗ Trợ

- **Phát triển bởi**: **Đắc dzaii**
- **Telegram**: [@vd81997](https://t.me/vd81997)
- **GitHub Repository**: [kentnobita/scanzzz](https://github.com/kentnobita/scanzzz)
