/**
 * GOOGLE APPS SCRIPT CHO GOOGLE SHEETS TỰ ĐỘNG LƯU PHIẾU XUẤT/NHẬP KHO
 * (Tự động chèn 1 dòng trống phân cách giữa các lần lưu phiếu khác nhau)
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData ? e.postData.contents : "{}";
    var data = JSON.parse(contents);

    var lastRow = sheet.getLastRow();

    // 1. Tự động tạo hàng Tiêu Đề nếu Sheet đang hoàn toàn trống
    if (lastRow === 0) {
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
      lastRow = 1;
    }

    var time = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd HH:mm:ss");
    var items = Array.isArray(data.items) ? data.items : [];
    var defaultSoPhieu = data.soPhieu || "";
    var defaultPageNum = data.pageNum || 1;
    var rows = [];

    // 2. 🌟 Tự động chèn 1 dòng trống phân cách giữa các phiếu khác nhau (khi đã có dữ liệu trước đó)
    if (lastRow > 1) {
      rows.push(["", "", "", "", "", "", "", "", "", ""]);
    }

    // 3. Chuyển đổi dữ liệu từng dòng hàng của phiếu mới
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

    // 4. Ghi toàn bộ dữ liệu (bao gồm cả dòng trống) trong 1 lần setValues duy nhất
    if (rows.length > 0) {
      var startRow = lastRow + 1;
      var range = sheet.getRange(startRow, 1, rows.length, 10);
      range.setValues(rows);
      range.setFontFamily("Arial");
      range.setFontSize(10);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã lưu " + items.length + " dòng thành công",
      count: items.length,
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
