/**
 * GOOGLE APPS SCRIPT CHO GOOGLE SHEETS TỰ ĐỘNG LƯU PHIẾU XUẤT/NHẬP KHO
 * 
 * HƯỚNG DẪN 3 BƯỚC:
 * 1. Mở file Google Sheet của bạn -> Vào menu "Tiện ích mở rộng" (Extensions) -> Chọn "Apps Script".
 * 2. Xóa hết mã cũ, dán toàn bộ đoạn code này vào -> Nhấn biểu tượng Lưu (Ctrl+S).
 * 3. Nhấn "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment):
 *    - Chọn loại: "Ứng dụng web" (Web app)
 *    - Mô tả: "Scan Phieu Webhook"
 *    - Người có quyền truy cập (Who has access): Chọn "Bất kỳ ai" (Anyone)
 *    - Nhấn "Triển khai" (Deploy) -> Cấp quyền truy cập nếu được hỏi -> Sao chép URL Webhook (kết thúc bằng /exec).
 * 4. Dán URL Webhook vừa sao chép vào mục "Cài đặt ⚙️" -> "Google Sheet 📊" trên web Scan Phiếu.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);

    // 1. Tự động tạo hàng Tiêu Đề nếu Sheet đang trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Thời Gian Lưu",
        "Số Phiếu",
        "Trang",
        "Tên / Mã Hàng Hóa",
        "Số O.S/PO",
        "Đơn Vị Tính",
        "SL Theo Chứng Từ",
        "SL Thực Nhập",
        "Số Pallet",
        "Ghi Chú"
      ]);
      
      // Định dạng Tiêu đề (In đậm, nền xanh dương nhạt, căn giữa)
      var headerRange = sheet.getRange(1, 1, 1, 10);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#E8F0FE");
      headerRange.setFontColor("#1E3A8A");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    var time = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm:ss");
    var items = Array.isArray(data.items) ? data.items : [];
    var defaultSoPhieu = data.soPhieu || "";
    var defaultPageNum = data.pageNum || 1;
    var rows = [];

    // 2. Chuyển đổi dữ liệu từng dòng hàng
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      rows.push([
        time,
        item.soPhieu || defaultSoPhieu,
        item._pageNum || defaultPageNum,
        item.ten || "",
        item.soOSPO || "",
        item.donViTinh || "",
        item.soLuongChungTu || "",
        item.soLuongThucNhap || "",
        item.soPallet || "",
        item.ghiChu || ""
      ]);
    }

    // 3. Ghi toàn bộ các dòng vào Google Sheet
    if (rows.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      var range = sheet.getRange(startRow, 1, rows.length, 10);
      range.setValues(rows);
      range.setFontFamily("Arial");
      range.setFontSize(10);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã lưu " + rows.length + " dòng thành công",
      count: rows.length,
      time: time
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Google Apps Script Webhook cho Scan Phieu đang hoạt động tốt!"
  })).setMimeType(ContentService.MimeType.JSON);
}
