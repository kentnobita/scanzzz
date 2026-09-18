'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconScan,
  IconCamera,
  IconUpload,
  IconClipboard,
  IconHistory,
  IconSettings,
  IconSparkles,
  IconCheck,
  IconCopy,
  IconRotateLeft,
  IconRotateRight,
  IconCrop,
  IconRefresh,
  IconTrash,
  IconSave,
  IconClose,
  IconFlash,
  IconSwitchCamera,
  IconKey,
  IconFileText,
  IconExternalLink,
  IconInfo,
  IconLayers,
  IconEye,
  IconSpreadsheet,
  IconCloud,
  IconQrCode,
  IconShare,
  IconDevicePhone,
} from '@/components/Icons';
import QrCodeCanvas from '@/components/QrCodeCanvas';

const COLUMN_DEFS = {
  ten: { label: 'Tên, nhãn hiệu, quy cách phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa', short: 'Tên / mã hàng' },
  soOSPO: { label: 'Số O.S/PO', short: 'Số O.S/PO' },
  donViTinh: { label: 'Đơn vị tính', short: 'ĐVT' },
  soLuongChungTu: { label: 'Số lượng theo chứng từ', short: 'SL chứng từ' },
  soLuongThucNhap: { label: 'Số lượng thực nhập', short: 'SL thực nhập' },
  soPallet: { label: 'Số Pallet', short: 'Số pallet' },
  ghiChu: { label: 'Ghi chú', short: 'Ghi chú' },
};

const DEFAULT_COLUMNS = ['ten', 'soOSPO', 'donViTinh', 'soLuongChungTu', 'soLuongThucNhap', 'soPallet', 'ghiChu'];

const OPENROUTER_MODELS = [
  {
    id: 'nex-agi/nex-n2.5-pro:free',
    name: 'Nex AGI: Nex-N2.5-Pro (Free)',
    shortName: 'Nex-N2.5-Pro',
    badge: 'MỚI • Free Siêu Chuẩn & Nhanh',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    desc: 'Mô hình Agentic Vision thế hệ mới của Nex AGI trên OpenRouter. Hoàn toàn miễn phí ($0), tốc độ phản hồi cực nhanh (~1.5s), bóc tách cấu trúc phiếu kho và chữ viết tay xuất sắc.',
  },
  {
    id: 'nex-agi/nex-n2.5-mini:free',
    name: 'Nex AGI: Nex-N2.5-Mini (Free)',
    shortName: 'Nex-N2.5-Mini',
    badge: 'MỚI • Free Siêu Tốc',
    badgeColor: 'bg-teal-100 text-teal-800',
    desc: 'Bản rút gọn siêu nhẹ của Nex AGI. Hoàn toàn miễn phí ($0), phản hồi tức thì dưới 2s cho các phiếu in rõ nét và bảng biểu.',
  },
  {
    id: 'inclusionai/ling-3.0-flash-vl:free',
    name: 'InclusionAI: Ling 3.0 Flash VL (Free)',
    shortName: 'Ling 3.0 Flash VL',
    badge: 'MỚI • Free Vision 3.0',
    badgeColor: 'bg-cyan-100 text-cyan-800',
    desc: 'Mô hình Vision đa phương thức thế hệ mới của InclusionAI. Miễn phí ($0), nhận diện chữ viết tay và bảng biểu tiếng Việt tốt.',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B (Free)',
    shortName: 'Gemma 4 31B',
    badge: 'MỚI • Free Vision Thế Hệ 4',
    badgeColor: 'bg-sky-100 text-sky-800',
    desc: 'Mô hình Vision mở thế hệ thứ 4 của Google. Cửa sổ ngữ cảnh 262K, hiểu hình ảnh tài liệu phức tạp và dòng kẻ bảng.',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    shortName: 'Gemini 2.5 Flash',
    badge: 'Khuyên Dùng • Chuẩn & Nhanh',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    desc: 'Bản Gemini Flash mới nhất trên OpenRouter. Đọc chữ viết tay tiếng Việt xuất sắc, tốc độ phản hồi nhanh và độ ổn định cao.',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    shortName: 'GPT-4o Mini',
    badge: 'Cực Kỳ Ổn Định',
    badgeColor: 'bg-blue-100 text-blue-800',
    desc: 'Mô hình vision nhẹ và ổn định của OpenAI, trích xuất cấu trúc bảng phiếu kho rất chuẩn xác.',
  },
  {
    id: 'qwen/qwen2.5-vl-72b-instruct',
    name: 'Qwen 2.5 VL 72B',
    shortName: 'Qwen 2.5 VL 72B',
    badge: 'Đỉnh Cao Chữ Viết Tay',
    badgeColor: 'bg-purple-100 text-purple-800',
    desc: 'Mô hình Vision 72B chuyên biệt cho tài liệu & chữ viết tay châu Á, độ chính xác nhận diện số viết tay rất cao.',
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Auto-Router',
    shortName: 'Auto Free Router',
    badge: 'MỚI • Tự Động Điều Phối',
    badgeColor: 'bg-amber-100 text-amber-800',
    desc: 'Router thông minh tự động lựa chọn mô hình Vision miễn phí sẵn có tốt nhất tại thời điểm gửi yêu cầu.',
  },
];


const KIRA_MODELS = [
  {
    id: 'qwen3.8-flash-free',
    name: 'Qwen 3.8 Flash (Free)',
    shortName: 'Qwen 3.8 Flash',
    badge: 'Khuyên Dùng • Free 100M • Cực Nhanh',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    desc: 'Mô hình miễn phí tốt nhất trên Kira AI. Tốc độ phản hồi cực nhanh (3-5s), ổn định, không bị lỗi 502.',
  },
  {
    id: 'qwen3.8-27b-free',
    name: 'Qwen 3.8 27B (Free)',
    shortName: 'Qwen 3.8 27B',
    badge: 'Free 100M • Vision Rất Tốt',
    badgeColor: 'bg-purple-100 text-purple-800',
    desc: 'Phiên bản Vision 27B miễn phí 100M tokens/ngày, đọc tốt chữ viết tay tiếng Việt và nhận diện số lượng.',
  },
  {
    id: 'kira-3.5-flash-pdf',
    name: 'Kira 3.5 Flash PDF',
    shortName: 'Kira 3.5 PDF',
    badge: 'MỚI • Chuyên Dụng Đọc PDF & Phiếu',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    desc: 'Dòng mô hình thế hệ 3.5 mới nhất của Kira AI được tinh chỉnh đặc thù để đọc và bóc tách tài liệu PDF, phiếu kho.',
  },
  {
    id: 'kira-3.5-flash',
    name: 'Kira 3.5 Flash',
    shortName: 'Kira 3.5 Flash',
    badge: 'MỚI • Thế Hệ 3.5 Siêu Tốc',
    badgeColor: 'bg-teal-100 text-teal-800',
    desc: 'Mô hình chính thế hệ 3.5 của Kira AI tại Việt Nam, độ trễ thấp và tối ưu hóa xử lý ngôn ngữ tiếng Việt.',
  },
  {
    id: 'deepseek-v4-flash-vision-exp',
    name: 'DeepSeek V4 Flash Vision Exp',
    shortName: 'DeepSeek V4 Vision',
    badge: 'MỚI • Vision Thử Nghiệm Mới',
    badgeColor: 'bg-rose-100 text-rose-800',
    desc: 'Bản thử nghiệm Vision thế hệ mới của DeepSeek trên cụm máy chủ Kira AI, bóc tách cấu trúc hình ảnh sáng tạo.',
  },
  {
    id: 'glm-5.3-flash-free',
    name: 'GLM 5.3 Flash (Free)',
    shortName: 'GLM 5.3 Flash',
    badge: 'Free 100M • Đa Phương Thức',
    badgeColor: 'bg-amber-100 text-amber-800',
    desc: 'Mô hình GLM 5.3 Flash miễn phí, xử lý đa phương thức và hỗ trợ phân tích tài liệu.',
  },
  {
    id: 'qwen3.8-max',
    name: 'Qwen 3.8 MAX',
    shortName: 'Qwen 3.8 MAX',
    badge: 'Đỉnh Cao Chữ Viết Tay',
    badgeColor: 'bg-purple-100 text-purple-800',
    desc: 'Mô hình Qwen MAX cao cấp nhất, nhận diện chữ viết tay mờ hoặc nét bút bi phức tạp.',
  },
  {
    id: 'kira-auto',
    name: 'Kira Auto',
    shortName: 'Kira Auto',
    badge: 'Tự Động Chọn Mô Hình',
    badgeColor: 'bg-blue-100 text-blue-800',
    desc: 'Hệ thống tự động điều hướng request sang mô hình đang có độ trễ thấp nhất và sẵn sàng nhất.',
  },
];

const BAI_MODELS = [
  {
    id: 'qwen3.8-flash',
    name: 'Qwen3.8-Flash',
    shortName: 'Qwen 3.8 Flash',
    badge: 'Khuyên Dùng #1 • 90% Off • Đọc Tay Cực Chuẩn',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    desc: 'Mô hình Alibaba Vision thế hệ 3.8 tối ưu nhất cho phiếu kho tiếng Việt, chữ viết tay nghiêng hoặc số chứng từ mờ. Không bị suy luận nháp.',
  },
  {
    id: 'qwen3.8-27b',
    name: 'Qwen3.8-27B (Vision)',
    shortName: 'Qwen 3.8 27B',
    badge: 'MỚI • 90% Off • Vision 27B Siêu Chuẩn',
    badgeColor: 'bg-purple-100 text-purple-800',
    desc: 'Bản Qwen 27B Vision mạnh mẽ nhất trong gói 90% Off, nhận diện cấu trúc bảng phức tạp và chữ số viết tay khó nhằn chỉ trong ~2.5s.',
  },
  {
    id: 'glm-5.3-flash',
    name: 'GLM-5.3-Flash',
    shortName: 'GLM 5.3 Flash',
    badge: '90% Off • Zhipu AI Siêu Nhanh 2.9s',
    badgeColor: 'bg-blue-100 text-blue-800',
    desc: 'Mô hình đa phương thức thế hệ mới của Zhipu AI trên B.AI. Tốc độ rất nhanh, bóc tách cấu trúc dòng hàng và cột số lượng chuẩn.',
  },
  {
    id: 'deepseek-v4.1-flash',
    name: 'DeepSeek-V4.1-Flash',
    shortName: 'DeepSeek V4.1',
    badge: '90% Off • MoE 552B Siêu Tốc',
    badgeColor: 'bg-amber-100 text-amber-800',
    desc: 'Mô hình MoE 552B đa phương thức bản địa của DeepSeek. Đã có bộ lọc khử suy luận nháp tiếng Anh và nâng trần token.',
  },
];

const DEFAULT_FIELD_PROMPTS = {
  soPhieu: 'Đọc kỹ số phiếu/số chứng từ ở đầu phiếu, bao gồm cả số in sẵn hoặc chữ viết tay bổ sung. Giữ nguyên toàn bộ ký tự và số.',
  ten: 'Lấy chính xác tên hàng, quy cách hoặc mã sản phẩm (đọc cả chữ viết tay tiếng Việt có dấu, chữ viết tắt như Thùng, Cuộn, Cây, Bộ, Hộp). NGUYÊN TẮC GỘP DÒNG: Nếu một mặt hàng/sản phẩm được in/viết dàn trải thành 2 dòng (ví dụ dòng trên là tên/loại bao bì, dòng dưới là kích thước/quy cách mã nhưng chỉ có chung 1 số lượng, 1 STT hoặc 1 số OS/PO) thì PHẢI GỘP thành 1 dòng hàng duy nhất (ví dụ: "PE SHOE BOX (ECO) 290*180*110mm MK-A-1"). Chỉ tách thành các dòng khác nhau khi có các số lượng/STT/mã OS/PO riêng biệt.',
  soOSPO: 'Chỉ lấy số thuần sau khi đã ghép. Cột Số O.S/PO thường có dạng [Tháng]-[Số đơn hàng] (ví dụ: 9-697, 9-296). Quy tắc chuẩn hóa: Vế trước dấu "-" là số hiệu Tháng (từ 1 đến 12), vế sau là Số thứ tự đơn hàng trong tháng đó (không quá 5000 đơn) nên luôn có đúng 4 chữ số (nếu ít hơn 4 chữ số thì tự động bù các số 0 vào phía trước). Ghép thành dạng [Tháng][4 chữ số đơn]: ví dụ 9-697 -> 90697, 9-296 -> 90296, 9-506 -> 90506, 9-45 -> 90045, 9-5 -> 90005, 10-123 -> 100123. ĐẶC BIỆT CHÚ Ý CHỮ VIẾT TAY: Chữ viết tay số 9 ở vế tháng có nét đuôi cong xuống dưới rất dễ bị đọc nhầm thành chữ "g" hoặc "q" (ví dụ "g-297", "g-697", "q-508" thực chất đều là số 9 viết tay "9-297" -> "90297", "9-697" -> "90697"). Tuyệt đối chỉ trả về các chữ số thuần sau khi ghép, không giữ lại dấu "-" và không chứa chữ cái.',
  donViTinh: 'Lấy đơn vị tính viết trên phiếu (ví dụ: EA, PCS, KG, BOX, CÁI, THÙNG, BỘ, CUỘN, CÂY). Không tự suy diễn.',
  soLuongChungTu: 'Chỉ lấy số lượng theo chứng từ (chỉ trả về số thuần). Nếu có chữ viết tay sửa đổi/ghi đè lên số in, ưu tiên lấy số viết tay mới nhất.',
  soLuongThucNhap: 'Chỉ lấy số lượng thực nhập/thực xuất (chỉ trả về số thuần). Đọc kỹ các con số viết tay bằng bút bi/bút mực.',
  soPallet: 'Lấy số pallet hoặc mã pallet viết tay/in sẵn. Giữ nguyên số 0 ở đầu nếu có.',
  ghiChu: 'Lấy ghi chú viết tay hoặc in cùng dòng hàng nếu có; nếu trống thì trả về chuỗi rỗng.',
};

export function formatOSPO(raw) {
  if (raw === null || raw === undefined) return '';
  let str = String(raw).trim();
  if (!str || str === '???') return str;

  // 1. Chuẩn hóa chữ cái viết tay dễ bị OCR đọc nhầm: "g-" hoặc "q-" ở đầu (thực chất là tháng 9)
  str = str.replace(/^[gGqQ]\s*[-/._\s]/, '9-');
  str = str.replace(/^[gGqQ](\d{2,4})$/, '9-$1');

  // 2. Kiểm tra nếu có dấu gạch nối hoặc dấu phân cách: ví dụ "9-697", "8-999", "8 - 99", "8.999", "8/9"
  const matchWithSep = str.match(/(\d+)\s*[-/._\s]\s*(\d+)/);
  if (matchWithSep) {
    const prefix = matchWithSep[1];
    const suffix = matchWithSep[2];
    // Hậu tố được bù các số 0 ở đầu thành đúng 4 chữ số
    const paddedSuffix = suffix.padStart(4, '0');
    return `${prefix}${paddedSuffix}`;
  }

  // 3. Nếu là số thuần hoặc chuỗi chứa số: chỉ giữ lại các chữ số
  const onlyDigits = str.replace(/\D/g, '');
  if (!onlyDigits) return '';

  // Nếu đã từ 5 chữ số trở lên thì giữ nguyên
  if (onlyDigits.length >= 5) {
    return onlyDigits;
  }

  // Nếu từ 2 đến 4 chữ số (ví dụ "8999" -> 8 + 0999 = 80999; "899" -> 80099)
  if (onlyDigits.length >= 2 && onlyDigits.length < 5) {
    const prefix = onlyDigits[0];
    const suffix = onlyDigits.slice(1);
    return `${prefix}${suffix.padStart(4, '0')}`;
  }

  return onlyDigits;
}

export function getGmt7DateString(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const MAX_HISTORY_ITEMS = 50;

const APPS_SCRIPT_SAMPLE = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss ? ss.getActiveSheet() : SpreadsheetApp.getActiveSheet();
    
    var contents = "";
    if (e && e.postData && e.postData.contents) {
      contents = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      contents = e.parameter.data;
    } else {
      contents = "{}";
    }

    var data = typeof contents === "object" ? contents : JSON.parse(contents);
    var lastRow = sheet.getLastRow();
    
    // 1. Tự động thêm tiêu đề cột nếu sheet đang hoàn toàn trống
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
    
    // 2. 🌟 Tự động chèn 1 dòng trống phân cách giữa các lần lưu phiếu khác nhau (khi đã có dữ liệu trước đó)
    if (lastRow > 1) {
      rows.push(["", "", "", "", "", "", "", "", "", ""]);
    }
    
    // 3. Chuyển đổi dữ liệu từng dòng hàng (Tự động chèn 1 dòng trống nếu chuyển số phiếu hoặc chuyển trang trong cùng 1 request)
    var lastSoPhieu = "";
    var lastPage = null;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      // Nếu là dòng phân cách trống được chỉ định
      if (item.isSeparator) {
        rows.push(["", "", "", "", "", "", "", "", "", ""]);
        continue;
      }

      var currentSoPhieu = (item.soPhieu || defaultSoPhieu || "").toString().trim();
      var currentPage = (item._pageNum !== undefined && item._pageNum !== null) ? item._pageNum : defaultPageNum;

      if (i > 0) {
        var isDiffSlip = (currentSoPhieu && lastSoPhieu && currentSoPhieu !== lastSoPhieu);
        var isDiffPage = (currentPage && lastPage && currentPage !== lastPage);
        if (isDiffSlip || isDiffPage) {
          rows.push(["", "", "", "", "", "", "", "", "", ""]);
        }
      }
      lastSoPhieu = currentSoPhieu;
      lastPage = currentPage;

      rows.push([
        time,
        currentSoPhieu,
        currentPage,
        item.ten || "",
        item.soOSPO || "",
        item.donViTinh || "",
        item.soLuongChungTu || "",
        item.soLuongThucNhap || "",
        item.soPallet || "",
        item.ghiChu || ""
      ]);
    }
    
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
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Google Apps Script Webhook cho Scan Phieu đang hoạt động tốt!"
  })).setMimeType(ContentService.MimeType.JSON);
};`;

export default function Home() {
  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // Image & Scan state
  const [currentImageBase64, setCurrentImageBase64] = useState(null);
  const [currentImageMimeType, setCurrentImageMimeType] = useState("image/jpeg");
  const [previewSrc, setPreviewSrc] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ active: false, percent: 0, text: "" });
  const [showTesseractWarning, setShowTesseractWarning] = useState(false);
  const [engineBadge, setEngineBadge] = useState("");

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Result state
  const [soPhieu, setSoPhieu] = useState("");
  const [tableItems, setTableItems] = useState([]);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Multi-page PDF states & Per-page separation
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfPages, setPdfPages] = useState([]);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);

  // Settings & Storage state
  const [aiProvider, setAiProvider] = useState('gemini'); // 'gemini' | 'openrouter' | 'kira' | 'bai'
  const [apiKey, setApiKey] = useState("");
  const [backupKeys, setBackupKeys] = useState([]);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState("google/gemini-2.5-flash");
  const [openRouterTesting, setOpenRouterTesting] = useState(false);
  const [kiraKey, setKiraKey] = useState("");
  const [kiraModel, setKiraModel] = useState("qwen3.8-27b-free");
  const [kiraTesting, setKiraTesting] = useState(false);
  const [baiKey, setBaiKey] = useState("");
  const [baiModel, setBaiModel] = useState("deepseek-v4.1-flash");
  const [baiTesting, setBaiTesting] = useState(false);
  const [rateLimitedKeys, setRateLimitedKeys] = useState(new Set()); 
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Per-page Results separation
  const [pageResults, setPageResults] = useState([]);
  const [activeResultTab, setActiveResultTab] = useState("separate");

  // Live Batch Progress Dialog state
  const [batchProgressModal, setBatchProgressModal] = useState({
    active: false,
    total: 0,
    current: 0,
    percent: 0,
    pageStatuses: [],
    isCompleted: false,
    hasError: false,
    retryingPageNum: null,
  });
  const batchTargetPagesRef = useRef([]);

  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_COLUMNS);
  const [fieldPrompts, setFieldPrompts] = useState(DEFAULT_FIELD_PROMPTS);
  const [viewMode, setViewMode] = useState('auto');
  const [scanHistory, setScanHistory] = useState([]);

  const getActiveProviderLabel = (short = false) => {
    if (aiProvider === 'bai') {
      const bName = BAI_MODELS.find((m) => m.id === baiModel)?.shortName || baiModel;
      return short ? 'B.AI' : `B.AI (${bName || 'DeepSeek V4.1'})`;
    }
    if (aiProvider === 'kira') {
      const kName = KIRA_MODELS.find((m) => m.id === kiraModel)?.shortName || kiraModel;
      return short ? 'Kira AI' : `Kira (${kName || 'Qwen 3.8 Flash'})`;
    }
    if (aiProvider === 'openrouter') {
      const orName = OPENROUTER_MODELS.find((m) => m.id === openRouterModel)?.shortName || openRouterModel;
      return short ? 'OpenRouter' : `OpenRouter (${orName})`;
    }
    return short ? 'Gemini' : 'Gemini 3.6 Flash';
  };

  // Google Sheets Integration State
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [autoSyncSheet, setAutoSyncSheet] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSheetSync, setLastSheetSync] = useState(null);
  const [sheetSyncError, setSheetSyncError] = useState(null);

  // Cloud Multi-Device Sync State
  const [cloudSyncCode, setCloudSyncCode] = useState('');
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [autoCloudSyncOnLaunch, setAutoCloudSyncOnLaunch] = useState(true);
  const [cloudSyncDuration, setCloudSyncDuration] = useState(1440); // Storage duration in minutes (default 24h = 1440m)
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Modals & Tabs state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('sync'); // 'sync' | 'api' | 'sheet' | 'columns' | 'prompts' | 'view' | 'android'
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Image edits state
  const [rawOriginalSrc, setRawOriginalSrc] = useState(null);
  const [imageSharpened, setImageSharpened] = useState(false);
  const [unsharpenedSrc, setUnsharpenedSrc] = useState(null);
  const [cropSourceSrc, setCropSourceSrc] = useState(null);
  const [cropRange, setCropRange] = useState({ left: 0, top: 0, right: 100, bottom: 100 });

  // Camera state
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Refs for File Inputs
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const backupFileInputRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const resultRef = useRef(null);

  const maskApiKey = (key) => {
    const val = String(key || '');
    return val.length < 12 ? 'API đã cấu hình' : `${val.slice(0, 6)}••••${val.slice(-4)}`;
  };

  const formatDate = (val) => {
    try {
      return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(val));
    } catch {
      return '';
    }
  };

  // Sync state with localStorage on mount & check URL for ?sync=CODE
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || '';
    setApiKey(key);

    try {
      const bKeys = JSON.parse(localStorage.getItem('gemini_backup_api_keys') || '[]');
      setBackupKeys(Array.isArray(bKeys) ? bKeys.filter((k) => k !== key) : []);
    } catch {
      setBackupKeys([]);
    }

    const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
    const effectiveProvider = savedProvider === 'apinex' ? 'gemini' : savedProvider;
    setAiProvider(effectiveProvider);
    if (savedProvider === 'apinex') {
      localStorage.setItem('ai_provider', 'gemini');
    }
    localStorage.removeItem('apinex_api_key');
    localStorage.removeItem('apinex_model');

    const savedOrKey = localStorage.getItem('openrouter_api_key') || '';
    setOpenRouterKey(savedOrKey);
    let savedOrModel = localStorage.getItem('openrouter_model') || 'google/gemini-2.5-flash';
    if (savedOrModel === 'google/gemini-2.0-flash-001') {
      savedOrModel = 'google/gemini-2.5-flash';
      localStorage.setItem('openrouter_model', savedOrModel);
    }
    setOpenRouterModel(savedOrModel);

    const savedKiraKey = localStorage.getItem('kira_api_key') || '';
    setKiraKey(savedKiraKey);
    const savedKiraModel = localStorage.getItem('kira_model') || 'qwen3.8-27b-free';
    setKiraModel(savedKiraModel);

    const savedBaiKey = localStorage.getItem('bai_api_key') || '';
    setBaiKey(savedBaiKey);
    const savedBaiModel = (localStorage.getItem('bai_model') || 'deepseek-v4.1-flash').toLowerCase();
    setBaiModel(savedBaiModel);

    const sheetUrl = localStorage.getItem('google_sheet_webhook_url') || '';
    setGoogleSheetUrl(sheetUrl);

    const autoSync = localStorage.getItem('google_sheet_auto_sync') === 'true';
    setAutoSyncSheet(autoSync);

    const savedSyncCode = localStorage.getItem('cloud_sync_code') || '';
    setCloudSyncCode(savedSyncCode);
    setSyncCodeInput(savedSyncCode);

    const savedAutoLaunch = localStorage.getItem('auto_cloud_sync_on_launch');
    const autoLaunchEnabled = savedAutoLaunch === null ? true : savedAutoLaunch === 'true';
    setAutoCloudSyncOnLaunch(autoLaunchEnabled);

    const savedDuration = localStorage.getItem('cloud_sync_duration');
    if (savedDuration) {
      const parsedDur = Number(savedDuration);
      if (!isNaN(parsedDur) && parsedDur >= 5) setCloudSyncDuration(parsedDur);
    }

    try {
      const cols = JSON.parse(localStorage.getItem('scan_columns') || '[]');
      if (Array.isArray(cols) && cols.length) setSelectedColumns(cols);
    } catch {}

    try {
      const prompts = JSON.parse(localStorage.getItem('scan_field_prompts') || '{}');
      if (prompts.ten && prompts.ten.includes('Không gộp hai dòng hàng thành một')) {
        delete prompts.ten;
        localStorage.setItem('scan_field_prompts', JSON.stringify(prompts));
      }
      setFieldPrompts({ ...DEFAULT_FIELD_PROMPTS, ...prompts });
    } catch {}

    const mode = localStorage.getItem('view_mode') || 'auto';
    setViewMode(mode);
    applyViewMode(mode);

    try {
      const localHist = JSON.parse(localStorage.getItem('scan_history') || '[]');
      if (Array.isArray(localHist)) {
        // Sanitize any existing bloated items (strip heavy base64 previewUrl if present)
        let needsResave = false;
        const cleaned = localHist.map((item) => {
          if (Array.isArray(item.pageResults)) {
            const sanitizedPR = item.pageResults.map((pr) => {
              if (pr.previewUrl && pr.previewUrl.length > 500) {
                needsResave = true;
                const { previewUrl, ...rest } = pr;
                return rest;
              }
              return pr;
            });
            return { ...item, pageResults: sanitizedPR };
          }
          return item;
        });

        if (needsResave) {
          try {
            localStorage.setItem('scan_history', JSON.stringify(cleaned.slice(0, MAX_HISTORY_ITEMS)));
          } catch (e) {
            console.warn('Could not resave sanitized scan_history:', e);
          }
        }
        setScanHistory(cleaned.slice(0, MAX_HISTORY_ITEMS));
      }
    } catch {}

    // Auto-sync check on first load:
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSyncCode = params.get('sync');
      if (urlSyncCode) {
        const cleanCode = urlSyncCode.trim().toUpperCase();
        setCloudSyncCode(cleanCode);
        setSyncCodeInput(cleanCode);
        localStorage.setItem('cloud_sync_code', cleanCode);
        localStorage.setItem('auto_cloud_sync_on_launch', 'true');
        setAutoCloudSyncOnLaunch(true);
        pullFromCloud(cleanCode, false);
      } else if (savedSyncCode && autoLaunchEnabled) {
        // Automatically sync configuration from Cloud on app launch
        pullFromCloud(savedSyncCode, true);
      }
    }


    // Register PWA Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('[PWA] SW register skipped:', err);
        });
      });
    }

    // Capture PWA Install Prompt Event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      showToast('🎉 Đã cài đặt ứng dụng Scan Phiếu thành công!', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone)) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPwaApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('🎉 Đã cài đặt ứng dụng Scan Phiếu thành công!', 'success');
        setDeferredPrompt(null);
        setIsPwaInstalled(true);
      }
    } else {
      showToast('📱 Hướng dẫn PWA: Trên Chrome/Edge/Safari, bấm biểu tượng Menu ➔ chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính"!', 'info');
    }
  };

  const applyViewMode = (mode) => {
    document.body.classList.remove('view-mobile', 'view-desktop');
    if (mode === 'mobile') document.body.classList.add('view-mobile');
    if (mode === 'desktop') document.body.classList.add('view-desktop');
  };

  // Cloud Sync Functions: API & Google Sheets Configuration
  const pushToCloud = async (overrideCode = null, silent = false) => {
    const code = (overrideCode || cloudSyncCode || syncCodeInput).trim().toUpperCase();
    if (!code || code.length < 3) {
      showToast('Vui lòng nhập Mã Đồng Bộ ít nhất 3 ký tự (Ví dụ: KHO-01)', 'error');
      return false;
    }

    setIsCloudSyncing(true);
    if (!silent) showToast(`☁️ Đang đồng bộ cấu hình API & Sheet lên Cloud [${code}]...`);

    try {
      const payload = {
        code,
        durationMinutes: cloudSyncDuration,
        apiKey: apiKey.trim(),
        backupKeys,
        aiProvider,
        openRouterKey: openRouterKey.trim(),
        openRouterModel: openRouterModel.trim(),
        kiraKey: kiraKey.trim(),
        kiraModel: kiraModel.trim(),
        baiKey: baiKey.trim(),
        baiModel: baiModel.trim(),
        googleSheetUrl: googleSheetUrl.trim(),
        autoSyncSheet,
        selectedColumns,
        fieldPrompts,
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Đồng thời sao lưu lên Cloud Vercel để Termux / thiết bị khác có thể đồng bộ ngay
      if (typeof window !== 'undefined' && !window.location.host.includes('scanzzz.vercel.app')) {
        fetch('https://scanzzz.vercel.app/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resJson.error || 'Lỗi server');
      }

      setCloudSyncCode(code);
      localStorage.setItem('cloud_sync_code', code);
      localStorage.setItem('cloud_sync_duration', String(cloudSyncDuration));
      const nowStr = new Date().toLocaleTimeString('vi-VN');
      const formattedDuration = cloudSyncDuration >= 60 
        ? `${Math.round(cloudSyncDuration / 60)} giờ` 
        : `${cloudSyncDuration} phút`;

      setLastCloudSync({ 
        time: nowStr, 
        code, 
        duration: formattedDuration,
        expiresAt: resJson.expiresAt 
      });
      if (!silent) showToast(`✅ Đã lưu cấu hình lên Cloud [${code}] (Lưu ${formattedDuration})!`, 'success');
      return true;
    } catch (e) {
      console.error('Cloud Push Error:', e);
      if (!silent) showToast('❌ Lỗi lưu Cloud: ' + e.message, 'error');
      return false;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const pullFromCloud = async (overrideCode = null, silent = false) => {
    const code = (overrideCode || cloudSyncCode || syncCodeInput).trim().toUpperCase();
    if (!code || code.length < 3) {
      showToast('Vui lòng nhập Mã Đồng Bộ ít nhất 3 ký tự', 'error');
      return false;
    }

    setIsCloudSyncing(true);
    if (!silent) showToast(`☁️ Đang tải cấu hình từ Cloud [${code}]...`);

    try {
      const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Mã đồng bộ chưa có dữ liệu trên Cloud');
      }

      const { data } = await res.json();
      if (!data) throw new Error('Không có dữ liệu');

      // Apply synced data
      if (data.apiKey !== undefined) {
        setApiKey(data.apiKey);
        localStorage.setItem('gemini_api_key', data.apiKey);
      }
      if (Array.isArray(data.backupKeys)) {
        setBackupKeys(data.backupKeys);
        localStorage.setItem('gemini_backup_api_keys', JSON.stringify(data.backupKeys));
      }
      if (data.aiProvider) {
        const prov = data.aiProvider === 'apinex' ? 'gemini' : data.aiProvider;
        setAiProvider(prov);
        localStorage.setItem('ai_provider', prov);
      }
      if (data.openRouterKey !== undefined) {
        setOpenRouterKey(data.openRouterKey);
        localStorage.setItem('openrouter_api_key', data.openRouterKey);
      }
      if (data.openRouterModel) {
        const modelToSet = data.openRouterModel === 'google/gemini-2.0-flash-001' ? 'google/gemini-2.5-flash' : data.openRouterModel;
        setOpenRouterModel(modelToSet);
        localStorage.setItem('openrouter_model', modelToSet);
      }
      if (data.kiraKey !== undefined) {
        setKiraKey(data.kiraKey);
        localStorage.setItem('kira_api_key', data.kiraKey);
      }
      if (data.kiraModel) {
        setKiraModel(data.kiraModel);
        localStorage.setItem('kira_model', data.kiraModel);
      }
      if (data.baiKey !== undefined) {
        setBaiKey(data.baiKey);
        localStorage.setItem('bai_api_key', data.baiKey);
      }
      if (data.baiModel) {
        setBaiModel(data.baiModel);
        localStorage.setItem('bai_model', data.baiModel);
      }
      if (data.googleSheetUrl !== undefined) {
        setGoogleSheetUrl(data.googleSheetUrl);
        localStorage.setItem('google_sheet_webhook_url', data.googleSheetUrl);
      }
      if (data.autoSyncSheet !== undefined) {
        setAutoSyncSheet(!!data.autoSyncSheet);
        localStorage.setItem('google_sheet_auto_sync', String(data.autoSyncSheet));
      }
      if (Array.isArray(data.selectedColumns) && data.selectedColumns.length) {
        setSelectedColumns(data.selectedColumns);
        localStorage.setItem('scan_columns', JSON.stringify(data.selectedColumns));
      }
      if (data.fieldPrompts) {
        setFieldPrompts(data.fieldPrompts);
        localStorage.setItem('scan_field_prompts', JSON.stringify(data.fieldPrompts));
      }
      if (data.durationMinutes) {
        setCloudSyncDuration(data.durationMinutes);
        localStorage.setItem('cloud_sync_duration', String(data.durationMinutes));
      }

      setCloudSyncCode(code);
      setSyncCodeInput(code);
      localStorage.setItem('cloud_sync_code', code);

      const nowStr = new Date().toLocaleTimeString('vi-VN');
      const formattedDuration = data.durationMinutes 
        ? (data.durationMinutes >= 60 ? `${Math.round(data.durationMinutes / 60)} giờ` : `${data.durationMinutes} phút`)
        : null;

      setLastCloudSync({ 
        time: nowStr, 
        code, 
        duration: formattedDuration,
        expiresAt: data.expiresAt 
      });
      if (!silent) {
        showToast(`🎉 Đã đồng bộ cấu hình từ Cloud [${code}]!`, 'success');
      }
      return true;
    } catch (e) {
      console.error('Cloud Pull Error:', e);
      if (!silent) showToast('❌ ' + e.message, 'error');
      return false;
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const getShareLink = useCallback(() => {
    const code = (cloudSyncCode || syncCodeInput || 'KHO-01').trim().toUpperCase();
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://scanzzz.vercel.app';
    return `${origin}/?sync=${encodeURIComponent(code)}`;
  }, [cloudSyncCode, syncCodeInput]);

  const generateRandomSyncCode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const code = `KHO-${randomNum}`;
    setSyncCodeInput(code);
    showToast(`Đã tạo mã ngẫu nhiên: ${code}`);
  };

  const getGeminiApiKeys = useCallback(() => {
    return [...new Set([apiKey.trim(), ...backupKeys.map((k) => k.trim())].filter(Boolean))];
  }, [apiKey, backupKeys]);

  const getApiMonitorEntries = useCallback(() => {
    const keys = getGeminiApiKeys();
    return keys.map((key, index) => {
      const limited = rateLimitedKeys.has(key);
      return {
        key,
        index,
        limited,
        checkStatus: '',
        checkDetail: '',
        status: limited ? 'Tạm bị giới hạn (429)' : 'Sẵn sàng',
      };
    });
  }, [getGeminiApiKeys, rateLimitedKeys]);

  // eslint-disable-next-line no-unused-vars
  const recordApiAttempt = useCallback((_key, _result) => {
    // Quota tracking removed — only rate-limit (429) detection is used
  }, []);

  const loadImageFromDataUrl = useCallback((dataUrl, isNewRaw = true) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const maxSize = 2000;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.88);

      setCurrentImageBase64(jpegUrl.split(',')[1]);
      setCurrentImageMimeType('image/jpeg');
      setPreviewSrc(jpegUrl);
      setResultVisible(false);
      setImageSharpened(false);
      setUnsharpenedSrc(null);

      if (isNewRaw) {
        setRawOriginalSrc(jpegUrl);
      }
    };
    img.src = dataUrl;
  }, []);

  // Multi-page PDF handler (with PDF.js dynamic load)
  const handlePDF = useCallback(async (file) => {
    try {
      setIsProcessingPdf(true);
      showToast('📄 Đang nạp và trích xuất các trang PDF...');
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
          script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
            resolve();
          };
          script.onerror = () => reject(new Error('Không thể tải thư viện PDF.js'));
          document.head.appendChild(script);
        });
      }

      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const numPages = pdf.numPages;
      const pagesData = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        
        // High-res scan version
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const fullUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Thumbnail version
        const thumbViewport = page.getViewport({ scale: 0.45 });
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;
        await page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport: thumbViewport }).promise;
        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

        pagesData.push({
          pageNum: i,
          fullUrl,
          thumbUrl,
          base64: fullUrl.split(',')[1],
          selected: true,
        });
      }

      setPdfPages(pagesData);
      setSelectedPdfIndex(0);

      if (numPages === 1) {
        loadImageFromDataUrl(pagesData[0].fullUrl);
        showToast('📄 Đã nạp file PDF 1 trang', 'success');
      } else {
        setPdfModalOpen(true);
        showToast(`📄 Đã tải ${numPages} trang PDF. Bấm chọn các trang cần quét!`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Không thể đọc file PDF: ' + e.message, 'error');
    } finally {
      setIsProcessingPdf(false);
    }
  }, [loadImageFromDataUrl, showToast]);

  const selectSinglePdfPage = (index) => {
    const page = pdfPages[index];
    if (!page) return;
    loadImageFromDataUrl(page.fullUrl);
    setPdfModalOpen(false);
    showToast(`📄 Đã chọn Trang ${page.pageNum} để quét`, 'success');
  };

  const togglePdfPageSelect = (index) => {
    setPdfPages((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAllPdfPages = (selectState) => {
    setPdfPages((prev) => prev.map((p) => ({ ...p, selected: selectState })));
  };

  const convertImageToPageItem = (file, pageNum) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const maxSize = 2400;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          const fullUrl = canvas.toDataURL('image/jpeg', 0.92);

          // Thumbnail version
          const thumbCanvas = document.createElement('canvas');
          const thumbMax = 320;
          let tw = img.width, th = img.height;
          if (tw > thumbMax || th > thumbMax) {
            if (tw > th) {
              th = Math.round((th * thumbMax) / tw);
              tw = thumbMax;
            } else {
              tw = Math.round((tw * thumbMax) / th);
              th = thumbMax;
            }
          }
          thumbCanvas.width = tw;
          thumbCanvas.height = th;
          thumbCanvas.getContext('2d').drawImage(img, 0, 0, tw, th);
          const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

          resolve({
            pageNum,
            name: file.name || `Ảnh ${pageNum}`,
            fullUrl,
            thumbUrl,
            base64: fullUrl.split(',')[1],
            selected: true,
          });
        };
        img.onerror = () => reject(new Error('Không thể đọc ảnh: ' + (file.name || '')));
        img.src = ev.target.result;
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc file: ' + (file.name || '')));
      reader.readAsDataURL(file);
    });
  };

  const handleMultipleFiles = useCallback(async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList).filter((f) =>
      f.type === 'application/pdf' ||
      /\.pdf$/i.test(f.name) ||
      f.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|bmp)$/i.test(f.name)
    );

    if (files.length === 0) {
      showToast('Định dạng không hỗ trợ (chỉ nhận PDF, JPG, PNG, WEBP)', 'error');
      return;
    }

    if (files.length === 1) {
      const single = files[0];
      if (single.type === 'application/pdf' || /\.pdf$/i.test(single.name)) {
        handlePDF(single);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          loadImageFromDataUrl(e.target.result);
          showToast(`🖼️ Đã nạp ảnh: ${single.name || 'Ảnh phiếu'}`, 'success');
        };
        reader.readAsDataURL(single);
      }
      return;
    }

    // Multiple files (Multiple photos or PDFs)
    try {
      setIsProcessingPdf(true);
      showToast(`🖼️ Đang nạp và xử lý ${files.length} ảnh/tài liệu...`);

      const pagesData = [];
      let pageCounter = 1;

      for (const file of files) {
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
              script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
                resolve();
              };
              script.onerror = () => reject(new Error('Không thể tải PDF.js'));
              document.head.appendChild(script);
            });
          }
          const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const fullUrl = canvas.toDataURL('image/jpeg', 0.92);

            const thumbViewport = page.getViewport({ scale: 0.45 });
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = thumbViewport.width;
            thumbCanvas.height = thumbViewport.height;
            await page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport: thumbViewport }).promise;
            const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

            pagesData.push({
              pageNum: pageCounter++,
              name: `${file.name} (Trang ${p})`,
              fullUrl,
              thumbUrl,
              base64: fullUrl.split(',')[1],
              selected: true,
            });
          }
        } else {
          // Image
          const pageItem = await convertImageToPageItem(file, pageCounter++);
          pagesData.push(pageItem);
        }
      }

      setPdfPages(pagesData);
      setSelectedPdfIndex(0);
      loadImageFromDataUrl(pagesData[0].fullUrl);
      setPdfModalOpen(true);
      showToast(`🖼️ Đã nạp ${pagesData.length} ảnh/trang phiếu. Bấm quét hàng loạt hoặc chọn ảnh!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('❌ Lỗi khi xử lý file: ' + e.message, 'error');
    } finally {
      setIsProcessingPdf(false);
    }
  }, [handlePDF, loadImageFromDataUrl, showToast]);

  const processFile = useCallback((file) => {
    handleMultipleFiles([file]);
  }, [handleMultipleFiles]);

  const pasteFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          const reader = new FileReader();
          reader.onload = (e) => {
            loadImageFromDataUrl(e.target.result);
            showToast('📋 Đã dán ảnh từ clipboard', 'success');
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      showToast('Clipboard không chứa ảnh', 'error');
    } catch {
      showToast('Không thể đọc clipboard. Hãy thử Ctrl+V', 'error');
    }
  };

  // Drag & Drop event listeners (supports multiple files)
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = (e) => {
      e.preventDefault();
      if (!e.relatedTarget) setIsDragging(false);
    };
    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleMultipleFiles(files);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleMultipleFiles]);

  useEffect(() => {
    const handleGlobalPaste = (e) => {
      for (const item of e.clipboardData?.items || []) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (x) => {
            loadImageFromDataUrl(x.target.result);
            showToast('📋 Đã dán ảnh từ clipboard', 'success');
          };
          reader.readAsDataURL(item.getAsFile());
          break;
        }
      }
    };
    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [loadImageFromDataUrl, showToast]);

  // Camera Scanner Functions
  const startCameraStream = async () => {
    stopCameraStream();
    const constraints = {
      audio: false,
      video: {
        facingMode: cameraFacingMode,
        width: { ideal: 1920 },
        height: { ideal: 2560 },
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    const track = stream.getVideoTracks()[0];
    const caps = track?.getCapabilities?.();
    setHasTorch(!!caps?.torch);
    setTorchOn(false);
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setTorchOn(false);
  };

  const openCameraScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      setCameraOpen(true);
      await startCameraStream();
    } catch (e) {
      console.error(e);
      setCameraOpen(false);
      showToast('Không mở được camera. Vui lòng cấp quyền hoặc chọn file.', 'error');
    }
  };

  const closeCameraScanner = () => {
    setCameraOpen(false);
    stopCameraStream();
  };

  const switchCamera = async () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: nextMode, width: { ideal: 1920 }, height: { ideal: 2560 } },
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      showToast('Camera này không khả dụng', 'error');
    }
  };

  const toggleTorch = async () => {
    const track = cameraStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: nextState }] });
      setTorchOn(nextState);
    } catch {
      showToast('Thiết bị không hỗ trợ đèn flash', 'error');
    }
  };

  // Capture with AUTO-CROP
  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      showToast('Camera chưa sẵn sàng', 'error');
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth || 360;
    const ch = video.clientHeight || 480;

    const scale = Math.max(cw / vw, ch / vh);
    const visW = cw / scale;
    const visH = ch / scale;
    const visX = (vw - visW) / 2;
    const visY = (vh - visH) / 2;

    const cropW = Math.round(visW * 0.86);
    const cropH = Math.round(visH * 0.78);
    const cropX = Math.round(visX + (visW - cropW) / 2);
    const cropY = Math.round(visY + (visH - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    closeCameraScanner();
    loadImageFromDataUrl(canvas.toDataURL('image/jpeg', 0.94));
    showToast('📷 Đã chụp & tự động cắt vừa vặn khung phiếu', 'success');
  };

  const rotatePreview = (degrees) => {
    if (!previewSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const swap = Math.abs(degrees) % 180 === 90;
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const url = canvas.toDataURL('image/jpeg', 0.94);
      loadImageFromDataUrl(url);
      showToast('✅ Đã xoay ảnh', 'success');
    };
    img.src = previewSrc;
  };

  const toggleSharpen = () => {
    if (imageSharpened) {
      if (unsharpenedSrc) {
        const img = new Image();
        img.onload = () => {
          setCurrentImageBase64(unsharpenedSrc.split(',')[1]);
          setPreviewSrc(unsharpenedSrc);
          setImageSharpened(false);
          setUnsharpenedSrc(null);
          showToast('Đã tắt làm nét', 'success');
        };
        img.src = unsharpenedSrc;
      } else if (rawOriginalSrc) {
        loadImageFromDataUrl(rawOriginalSrc, false);
        setImageSharpened(false);
        setUnsharpenedSrc(null);
        showToast('Đã tắt làm nét', 'success');
      }
      return;
    }

    if (!previewSrc) return;
    const baseSource = previewSrc;
    setUnsharpenedSrc(baseSource);

    const img = new Image();
    img.onload = () => {
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = img.width;
      sourceCanvas.height = img.height;
      const sourceCtx = sourceCanvas.getContext('2d');
      sourceCtx.drawImage(img, 0, 0);

      const imageData = sourceCtx.getImageData(0, 0, img.width, img.height);
      const out = sourceCtx.createImageData(img.width, img.height);
      const s = imageData.data;
      const d = out.data;
      const kernel = [0, -0.6, 0, -0.6, 3.4, -0.6, 0, -0.6, 0];
      const w = img.width;
      const h = img.height;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          for (let c = 0; c < 3; c++) {
            let total = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const px = Math.min(w - 1, Math.max(0, x + kx));
                const py = Math.min(h - 1, Math.max(0, y + ky));
                total += s[(py * w + px) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
              }
            }
            d[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(total)));
          }
          d[(y * w + x) * 4 + 3] = s[(y * w + x) * 4 + 3];
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').putImageData(out, 0, 0);

      const sharpenedUrl = canvas.toDataURL('image/jpeg', 0.94);
      setCurrentImageBase64(sharpenedUrl.split(',')[1]);
      setPreviewSrc(sharpenedUrl);
      setImageSharpened(true);
      showToast('✨ Đã làm nét ảnh', 'success');
    };
    img.src = baseSource;
  };

  const openCropEditor = () => {
    if (!previewSrc) return;
    setCropSourceSrc(previewSrc);
    setCropRange({ left: 0, top: 0, right: 100, bottom: 100 });
    setCropOpen(true);
  };

  const updateCropPreview = useCallback(() => {
    if (!cropSourceSrc || !cropCanvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const left = cropRange.left / 100;
      const top = cropRange.top / 100;
      const right = cropRange.right / 100;
      const bottom = cropRange.bottom / 100;

      const sx = Math.round(img.width * left);
      const sy = Math.round(img.height * top);
      const sw = Math.max(1, Math.round(img.width * (right - left)));
      const sh = Math.max(1, Math.round(img.height * (bottom - top)));

      const canvas = cropCanvasRef.current;
      if (canvas) {
        canvas.width = sw;
        canvas.height = sh;
        canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      }
    };
    img.src = cropSourceSrc;
  }, [cropSourceSrc, cropRange]);

  useEffect(() => {
    if (cropOpen) updateCropPreview();
  }, [cropOpen, cropRange, updateCropPreview]);

  const applyCrop = () => {
    if (!cropSourceSrc) return;
    const img = new Image();
    img.onload = () => {
      const left = cropRange.left / 100;
      const top = cropRange.top / 100;
      const right = Math.max(left + 0.01, cropRange.right / 100);
      const bottom = Math.max(top + 0.01, cropRange.bottom / 100);

      const sx = Math.round(img.width * left);
      const sy = Math.round(img.height * top);
      const sw = Math.max(1, Math.round(img.width * (right - left)));
      const sh = Math.max(1, Math.round(img.height * (bottom - top)));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      setCropOpen(false);
      loadImageFromDataUrl(canvas.toDataURL('image/jpeg', 0.94), false);
      showToast('✅ Đã cắt ảnh', 'success');
    };
    img.src = cropSourceSrc;
  };

  const resetImageEdits = () => {
    const targetSrc = rawOriginalSrc || previewSrc;
    if (!targetSrc) return;
    setImageSharpened(false);
    setUnsharpenedSrc(null);
    loadImageFromDataUrl(targetSrc, false);
    showToast('↺ Đã khôi phục ảnh gốc ban đầu', 'success');
  };

  // Helper partition items into separate slip/page groups
  const partitionItemsIntoSlipGroups = (itemsList, defaultSoPhieu, defaultPageNum) => {
    if (!itemsList || !itemsList.length) return [];
    const groups = [];
    let currentGroup = [];
    let lastGroupKey = null;

    for (let i = 0; i < itemsList.length; i++) {
      const item = itemsList[i];
      const itemSp = (item.soPhieu || defaultSoPhieu || '').trim();
      const itemPage = item._pageNum !== undefined && item._pageNum !== null ? item._pageNum : (defaultPageNum || 1);

      // Phân nhóm theo số phiếu hoặc số trang
      const groupKey = `${itemSp}___${itemPage}`;

      if (currentGroup.length > 0 && lastGroupKey !== null && groupKey !== lastGroupKey) {
        groups.push({
          soPhieu: currentGroup[0].soPhieu || defaultSoPhieu || '',
          pageNum: currentGroup[0]._pageNum || defaultPageNum || 1,
          items: currentGroup,
        });
        currentGroup = [];
      }

      currentGroup.push(item);
      lastGroupKey = groupKey;
    }

    if (currentGroup.length > 0) {
      groups.push({
        soPhieu: currentGroup[0].soPhieu || defaultSoPhieu || '',
        pageNum: currentGroup[0]._pageNum || defaultPageNum || 1,
        items: currentGroup,
      });
    }

    return groups;
  };

  // Google Sheets Push Helper (via Server-Side Proxy Route to guarantee 302 redirect handling & error reporting)
  const syncToGoogleSheet = async (itemsToPush, targetSoPhieu = '', pageNum = 1, silent = false) => {
    const cleanUrl = googleSheetUrl.trim();
    if (!cleanUrl) {
      if (!silent) {
        showToast('Vui lòng dán Webhook URL Google Apps Script trong Cài đặt ⚙️', 'error');
        setSettingsTab('sheet');
        setSettingsOpen(true);
      }
      return false;
    }

    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      if (!silent) {
        showToast('Link đang dán là link trang tính Google Sheet. Vui lòng dán link Webhook Google Apps Script (/exec)', 'error');
        setSettingsTab('sheet');
        setSettingsOpen(true);
      }
      return false;
    }

    const items = itemsToPush && itemsToPush.length ? itemsToPush : tableItems;
    if (!items || !items.length) {
      if (!silent) showToast('Chưa có dòng hàng nào để đẩy sang Google Sheet', 'error');
      return false;
    }

    // Tách thành các nhóm phiếu/trang riêng biệt để tự động chèn 1 dòng trống ngăn cách
    let groups = [];
    if (pageResults && pageResults.length > 1 && (!itemsToPush || itemsToPush === tableItems)) {
      groups = pageResults
        .map((p) => ({
          soPhieu: (p.soPhieu || '').trim(),
          pageNum: p.pageNum || 1,
          items: p.items || [],
        }))
        .filter((g) => g.items.length > 0);
    }

    if (!groups.length) {
      groups = partitionItemsIntoSlipGroups(items, targetSoPhieu || soPhieu, pageNum);
    }

    if (!groups.length) {
      if (!silent) showToast('Chưa có dòng hàng nào để đẩy sang Google Sheet', 'error');
      return false;
    }

    setIsSyncingSheet(true);
    setSheetSyncError(null);

    // Chuẩn bị toàn bộ items với thông tin số phiếu và trang đầy đủ
    const allItems = [];
    groups.forEach((grp, idx) => {
      const grpSoPhieu = grp.soPhieu || targetSoPhieu || soPhieu || '';
      const grpPage = grp.pageNum || (idx + 1);
      grp.items.forEach((item) => {
        allItems.push({
          ...item,
          soPhieu: item.soPhieu || grpSoPhieu,
          _pageNum: item._pageNum || grpPage,
        });
      });
    });

    const totalLines = allItems.length;
    const desc = groups.length > 1 ? `${totalLines} dòng (${groups.length} trang/phiếu)` : `${totalLines} dòng`;
    showToast(`📊 Đang lưu ${desc} sang Google Sheet...`);

    try {
      // 🌟 TỐI ƯU HÓA: Gửi batch thông minh (tối đa 150 dòng/request) thay vì 20 request rời rạc
      // Tránh nghẽn hàng đợi Google Script, triệt tiêu lỗi ngắt kết nối khi quét nhiều ảnh
      const CHUNK_SIZE = 150;
      const chunks = [];
      for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
        chunks.push(allItems.slice(i, i + CHUNK_SIZE));
      }

      let totalSynced = 0;

      for (let c = 0; c < chunks.length; c++) {
        const chunkItems = chunks[c];
        if (chunks.length > 1) {
          showToast(`📊 Đang lưu đợt ${c + 1}/${chunks.length} (${chunkItems.length} dòng) sang Google Sheet...`);
        }

        const payload = {
          soPhieu: chunkItems[0]?.soPhieu || targetSoPhieu || soPhieu || '',
          pageNum: chunkItems[0]?._pageNum || pageNum || 1,
          items: chunkItems,
        };

        let lastErr = null;
        let success = false;

        // Thử lại tự động tối đa 3 lần với backoff nếu mạng chập chờn
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetch('/api/sheet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: cleanUrl, payload }),
            });

            const resData = await res.json().catch(() => ({}));

            if (res.ok && resData.success) {
              totalSynced += chunkItems.length;
              success = true;
              break;
            } else {
              lastErr = new Error(resData.error || `Lỗi đồng bộ (HTTP ${res.status})`);
            }
          } catch (fetchErr) {
            lastErr = fetchErr;
          }

          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1200 * attempt));
          }
        }

        if (!success) {
          throw new Error(lastErr?.message || `Lỗi kết nối khi gửi đợt ${c + 1}/${chunks.length}`);
        }

        if (c < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      const nowStr = new Date().toLocaleTimeString('vi-VN');
      setLastSheetSync({ time: nowStr, count: totalSynced });
      setSheetSyncError(null);

      if (groups.length > 1) {
        showToast(`📊 Đã lưu thành công ${totalSynced} dòng (${groups.length} phiếu/trang có dòng trống phân cách) vào Google Sheet lúc ${nowStr}!`, 'success');
      } else {
        showToast(`📊 Đã lưu thành công ${totalSynced} dòng vào Google Sheet lúc ${nowStr}!`, 'success');
      }
      return true;
    } catch (e) {
      console.error('Google Sheet Sync Error:', e);
      setSheetSyncError(e.message);
      showToast('❌ Lỗi đồng bộ Google Sheet: ' + e.message, 'error');
      return false;
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Bulletproof JSON Parser & Recovery for OCR Models
  const robustParseOcrJson = useCallback((rawText, cols = selectedColumns) => {
    if (!rawText || typeof rawText !== 'string') return { soPhieu: '', items: [] };

    let text = rawText.trim();

    // 1. Loại bỏ markdown code blocks
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const toFormatted = (parsed) => {
      if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
        parsed.items = parsed.rows
          .filter((r) => Array.isArray(r) || (typeof r === 'object' && r !== null))
          .map((row) => {
            if (typeof row === 'object' && !Array.isArray(row)) return row;
            const obj = {};
            cols.forEach((colKey, idx) => {
              obj[colKey] = row[idx] ?? '';
            });
            return obj;
          });
      }
      return parsed;
    };

    // 2. Thử parse trực tiếp
    try {
      const p = JSON.parse(text);
      if (p && (Array.isArray(p.rows) || Array.isArray(p.items))) return toFormatted(p);
    } catch (e1) {}

    // 3. Tìm khối JSON giữa dấu { đầu tiên và } cuối cùng
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      try {
        const p = JSON.parse(candidate);
        if (p && (Array.isArray(p.rows) || Array.isArray(p.items))) return toFormatted(p);
      } catch (e2) {}

      // 3b. Sửa ký tự điều khiển và dấu phẩy thừa ở cuối mảng
      try {
        const sanitized = candidate
          .replace(/[\u0000-\u001F]+/g, (match) => (match.includes('\n') ? ' ' : ''))
          .replace(/,\s*([\]}])/g, '$1');
        const p = JSON.parse(sanitized);
        if (p && (Array.isArray(p.rows) || Array.isArray(p.items))) return toFormatted(p);
      } catch (e3) {}
    }

    // 4. Phục hồi JSON bị cắt cụt ở đuôi (thiếu ]} hoặc ]]])
    if (firstBrace !== -1) {
      let candidate = text.substring(firstBrace).trim().replace(/,\s*$/, '');
      const endings = [']}', ']]}', '"]}', '"]]}', '}'];
      for (const end of endings) {
        try {
          const p = JSON.parse(candidate + end);
          if (p && (Array.isArray(p.rows) || Array.isArray(p.items))) return toFormatted(p);
        } catch (e4) {}
      }
    }

    // 5. REGEX FALLBACK: Trích xuất trực tiếp số phiếu và các dòng [...] qua Regex
    let detectedSoPhieu = '';
    const spMatch = text.match(/"soPhieu"\s*:\s*"([^"]*)"/i);
    if (spMatch) {
      detectedSoPhieu = spMatch[1].trim();
    }

    const rows = [];
    const rowRegex = /\[\s*((?:"(?:\\.|[^"\\])*"|[^,\]]*?)(?:\s*,\s*(?:"(?:\\.|[^"\\])*"|[^,\]]*?))*)\s*\]/g;
    let match;
    while ((match = rowRegex.exec(text)) !== null) {
      const inside = match[0];
      try {
        const parsedRow = JSON.parse(inside);
        if (Array.isArray(parsedRow) && parsedRow.length >= 2) {
          rows.push(parsedRow);
        }
      } catch {
        const cells = [];
        const cellRegex = /"((?:\\.|[^"\\])*)"/g;
        let cMatch;
        while ((cMatch = cellRegex.exec(inside)) !== null) {
          cells.push(cMatch[1]);
        }
        if (cells.length >= 2) {
          rows.push(cells);
        }
      }
    }

    if (rows.length > 0) {
      return toFormatted({ soPhieu: detectedSoPhieu, rows });
    }

    return { soPhieu: detectedSoPhieu, items: [{ ten: text }] };
  }, [selectedColumns]);

  // Universal OCR Result Parser (Supports both Compact 2D Matrix rows & Legacy items object)
  const parseOcrResultToItems = useCallback((resultData, pageNum = null, pageSoPhieu = '') => {
    let rawList = [];
    let detectedSp = pageSoPhieu || resultData.soPhieu || '';

    if (Array.isArray(resultData.rows)) {
      rawList = resultData.rows.map((row) => {
        const itemObj = {};
        if (Array.isArray(row)) {
          selectedColumns.forEach((colKey, idx) => {
            itemObj[colKey] = row[idx] ?? '';
          });
        } else if (typeof row === 'object' && row !== null) {
          selectedColumns.forEach((colKey) => {
            itemObj[colKey] = row[colKey] ?? '';
          });
        }
        return itemObj;
      });
    } else if (Array.isArray(resultData.items)) {
      rawList = resultData.items;
    }

    // 🌟 TỰ ĐỘNG GIẢI MÃ NẾU BỊ GỘP CHUỖI JSON VÀO TRƯỜNG TÊN HÀNG DUY NHẤT
    if (rawList.length === 1 && rawList[0].ten && typeof rawList[0].ten === 'string') {
      const trimmedTen = rawList[0].ten.trim();
      if (trimmedTen.startsWith('{') || trimmedTen.includes('"rows":') || trimmedTen.includes('"soPhieu":')) {
        const recovered = robustParseOcrJson(trimmedTen, selectedColumns);
        if (recovered && Array.isArray(recovered.items) && recovered.items.length > 0) {
          rawList = recovered.items;
          if (recovered.soPhieu) {
            detectedSp = recovered.soPhieu;
          }
        }
      }
    }

    const formattedList = rawList.map((item) => {
      const out = {};
      if (pageNum !== null) out._pageNum = pageNum;
      if (pageSoPhieu) out.soPhieu = pageSoPhieu;

      selectedColumns.forEach((k) => {
        let val = item?.[k] ?? '';
        if (k === 'soOSPO') val = formatOSPO(val);
        out[k] = typeof val === 'string' ? val.trim() : String(val || '');
      });
      return out;
    });

    // 🌟 HẬU XỬ LÝ GỘP DÒNG THÔNG MINH (Fallback Client-side):
    // Nếu có dòng chỉ có tên/quy cách mà không có số lượng, mã OS/PO, số pallet,
    // thì tự động gộp phần tên đó vào dòng có số lượng liền trước (hoặc liền sau)
    const mergedList = [];
    for (let i = 0; i < formattedList.length; i++) {
      const cur = formattedList[i];
      const hasQty = !!(cur.soLuongChungTu || cur.soLuongThucNhap);
      const hasOspo = !!cur.soOSPO;
      const hasPallet = !!cur.soPallet;
      const hasDataFields = hasQty || hasOspo || hasPallet;

      // Nếu dòng hiện tại chỉ có tên mà không có số lượng/mã PO
      if (!hasDataFields && cur.ten && cur.ten.trim()) {
        if (mergedList.length > 0) {
          // Gộp vào dòng trước đó
          const prev = mergedList[mergedList.length - 1];
          prev.ten = (prev.ten ? prev.ten + ' ' : '') + cur.ten.trim();
          continue;
        } else if (i + 1 < formattedList.length) {
          // Gộp vào dòng kế tiếp nếu là dòng đầu tiên
          const next = formattedList[i + 1];
          next.ten = cur.ten.trim() + (next.ten ? ' ' + next.ten : '');
          continue;
        }
      }
      mergedList.push(cur);
    }

    return mergedList;
  }, [selectedColumns]);

  // Test OpenRouter Connection
  const testOpenRouterConnection = async () => {
    const key = openRouterKey.trim();
    if (!key) {
      showToast('Vui lòng nhập API Key OpenRouter trước khi test', 'error');
      return;
    }
    setOpenRouterTesting(true);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || ('Lỗi xác thực ' + res.status));
      }
      const info = await res.json().catch(() => ({}));
      const label = info.data?.label || 'Key hợp lệ';
      showToast('✅ Kết nối OpenRouter thành công! [' + label + ']', 'success');
    } catch (e) {
      showToast('❌ Lỗi OpenRouter: ' + e.message, 'error');
    } finally {
      setOpenRouterTesting(false);
    }
  };

  // Direct OpenRouter OCR (Supports Cost-Effective & Free Models like Nex AGI)
  const scanClientOpenRouterWithBase64 = async (base64Data, mimeType, key, model) => {
    // Tự động nén ảnh trên canvas nếu ảnh lớn để tăng tốc độ upload lên OpenRouter gấp 5-10 lần
    let payloadBase64 = base64Data;
    let payloadMime = mimeType;
    if (base64Data && base64Data.length > 90000) {
      try {
        const compressed = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1200;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
          };
          img.onerror = () => resolve(null);
          img.src = `data:${mimeType};base64,${base64Data}`;
        });
        if (compressed?.base64) {
          payloadBase64 = compressed.base64;
          payloadMime = compressed.mime;
        }
      } catch (e) {
        console.warn('Không thể nén ảnh cho OpenRouter:', e);
      }
    }

    const colListStr = selectedColumns.map((k, i) => (i + 1) + '.' + (COLUMN_DEFS[k]?.short || k)).join(', ');
    const rules = ['soPhieu', ...selectedColumns]
      .map((k) => '- ' + (k === 'soPhieu' ? 'Số phiếu' : (COLUMN_DEFS[k]?.short || k)) + ': ' + (fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''))
      .join('\n');

    const promptText = 'Chuyên gia OCR phiếu kho Việt Nam (chữ in & viết tay).\n' +
      'YÊU CẦU BẮT BUỘC:\n' +
      '- XUẤT KẾT QUẢ JSON NGAY DÒNG ĐẦU TIÊN. Tuyệt đối không suy luận dài dòng, không giải thích bên ngoài JSON.\n' +
      '- Định dạng trả về duy nhất là chuỗi JSON:\n' +
      '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}\n\n' +
      'Quy tắc trích xuất quan trọng:\n' +
      '1. Đọc chuẩn chữ viết tay tiếng Việt, số viết tay (phân biệt 0/O, 1/7, 2/Z, 5/S, 8/B).\n' +
      '2. Ưu tiên giá trị viết tay sửa đè. Bỏ qua dòng tổng cộng.\n' +
      '3. Ô không có dữ liệu để chuỗi rỗng "" (tuyệt đối không ghi ???, không tự suy diễn).\n' +
      '4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp (ví dụ dòng trên ghi tên loại sản phẩm như "PE SHOE BOX (ECO)", dòng dưới ghi kích thước/quy cách mã như "290*180*110mm MK-A-1") nhưng chỉ có chung 1 bộ số lượng thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất.\n' +
      'Hướng dẫn cột:\n' + rules + '\n\n' +
      'ĐỊNH DẠNG TRẢ VỀ: Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [' + colListStr + ']):\n' +
      '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}';

    const selectedModel = model || 'nex-agi/nex-n2.5-pro:free';
    const reqBody = {
      model: selectedModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: 'data:' + payloadMime + ';base64,' + payloadBase64 } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    };

    // Tắt suy luận dài dòng cho các dòng model OpenRouter hỗ trợ reasoning (như Nex AGI) để đạt tốc độ siêu tốc 1-3s và trả thẳng JSON
    if (selectedModel.includes('nex') || selectedModel.includes('free') || selectedModel.includes('thinking')) {
      reqBody.include_reasoning = false;
      reqBody.reasoning = { effort: 'none' };
    }

    if (!selectedModel.includes('qwen')) {
      reqBody.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key.trim(),
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://scanphieu.vercel.app',
        'X-Title': 'Scan Phieu',
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.error?.message || ('OpenRouter Error: ' + res.status));
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    let text = (msg?.content || '').trim();
    if (!text && msg?.reasoning) {
      text = msg.reasoning.trim();
    }
    console.log('[OpenRouter Raw Response]:', text);
    if (!text) {
      throw new Error('Không nhận được dữ liệu phản hồi từ OpenRouter');
    }

    // 1. Parse JSON trực tiếp (xử lý markdown ```json ... ```)
    const cleanText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed = null;

    try {
      parsed = JSON.parse(cleanText);
    } catch {
      const m = cleanText.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {}
      }
    }

    // 2. Nếu JSON hợp lệ và có chứa mảng rows hoặc items
    if (parsed && (Array.isArray(parsed.rows) || Array.isArray(parsed.items))) {
      if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
        parsed.items = parsed.rows
          .filter((row) => Array.isArray(row) || (typeof row === 'object' && row !== null))
          .map((row) => {
            if (typeof row === 'object' && !Array.isArray(row)) return row;
            const obj = {};
            selectedColumns.forEach((colKey, idx) => {
              obj[colKey] = row[idx] ?? '';
            });
            return obj;
          });
      }
      return parsed;
    }

    // 3. Dự phòng phân tích dòng text / bullet points nếu model trả về dạng danh sách
    let fallbackSoPhieu = '';
    const spMatch = text.match(/(?:Số\s*phiếu|Số\s*chứng\s*từ|Số\s*XKP|Số|No\.?)[:\s]+([A-Z0-9_\-\s\/]+)/i);
    if (spMatch) {
      fallbackSoPhieu = spMatch[1].split('\n')[0].trim().replace(/^[:\s\-]+/, '');
    }

    const fallbackItems = [];
    const sections = text.split(/(?:^|\n)\s*(?:\d+[\.\)]\s*(?:STT\s*\d+[:\s]*)?|STT\s*\d+[:\s]*)/i);
    if (sections.length > 1) {
      for (let i = 1; i < sections.length; i++) {
        const sec = sections[i];
        const lines = sec.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        const firstLine = lines[0];

        const parts = firstLine.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          const itemObj = {};
          selectedColumns.forEach((col, idx) => {
            itemObj[col] = parts[idx] ? parts[idx].replace(/^[:\s\-]+/, '') : '';
          });
          fallbackItems.push(itemObj);
          continue;
        }

        let ten = firstLine.replace(/^[:\s\-]+/, '');
        let soOSPO = '', donViTinh = '', slChungTu = '', slThucNhap = '', soPallet = '', ghiChu = '';
        for (const l of lines) {
          const ospoM = l.match(/(?:Số\s*O\.?S\/?PO|PO|OS)[:\s]+([^\n]+)/i);
          if (ospoM) soOSPO = ospoM[1].trim();
          const dvtM = l.match(/(?:ĐVT|Đơn\s*vị\s*tính)[:\s]+([^\n]+)/i);
          if (dvtM) donViTinh = dvtM[1].trim();
          const slctM = l.match(/(?:SL\s*chứng\s*từ|Số\s*lượng\s*chứng\s*từ)[:\s]+([^\n]+)/i);
          if (slctM) slChungTu = slctM[1].trim();
          const sltnM = l.match(/(?:SL\s*thực\s*nhập|Số\s*lượng\s*thực\s*nhập)[:\s]+([^\n]+)/i);
          if (sltnM) slThucNhap = sltnM[1].trim();
          const palM = l.match(/(?:Số\s*pallet|Pallet)[:\s]+([^\n]+)/i);
          if (palM) soPallet = palM[1].trim();
        }

        fallbackItems.push({
          ten: ten || '',
          soOSPO: soOSPO || '',
          donViTinh: donViTinh || '',
          soLuongChungTu: slChungTu || '',
          soLuongThucNhap: slThucNhap || '',
          soPallet: soPallet || '',
          ghiChu: ghiChu || '',
        });
      }
    }

    if (fallbackItems.length > 0) {
      return {
        soPhieu: fallbackSoPhieu,
        items: fallbackItems,
      };
    }

    throw new Error('OpenRouter chưa trích xuất được bảng hàng hóa. Vui lòng bấm Quét Lại hoặc thử chọn mô hình Nex-N2.5-Pro / Gemini 2.5 Flash.');
  };


  // Test Kira AI Connection
  const testKiraConnection = async () => {
    const key = kiraKey.trim();
    if (!key) {
      showToast('Vui lòng nhập API Key Kira AI (bắt đầu bằng kira_...) trước khi test', 'error');
      return;
    }
    setKiraTesting(true);
    try {
      const res = await fetch('/api/kira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', key, model: kiraModel.trim() || 'qwen3.8-max' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || ('Lỗi xác thực ' + res.status));
      }
      showToast('✅ Kết nối Kira AI thành công! Key hoạt động tốt.', 'success');
    } catch (e) {
      showToast('❌ Lỗi Kira AI: ' + e.message, 'error');
    } finally {
      setKiraTesting(false);
    }
  };

  // Direct Kira AI OCR (supports both Free & VIP models faithfully)
  const scanClientKiraWithBase64 = async (base64Data, mimeType, key, model) => {
    const effectiveModel = model?.trim() || 'qwen3.8-27b-free';

    // Auto-compress image to ensure fast processing and prevent payload limit / 502
    let payloadBase64 = base64Data;
    let payloadMime = mimeType;
    if (base64Data && base64Data.length > 90000) {
      try {
        const compressed = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1000;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.74);
            resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
          };
          img.onerror = () => resolve(null);
          img.src = `data:${mimeType};base64,${base64Data}`;
        });
        if (compressed?.base64) {
          payloadBase64 = compressed.base64;
          payloadMime = compressed.mime;
        }
      } catch (e) {
        console.warn('Không thể nén ảnh cho Kira AI:', e);
      }
    }

    const colListStr = selectedColumns.map((k, i) => (i + 1) + '.' + (COLUMN_DEFS[k]?.short || k)).join(', ');
    const rules = ['soPhieu', ...selectedColumns]
      .map((k) => '- ' + (k === 'soPhieu' ? 'Số phiếu' : (COLUMN_DEFS[k]?.short || k)) + ': ' + (fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''))
      .join('\n');

    const promptText = 'Chuyên gia OCR phiếu kho Việt Nam (chữ in & viết tay).\n' +
      'YÊU CẦU BẮT BUỘC:\n' +
      '- XUẤT KẾT QUẢ JSON NGAY DÒNG ĐẦU TIÊN. Tuyệt đối không suy luận dài dòng, không giải thích bên ngoài JSON.\n' +
      '- Định dạng trả về duy nhất là chuỗi JSON:\n' +
      '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}\n\n' +
      'Quy tắc trích xuất quan trọng:\n' +
      '1. Đọc chuẩn chữ viết tay tiếng Việt, số viết tay (phân biệt 0/O, 1/7, 2/Z, 5/S, 8/B).\n' +
      '2. Ưu tiên giá trị viết tay sửa đè. Bỏ qua dòng tổng cộng.\n' +
      '3. Ô không có dữ liệu để chuỗi rỗng "" (tuyệt đối không ghi ???, không tự suy diễn).\n' +
      '4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp (ví dụ dòng trên ghi tên loại sản phẩm như "PE SHOE BOX (ECO)", dòng dưới ghi kích thước/quy cách mã như "290*180*110mm MK-A-1") nhưng chỉ có chung 1 bộ số lượng thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất.\n' +
      'Hướng dẫn cột:\n' + rules + '\n\n' +
      'ĐỊNH DẠNG TRẢ VỀ: Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [' + colListStr + ']):\n' +
      '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}';

    const isFree = effectiveModel.includes('-free') || effectiveModel.startsWith('kira-');
    const reqPayload = {
      key: key.trim(),
      model: effectiveModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: 'data:' + payloadMime + ';base64,' + payloadBase64 } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    };

    if (!effectiveModel.includes('qwen')) {
      reqPayload.response_format = { type: 'json_object' };
    }

    const res = await fetch('/api/kira', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.error?.message || ('Kira AI Error: ' + res.status));
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    let text = (msg?.content || '').trim();
    if (!text && msg?.reasoning_content) {
      text = msg.reasoning_content.trim();
    }
    if (!text) {
      throw new Error('Không nhận được dữ liệu phản hồi từ Kira AI. Vui lòng thử lại.');
    }

    // 1. Parse JSON trực tiếp (xử lý khối markdown ```json ... ```)
    const cleanText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed = null;

    try {
      parsed = JSON.parse(cleanText);
    } catch {
      const m = cleanText.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {}
      }
    }

    // 2. Nếu JSON hợp lệ và có chứa mảng rows hoặc items
    if (parsed && (Array.isArray(parsed.rows) || Array.isArray(parsed.items))) {
      if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
        parsed.items = parsed.rows
          .filter((row) => Array.isArray(row) || (typeof row === 'object' && row !== null))
          .map((row) => {
            if (typeof row === 'object' && !Array.isArray(row)) return row;
            const obj = {};
            selectedColumns.forEach((colKey, idx) => {
              obj[colKey] = row[idx] ?? '';
            });
            return obj;
          });
      }
      return parsed;
    }

    // 3. Dự phòng thông minh: Nếu AI sinh text/suy luận dạng danh sách (STT 1: ..., 1. ..., bullet points)
    // Tự động phân tích và tách thành từng dòng riêng biệt thay vì gom toàn bộ văn bản vào 1 dòng
    let fallbackSoPhieu = '';
    const spMatch = text.match(/(?:Số\s*phiếu|Số\s*chứng\s*từ|Số\s*XKP|Số|No\.?)[:\s]+([A-Z0-9_\-\s\/]+)/i);
    if (spMatch) {
      fallbackSoPhieu = spMatch[1].split('\n')[0].trim().replace(/^[:\s\-]+/, '');
    }

    const fallbackItems = [];
    const sections = text.split(/(?:^|\n)\s*(?:\d+[\.\)]\s*(?:STT\s*\d+[:\s]*)?|STT\s*\d+[:\s]*)/i);
    if (sections.length > 1) {
      for (let i = 1; i < sections.length; i++) {
        const sec = sections[i];
        const lines = sec.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        const firstLine = lines[0];

        // Trường hợp các trường phân cách bằng dấu phẩy: Mã hàng, Số PO, ĐVT, SL chứng từ, SL thực nhập, Pallet
        const parts = firstLine.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          const itemObj = {};
          selectedColumns.forEach((col, idx) => {
            itemObj[col] = parts[idx] ? parts[idx].replace(/^[:\s\-]+/, '') : '';
          });
          fallbackItems.push(itemObj);
          continue;
        }

        // Trường hợp từng trường nằm ở các dòng gạch đầu dòng con
        let ten = firstLine.replace(/^[:\s\-]+/, '');
        let soOSPO = '', donViTinh = '', slChungTu = '', slThucNhap = '', soPallet = '', ghiChu = '';
        for (const l of lines) {
          const ospoM = l.match(/(?:Số\s*O\.?S\/?PO|PO|OS)[:\s]+([^\n]+)/i);
          if (ospoM) soOSPO = ospoM[1].trim();
          const dvtM = l.match(/(?:ĐVT|Đơn\s*vị\s*tính)[:\s]+([^\n]+)/i);
          if (dvtM) donViTinh = dvtM[1].trim();
          const slctM = l.match(/(?:SL\s*chứng\s*từ|Số\s*lượng\s*chứng\s*từ)[:\s]+([^\n]+)/i);
          if (slctM) slChungTu = slctM[1].trim();
          const sltnM = l.match(/(?:SL\s*thực\s*nhập|Số\s*lượng\s*thực\s*nhập)[:\s]+([^\n]+)/i);
          if (sltnM) slThucNhap = sltnM[1].trim();
          const palM = l.match(/(?:Số\s*pallet|Pallet)[:\s]+([^\n]+)/i);
          if (palM) soPallet = palM[1].trim();
        }

        fallbackItems.push({
          ten: ten || '',
          soOSPO: soOSPO || '',
          donViTinh: donViTinh || '',
          soLuongChungTu: slChungTu || '',
          soLuongThucNhap: slThucNhap || '',
          soPallet: soPallet || '',
          ghiChu: ghiChu || '',
        });
      }
    }

    if (fallbackItems.length > 0) {
      return {
        soPhieu: fallbackSoPhieu,
        items: fallbackItems,
      };
    }

    // 4. Nếu không thể bóc tách cấu trúc dòng hàng nào, báo lỗi rõ ràng để người dùng quét lại, tuyệt đối không gộp bừa vào 1 dòng
    throw new Error('AI chưa trích xuất được bảng hàng hóa. Vui lòng bấm Quét Lại hoặc chọn mô hình qwen3.8-flash-free / gemini-3.8-flash.');
  };

  // Test B.AI Connection
  const testBaiConnection = async () => {
    const key = baiKey.trim();
    if (!key) {
      showToast('Vui lòng nhập API Key B.AI trước khi test', 'error');
      return;
    }
    setBaiTesting(true);
    try {
      const res = await fetch('/api/bai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', key })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || ('Lỗi xác thực ' + res.status));
      }
      showToast('✅ Kết nối B.AI thành công! Key hoạt động tốt (300k credits).', 'success');
    } catch (e) {
      showToast('❌ Lỗi B.AI: ' + e.message, 'error');
    } finally {
      setBaiTesting(false);
    }
  };

  // Direct B.AI OCR (supports deepseek-v4.1-flash, glm-5.3-flash, qwen3.8-flash, hy3, mimo-v2.5)
  const scanClientBaiWithBase64 = async (base64Data, mimeType, key, model) => {
    const effectiveModel = (model?.trim() || 'deepseek-v4.1-flash').toLowerCase();

    // Auto-compress image to ensure fast processing and prevent payload limit
    let payloadBase64 = base64Data;
    let payloadMime = mimeType;
    if (base64Data && base64Data.length > 90000) {
      try {
        const compressed = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1200;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
            resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
          };
          img.onerror = () => resolve(null);
          img.src = `data:${mimeType};base64,${base64Data}`;
        });
        if (compressed?.base64) {
          payloadBase64 = compressed.base64;
          payloadMime = compressed.mime;
        }
      } catch (e) {
        console.warn('Không thể nén ảnh cho B.AI:', e);
      }
    }

    const colListStr = selectedColumns.map((k, i) => (i + 1) + '.' + (COLUMN_DEFS[k]?.short || k)).join(', ');
    const rules = ['soPhieu', ...selectedColumns]
      .map((k) => '- ' + (k === 'soPhieu' ? 'Số phiếu' : (COLUMN_DEFS[k]?.short || k)) + ': ' + (fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''))
      .join('\n');

    const promptText = 'Chuyên gia OCR phiếu kho Việt Nam (chữ in & viết tay).\n' +
      'YÊU CẦU BẮT BUỘC:\n' +
      '- XUẤT KẾT QUẢ JSON NGAY DÒNG ĐẦU TIÊN. Tuyệt đối không suy luận dài dòng, không giải thích bên ngoài JSON, không viết tiếng Anh.\n' +
      '- Định dạng trả về duy nhất là chuỗi JSON:\n' +
      '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}\n\n' +
      'Quy tắc trích xuất quan trọng:\n' +
      '1. Đọc chuẩn chữ viết tay tiếng Việt, số viết tay (phân biệt 0/O, 1/7, 2/Z, 5/S, 8/B).\n' +
      '2. Ưu tiên giá trị viết tay sửa đè. Bỏ qua dòng tổng cộng.\n' +
      '3. Ô không có dữ liệu để chuỗi rỗng "" (tuyệt đối không ghi ???, không tự suy diễn).\n' +
      '4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp (ví dụ dòng trên ghi tên loại sản phẩm như "PE SHOE BOX (ECO)", dòng dưới ghi kích thước/quy cách mã như "290*180*110mm MK-A-1") nhưng chỉ có chung 1 bộ số lượng thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất.\n' +
      'Hướng dẫn cột:\n' + rules + '\n\n' +
      'ĐỊNH DẠNG TRẢ VỀ: Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [' + colListStr + ']):\n' +
      '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}';

    const reqPayload = {
      key: key.trim(),
      model: effectiveModel,
      messages: [
        {
          role: 'system',
          content: 'You are an automated OCR parser for Vietnamese warehouse receipts. Output ONLY the raw JSON object matching the requested schema. DO NOT output internal reasoning, conversational thinking, or explanations.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: 'data:' + payloadMime + ';base64,' + payloadBase64 } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 6000,
    };

    if (!effectiveModel.toLowerCase().includes('qwen')) {
      reqPayload.response_format = { type: 'json_object' };
    }

    const res = await fetch('/api/bai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.error?.message || ('B.AI Error: ' + res.status));
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    let text = (msg?.content || '').trim();

    // Loại bỏ tag <think>...</think> nếu có
    if (text) {
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    // Nếu content rỗng, kiểm tra xem trong reasoning_content có khối JSON hoàn chỉnh không
    if (!text && msg?.reasoning_content) {
      const rText = msg.reasoning_content;
      const jsonBlock = rText.match(/\{[\s\S]*"rows"[\s\S]*\}/) || rText.match(/\{[\s\S]*"items"[\s\S]*\}/);
      if (jsonBlock) {
        text = jsonBlock[0].trim();
      }
    }

    if (!text) {
      throw new Error('Không nhận được dữ liệu phản hồi từ B.AI. Vui lòng thử lại hoặc chọn mô hình Qwen3.8-Flash.');
    }

    // Hàm làm sạch giá trị từng ô, loại bỏ suy luận nháp tiếng Anh (thinking leak)
    const cleanOcrCell = (val, colKey) => {
      if (val === null || val === undefined) return '';
      let s = String(val).trim();
      if (!s || s === '???') return '';

      // Phát hiện thinking leak
      if (/maybe|actually|let's read|let's see|in column|it might be|handwritten|looks like|wait column/i.test(s)) {
        const q = s.match(/"([^"]+)"/);
        if (q) {
          s = q[1].trim();
        } else {
          s = s.replace(/(?:maybe|actually|let's see|let's read|in column|it might be|handwritten|looks like|wait column)[\s\S]*/i, '').trim();
        }
      }

      if (colKey === 'soOSPO') {
        return formatOSPO(s);
      }
      if (colKey === 'soLuongChungTu' || colKey === 'soLuongThucNhap') {
        const m = s.match(/\b\d+(?:[.,]\d+)?\b/);
        if (m) return m[0].replace(',', '.');
      }
      if (colKey === 'donViTinh') {
        s = s.replace(/["'?]/g, '').trim();
        const dvt = s.match(/\b(EA|PCS|KG|BOX|CÁI|THÙNG|BỘ|CUỘN|CÂY)\b/i);
        if (dvt) return dvt[0].toUpperCase();
      }
      if (colKey === 'soPallet') {
        s = s.replace(/["'?]/g, '').trim();
        s = s.replace(/(?:ghi chú|actually|maybe)[\s\S]*/i, '').trim();
      }
      return s.replace(/^[:\s\-]+/, '').replace(/[:\s\-]+$/, '');
    };

    // Parse JSON trực tiếp
    const cleanText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed = null;

    try {
      parsed = JSON.parse(cleanText);
    } catch {
      const m = cleanText.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {}
      }
    }

    if (parsed && (Array.isArray(parsed.rows) || Array.isArray(parsed.items))) {
      let soPhieuVal = String(parsed.soPhieu || '').trim();
      if (/maybe|actually|let's/i.test(soPhieuVal)) {
        const q = soPhieuVal.match(/"([^"]+)"/);
        if (q) soPhieuVal = q[1].trim();
      }
      parsed.soPhieu = soPhieuVal;

      if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
        parsed.items = parsed.rows
          .filter((row) => Array.isArray(row) || (typeof row === 'object' && row !== null))
          .map((row) => {
            if (typeof row === 'object' && !Array.isArray(row)) {
              const cleaned = {};
              Object.keys(row).forEach((k) => {
                cleaned[k] = cleanOcrCell(row[k], k);
              });
              return cleaned;
            }
            const obj = {};
            selectedColumns.forEach((colKey, idx) => {
              obj[colKey] = cleanOcrCell(row[idx], colKey);
            });
            return obj;
          });
      } else if (Array.isArray(parsed.items)) {
        parsed.items = parsed.items.map((item) => {
          const cleaned = {};
          selectedColumns.forEach((colKey) => {
            cleaned[colKey] = cleanOcrCell(item[colKey], colKey);
          });
          return cleaned;
        });
      }
      return parsed;
    }

    // Dự phòng thông minh
    let fallbackSoPhieu = '';
    const spMatch = text.match(/(?:Số\s*phiếu|Số\s*chứng\s*từ|Số\s*XKP|Số|No\.?)[:\s]+([A-Z0-9_\-\s\/]+)/i);
    if (spMatch) {
      fallbackSoPhieu = spMatch[1].split('\n')[0].trim().replace(/^[:\s\-]+/, '');
      if (/maybe|actually|let's/i.test(fallbackSoPhieu)) {
        const q = fallbackSoPhieu.match(/"([^"]+)"/);
        if (q) fallbackSoPhieu = q[1].trim();
      }
    }

    const fallbackItems = [];
    const sections = text.split(/(?:^|\n)\s*(?:\d+[\.\)]\s*(?:STT\s*\d+[:\s]*)?|STT\s*\d+[:\s]*)/i);
    if (sections.length > 1) {
      for (let i = 1; i < sections.length; i++) {
        const sec = sections[i];
        const lines = sec.split('\n').map((l) => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        const firstLine = lines[0];
        const parts = firstLine.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          const itemObj = {};
          selectedColumns.forEach((col, idx) => {
            itemObj[col] = cleanOcrCell(parts[idx], col);
          });
          fallbackItems.push(itemObj);
          continue;
        }

        let ten = cleanOcrCell(firstLine, 'ten');
        let soOSPO = '', donViTinh = '', slChungTu = '', slThucNhap = '', soPallet = '', ghiChu = '';
        for (const l of lines) {
          const ospoM = l.match(/(?:Số\s*O\.?S\/?PO|PO|OS)[:\s]+([^\n]+)/i);
          if (ospoM) soOSPO = cleanOcrCell(ospoM[1], 'soOSPO');
          const dvtM = l.match(/(?:ĐVT|Đơn\s*vị\s*tính)[:\s]+([^\n]+)/i);
          if (dvtM) donViTinh = cleanOcrCell(dvtM[1], 'donViTinh');
          const slctM = l.match(/(?:SL\s*chứng\s*từ|Số\s*lượng\s*chứng\s*từ)[:\s]+([^\n]+)/i);
          if (slctM) slChungTu = cleanOcrCell(slctM[1], 'soLuongChungTu');
          const sltnM = l.match(/(?:SL\s*thực\s*nhập|Số\s*lượng\s*thực\s*nhập)[:\s]+([^\n]+)/i);
          if (sltnM) slThucNhap = cleanOcrCell(sltnM[1], 'soLuongThucNhap');
          const palM = l.match(/(?:Số\s*pallet|Pallet)[:\s]+([^\n]+)/i);
          if (palM) soPallet = cleanOcrCell(palM[1], 'soPallet');
        }

        fallbackItems.push({
          ten: ten || '',
          soOSPO: soOSPO || '',
          donViTinh: donViTinh || '',
          soLuongChungTu: slChungTu || '',
          soLuongThucNhap: slThucNhap || '',
          soPallet: soPallet || '',
          ghiChu: ghiChu || '',
        });
      }
    }

    if (fallbackItems.length > 0) {
      return {
        soPhieu: fallbackSoPhieu,
        items: fallbackItems,
      };
    }

    throw new Error('B.AI chưa trích xuất được bảng hàng hóa. Vui lòng bấm Quét Lại hoặc chọn mô hình DeepSeek-V4.1-Flash / Qwen3.8-Flash.');
  };

  // Direct Gemini OCR with Google Generative AI (Optimized Compact 2D Matrix Output & Fast Vision)
  const scanClientGeminiWithBase64 = async (base64Data, mimeType, key) => {
    // 1. Tự động nén ảnh thông minh trước khi gửi (maxDim = 1500px, JPEG 0.85)
    // Tăng tốc upload gấp 10 lần và giảm token hình ảnh của Google Gemini từ ~3.100 xuống ~516 tokens
    let payloadBase64 = base64Data;
    let payloadMime = mimeType;
    if (base64Data && base64Data.length > 90000) {
      try {
        const compressed = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1500;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
              else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
          };
          img.onerror = () => resolve(null);
          img.src = `data:${mimeType};base64,${base64Data}`;
        });
        if (compressed?.base64) {
          payloadBase64 = compressed.base64;
          payloadMime = compressed.mime;
        }
      } catch (e) {
        console.warn('Không thể nén ảnh cho Gemini:', e);
      }
    }

    const colListStr = selectedColumns.map((k, i) => `${i + 1}.${COLUMN_DEFS[k]?.short || k}`).join(', ');
    const rules = ['soPhieu', ...selectedColumns]
      .map((k) => `- ${k === 'soPhieu' ? 'Số phiếu' : COLUMN_DEFS[k]?.short || k}: ${fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''}`)
      .join('\n');

    const promptText = `Chuyên gia OCR phiếu kho Việt Nam (đọc chuẩn chữ in & chữ viết tay).
YÊU CẦU BẮT BUỘC:
- XUẤT KẾT QUẢ JSON NGAY DÒNG ĐẦU TIÊN. Tuyệt đối không suy luận dài dòng, không giải thích bên ngoài JSON.
- Định dạng trả về duy nhất là chuỗi JSON:
{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}

Quy tắc trích xuất quan trọng:
1. Đọc chuẩn chữ viết tay tiếng Việt, số viết tay (phân biệt 0/O, 1/7, 2/Z, 5/S, 8/B).
2. Ưu tiên giá trị viết tay sửa đè. Bỏ qua dòng tổng cộng.
3. Ô không có dữ liệu để chuỗi rỗng "" (tuyệt đối không ghi ???, không tự suy diễn).
4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp (ví dụ dòng trên ghi tên loại sản phẩm như "PE SHOE BOX (ECO)", dòng dưới ghi kích thước/quy cách mã như "290*180*110mm MK-A-1", hoặc dòng trên là mã và dòng dưới là quy cách) nhưng chỉ có chung 1 bộ số lượng, 1 STT hoặc 1 mã OS/PO thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất (nối tên thành 1 chuỗi hoàn chỉnh). Tuyệt đối không tách thành 2 dòng riêng biệt nếu dòng kia không có số lượng thực tế.
Hướng dẫn cột:
${rules}

ĐỊNH DẠNG TRẢ VỀ:
Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [${colListStr}]):
{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}`;

    const body = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: payloadMime, data: payloadBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16384,
        topP: 0.95,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.error?.message || `API Error: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const err = new Error('Không nhận được kết quả từ Gemini AI');
      err.status = 502;
      throw err;
    }

    return robustParseOcrJson(text, selectedColumns);
  };

  const scanWithTesseract = async (base64Data, mimeType, onProgress) => {
    if (!window.Tesseract) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Không thể tải Tesseract.js'));
        document.head.appendChild(script);
      });
    }

    const result = await window.Tesseract.recognize(
      'data:' + mimeType + ';base64,' + base64Data,
      'eng+vie',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) onProgress(0.3 + m.progress * 0.6);
          else if (m.status === 'loading language traineddata') onProgress(0.1 + (m.progress || 0) * 0.2);
        },
      }
    );
    onProgress(1);

    const raw = result.data.text;
    const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    const items = [];
    let sp = '';

    for (const line of lines) {
      const m = line.match(/(?:S[oố]|XKP|NTH|No)[:\s]*([A-Z]*\s*[0-9]+)/i);
      if (m && !sp) {
        sp = m[1].trim();
        continue;
      }
      const p = line.match(/^\d+[.\s]*(.+?)\s+(\d+)\s*$/);
      if (p) {
        const item = {};
        if (selectedColumns.includes('ten')) item.ten = p[1].trim();
        if (selectedColumns.includes('soLuongChungTu')) item.soLuongChungTu = p[2];
        else if (selectedColumns.includes('soLuongThucNhap')) item.soLuongThucNhap = p[2];
        items.push(item);
      }
    }
    if (!items.length) {
      const item = {};
      if (selectedColumns.includes('ten')) item.ten = raw.substring(0, 200);
      items.push(item);
    }
    return { soPhieu: sp, items };
  };

  // OCR Single Image Helper with Failover (Google Gemini 3.6 Flash & OpenRouter)
  const executeOcrOnImage = async (base64Data, mimeType, progressPrefix = '') => {
    // 1. OPENROUTER PROVIDER
    if (aiProvider === 'openrouter') {
      const orKey = openRouterKey.trim();
      if (!orKey) {
        throw new Error('Chưa cấu hình API Key OpenRouter! Vui lòng vào Cài đặt ⚙️ -> Tab API -> Chọn OpenRouter và dán Key (sk-or-v1-...).');
      }
      setScanProgress({
        active: true,
        percent: 45,
        text: `${progressPrefix} Đang gọi OpenRouter (${openRouterModel})...`,
      });
      const res = await scanClientOpenRouterWithBase64(base64Data, mimeType, orKey, openRouterModel);
      return { data: res, engine: 'openrouter' };
    }


    // 3. KIRA AI PROVIDER
    if (aiProvider === 'kira') {
      const kKey = kiraKey.trim();
      if (!kKey) {
        throw new Error('Chưa cấu hình API Key Kira AI! Vui lòng vào Cài đặt ⚙️ -> Tab API -> Chọn Kira AI và dán Key (bắt đầu bằng kira_...).');
      }
      const modelToUse = kiraModel.trim() || 'qwen3.8-max';
      setScanProgress({
        active: true,
        percent: 45,
        text: `${progressPrefix} Đang gọi Kira AI (${modelToUse})...`,
      });
      const res = await scanClientKiraWithBase64(base64Data, mimeType, kKey, modelToUse);
      return { data: res, engine: 'kira' };
    }

    // 4. B.AI PROVIDER
    if (aiProvider === 'bai') {
      const bKey = baiKey.trim();
      if (!bKey) {
        throw new Error('Chưa cấu hình API Key B.AI! Vui lòng vào Cài đặt ⚙️ -> Tab API -> Chọn B.AI và dán Key.');
      }
      const modelToUse = (baiModel.trim() || 'deepseek-v4.1-flash').toLowerCase();
      setScanProgress({
        active: true,
        percent: 45,
        text: `${progressPrefix} Đang gọi B.AI (${modelToUse})...`,
      });
      const res = await scanClientBaiWithBase64(base64Data, mimeType, bKey, modelToUse);
      return { data: res, engine: 'bai' };
    }

    // 4. GOOGLE GEMINI PROVIDER (with Failover)
    const allKeys = getGeminiApiKeys();
    const apiKeys = allKeys.filter((k) => !rateLimitedKeys.has(k));
    const keysToTry = apiKeys.length > 0 ? apiKeys : allKeys;

    if (keysToTry.length > 0) {
      for (let i = 0; i < keysToTry.length; i++) {
        const key = keysToTry[i];
        try {
          const res = await scanClientGeminiWithBase64(base64Data, mimeType, key);
          setRateLimitedKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          return { data: res, engine: 'gemini' };
        } catch (error) {
          const status = error?.status;
          const msg = String(error?.message || '');
          const is429 = status === 429;
          const isAuthError = status === 400 || status === 401 || status === 403 || msg.includes('authentication') || msg.includes('API key not valid');

          if (is429 || isAuthError) {
            setRateLimitedKeys((prev) => new Set(prev).add(key));
            if (i < keysToTry.length - 1) {
              const reasonText = is429 ? 'bị giới hạn (429)' : 'không hợp lệ';
              setScanProgress({
                active: true,
                percent: 50,
                text: `${progressPrefix} ↪ Key ${reasonText}, đang chuyển sang API dự phòng #${i + 1}...`,
              });
              continue;
            }
            if (isAuthError) {
              throw new Error('API Key Google không hợp lệ hoặc chưa bật Generative Language API. Key Google phải bắt đầu bằng "AIzaSy...". Hãy kiểm tra lại trong Cài đặt ⚙️.');
            }
            throw new Error('Tất cả API key Gemini đang bị giới hạn (429). Vui lòng thử lại sau ít phút.');
          }
          throw error;
        }
      }
    }

    // Fallback Offline Tesseract
    setShowTesseractWarning(true);
    const res = await scanWithTesseract(base64Data, mimeType, (p) => {
      const pct = Math.round(p * 100);
      setScanProgress({
        active: true,
        percent: pct,
        text: `${progressPrefix} Đang nhận diện offline... ${pct}%`,
      });
    });
    return { data: res, engine: 'tesseract' };
  };

  // Main Single Image Scan Dispatcher
  const startScan = async () => {
    if (isScanning || !currentImageBase64) return;
    setIsScanning(true);
    setScanProgress({ active: true, percent: 10, text: 'Đang chuẩn bị mô hình AI...' });
    setShowTesseractWarning(false);

    try {
      const { data: resultData, engine } = await executeOcrOnImage(currentImageBase64, currentImageMimeType);
      setEngineBadge(engine);
      setScanProgress({ active: true, percent: 100, text: '✅ Trích xuất thành công!' });

      const normalizedItems = parseOcrResultToItems(resultData, null, resultData.soPhieu || '');

      const singlePageResult = [
        {
          pageNum: 1,
          soPhieu: resultData.soPhieu || '',
          items: normalizedItems,
          previewUrl: previewSrc,
          status: 'done',
          itemCount: normalizedItems.length,
        },
      ];

      const nextId = 'h_' + Date.now();
      setCurrentHistoryId(nextId);
      setSoPhieu(resultData.soPhieu || '');
      setTableItems(normalizedItems);
      setPageResults(singlePageResult);
      setActiveResultTab('separate');
      setResultVisible(true);

      saveHistoryRecord(nextId, resultData.soPhieu || '', normalizedItems, singlePageResult, true);

      // Auto-sync to Google Sheet if enabled
      if (autoSyncSheet && googleSheetUrl) {
        syncToGoogleSheet(normalizedItems, resultData.soPhieu || '', 1, true);
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (e) {
      console.error(e);
      showToast('❌ Lỗi: ' + e.message, 'error');
      setScanProgress({ active: true, percent: 0, text: 'Lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress((prev) => ({ ...prev, active: false })), 1800);
    }
  };

  // Batch Multi-Page PDF Scan
  const startBatchPdfScan = async (customPagesList = null) => {
    const targetPages = customPagesList || pdfPages.filter((p) => p.selected);
    if (!targetPages.length || isScanning) {
      showToast('Vui lòng chọn ít nhất 1 trang để quét', 'error');
      return;
    }
    batchTargetPagesRef.current = targetPages;
    setPdfModalOpen(false);
    setIsScanning(true);
    setShowTesseractWarning(false);

    const total = targetPages.length;
    const initialStatuses = targetPages.map((p) => ({
      pageNum: p.pageNum,
      status: 'pending',
      detail: 'Chờ xử lý...',
      lines: 0,
      soPhieu: '',
    }));

    setBatchProgressModal({
      active: true,
      total,
      current: 0,
      percent: 0,
      pageStatuses: initialStatuses,
      isCompleted: false,
      hasError: false,
      retryingPageNum: null,
    });

    let accumulatedItems = [];
    let detectedFirstSoPhieu = '';
    let perPageResults = [];
    let usedEngine = 'gemini';

    try {
      for (let i = 0; i < total; i++) {
        const page = targetPages[i];
        const pageNum = page.pageNum;

        setBatchProgressModal((prev) => {
          const nextStatuses = [...prev.pageStatuses];
          nextStatuses[i] = { ...nextStatuses[i], status: 'running', detail: 'Đang gửi AI nhận diện...' };
          return {
            ...prev,
            current: i + 1,
            percent: Math.round((i / total) * 100),
            pageStatuses: nextStatuses,
          };
        });

        setScanProgress({
          active: true,
          percent: Math.round((i / total) * 100),
          text: `📄 Đang quét trang ${pageNum} (${i + 1}/${total})...`,
        });

        try {
          const { data: pageResult, engine } = await executeOcrOnImage(page.base64, 'image/jpeg', `[Trang ${pageNum}]`);
          usedEngine = engine;

          let effectiveSoPhieu = pageResult.soPhieu || '';
          const normalized = parseOcrResultToItems(pageResult, pageNum, effectiveSoPhieu);

          if (!effectiveSoPhieu && normalized.length > 0 && normalized[0].soPhieu) {
            effectiveSoPhieu = normalized[0].soPhieu;
          }

          if (effectiveSoPhieu && !detectedFirstSoPhieu) {
            detectedFirstSoPhieu = effectiveSoPhieu;
          }

          accumulatedItems = [...accumulatedItems, ...normalized];

          const singleResult = {
            pageNum,
            soPhieu: effectiveSoPhieu,
            items: normalized,
            previewUrl: page.fullUrl,
            status: 'done',
            itemCount: normalized.length,
          };
          perPageResults.push(singleResult);

          setBatchProgressModal((prev) => {
            const nextStatuses = [...prev.pageStatuses];
            nextStatuses[i] = {
              ...nextStatuses[i],
              status: 'done',
              detail: `Hoàn tất • ${normalized.length} dòng hàng`,
              lines: normalized.length,
              soPhieu: effectiveSoPhieu,
            };
            return {
              ...prev,
              percent: Math.round(((i + 1) / total) * 100),
              pageStatuses: nextStatuses,
            };
          });
        } catch (pageErr) {
          console.error(`Error on page ${pageNum}:`, pageErr);
          // Ghi nhận trang lỗi vào perPageResults để giao diện phân trang hiển thị và có nút Quét Lại
          perPageResults.push({
            pageNum,
            soPhieu: '',
            items: [],
            previewUrl: page.fullUrl,
            status: 'error',
            error: pageErr.message,
            itemCount: 0,
          });

          setBatchProgressModal((prev) => {
            const nextStatuses = [...prev.pageStatuses];
            nextStatuses[i] = {
              ...nextStatuses[i],
              status: 'error',
              detail: `Lỗi: ${pageErr.message}`,
              lines: 0,
              soPhieu: '',
            };
            return {
              ...prev,
              percent: Math.round(((i + 1) / total) * 100),
              pageStatuses: nextStatuses,
            };
          });
        }
      }

      setEngineBadge(usedEngine);
      setScanProgress({ active: true, percent: 100, text: `✅ Đã quét xong ${total} trang!` });

      if (targetPages[0]) {
        loadImageFromDataUrl(targetPages[0].fullUrl);
      }

      const nextId = 'h_' + Date.now();
      setCurrentHistoryId(nextId);
      setSoPhieu(detectedFirstSoPhieu || '');
      setTableItems(accumulatedItems);
      setPageResults(perPageResults);
      setActiveResultTab('separate');
      setResultVisible(true);

      saveHistoryRecord(nextId, detectedFirstSoPhieu || '', accumulatedItems, perPageResults, true);

      const failedCount = perPageResults.filter((pr) => pr.status === 'error').length;
      if (failedCount > 0) {
        showToast(`⚠️ Hoàn tất ${total - failedCount}/${total} trang (${failedCount} trang bị lỗi). Giao diện quét được giữ nguyên để Senpai bấm Quét Lại nha!`, 'warning');
      } else {
        showToast(`✨ Đã trích xuất thành công ${accumulatedItems.length} dòng từ ${total} trang`, 'success');
      }

      if (autoSyncSheet && googleSheetUrl && accumulatedItems.length > 0) {
        setTimeout(() => {
          syncToGoogleSheet(accumulatedItems, detectedFirstSoPhieu || '', 1, false);
        }, 500);
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 250);
    } catch (e) {
      console.error(e);
      showToast('❌ Lỗi quét PDF: ' + e.message, 'error');
    } finally {
      setIsScanning(false);
      setScanProgress((prev) => ({ ...prev, active: false }));

      // NẾU CÓ BẤT KỲ TRANG NÀO BỊ LỖI -> GIỮ NGUYÊN GIAO DIỆN QUÉT để người dùng xem và bấm Quét lại!
      // Chỉ tự động đóng modal nếu 100% các trang đều thành công.
      setBatchProgressModal((prev) => {
        const hasError = prev.pageStatuses.some((ps) => ps.status === 'error');
        if (!hasError) {
          setTimeout(() => {
            setBatchProgressModal((p) => ({ ...p, active: false, isCompleted: true }));
          }, 1200);
          return { ...prev, isCompleted: true, hasError: false };
        }
        return { ...prev, isCompleted: true, hasError: true };
      });
    }
  };

  // Quét lại 1 trang cụ thể bị lỗi trong danh sách nhiều ảnh / PDF
  const retrySingleBatchPage = async (targetPageNum) => {
    let page = batchTargetPagesRef.current.find((p) => p.pageNum === targetPageNum);
    if (!page) {
      page = pdfPages.find((p) => p.pageNum === targetPageNum);
    }
    if (!page || !page.base64) {
      showToast(`Không tìm thấy dữ liệu ảnh của Trang ${targetPageNum}`, 'error');
      return;
    }

    setBatchProgressModal((prev) => {
      const nextStatuses = prev.pageStatuses.map((ps) =>
        ps.pageNum === targetPageNum ? { ...ps, status: 'running', detail: 'Đang gửi AI quét lại trang này...' } : ps
      );
      return {
        ...prev,
        active: true,
        retryingPageNum: targetPageNum,
        pageStatuses: nextStatuses,
      };
    });

    try {
      const { data: pageResult, engine } = await executeOcrOnImage(page.base64, 'image/jpeg', `[Quét lại Trang ${targetPageNum}]`);
      let effectiveSoPhieu = pageResult.soPhieu || '';
      const normalized = parseOcrResultToItems(pageResult, targetPageNum, effectiveSoPhieu);
      if (!effectiveSoPhieu && normalized.length > 0 && normalized[0].soPhieu) {
        effectiveSoPhieu = normalized[0].soPhieu;
      }

      const updatedPRItem = {
        pageNum: targetPageNum,
        soPhieu: effectiveSoPhieu,
        items: normalized,
        previewUrl: page.fullUrl,
        status: 'done',
        itemCount: normalized.length,
      };

      let newPageResults = [];
      setPageResults((prev) => {
        const filtered = prev.filter((pr) => pr.pageNum !== targetPageNum);
        newPageResults = [...filtered, updatedPRItem].sort((a, b) => a.pageNum - b.pageNum);
        return newPageResults;
      });

      let newTableItems = [];
      setTableItems((prev) => {
        const withoutThisPage = prev.filter((it) => it._pageNum !== targetPageNum);
        newTableItems = [...withoutThisPage, ...normalized].sort((a, b) => (a._pageNum || 1) - (b._pageNum || 1));
        return newTableItems;
      });

      setBatchProgressModal((prev) => {
        const nextStatuses = prev.pageStatuses.map((ps) =>
          ps.pageNum === targetPageNum
            ? {
                ...ps,
                status: 'done',
                detail: `Hoàn tất • ${normalized.length} dòng hàng`,
                lines: normalized.length,
                soPhieu: effectiveSoPhieu,
              }
            : ps
        );
        const stillHasError = nextStatuses.some((ps) => ps.status === 'error');
        return {
          ...prev,
          pageStatuses: nextStatuses,
          hasError: stillHasError,
          retryingPageNum: null,
        };
      });

      saveHistoryRecord(currentHistoryId || ('h_' + Date.now()), soPhieu || effectiveSoPhieu, newTableItems, newPageResults, false);

      if (autoSyncSheet && googleSheetUrl && normalized.length > 0) {
        syncToGoogleSheet(normalized, effectiveSoPhieu || soPhieu, targetPageNum, true);
      }

      showToast(`✨ Đã quét lại thành công Trang ${targetPageNum} (+${normalized.length} dòng)!`, 'success');
    } catch (err) {
      console.error(`Lỗi quét lại trang ${targetPageNum}:`, err);
      setBatchProgressModal((prev) => {
        const nextStatuses = prev.pageStatuses.map((ps) =>
          ps.pageNum === targetPageNum ? { ...ps, status: 'error', detail: `Lỗi: ${err.message}` } : ps
        );
        return {
          ...prev,
          pageStatuses: nextStatuses,
          hasError: true,
          retryingPageNum: null,
        };
      });
      showToast(`❌ Quét lại Trang ${targetPageNum} thất bại: ${err.message}`, 'error');
    }
  };

  // Quét lại toàn bộ các trang đang bị lỗi
  const retryAllFailedBatchPages = async () => {
    const failedStatuses = batchProgressModal.pageStatuses.filter((ps) => ps.status === 'error');
    if (!failedStatuses.length) return;
    for (const fs of failedStatuses) {
      await retrySingleBatchPage(fs.pageNum);
    }
  };

  // History Operations in LocalStorage (Optimized lightweight storage to prevent QuotaExceededError on mobile)
  const saveHistoryRecord = (id, spVal, itemsVal, pageResultsVal = [], isNew = false) => {
    const currentPR = pageResultsVal.length ? pageResultsVal : pageResults;

    // Remove heavy base64 / blob previewUrls from pageResults when persisting to localStorage
    const lightweightPageResults = (currentPR || []).map((pr) => {
      // Keep only metadata, do NOT store full base64 images in localStorage
      return {
        pageNum: pr.pageNum,
        soPhieu: pr.soPhieu || '',
        status: pr.status || 'done',
        itemCount: pr.itemCount || (pr.items ? pr.items.length : 0),
        items: pr.items || [],
      };
    });

    const record = {
      id,
      createdAt: isNew ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
      soPhieu: spVal,
      items: itemsVal,
      pageResults: lightweightPageResults,
      columns: selectedColumns,
    };

    setScanHistory((prev) => {
      const existingIdx = prev.findIndex((h) => h.id === id);
      let next;
      if (existingIdx >= 0) {
        record.createdAt = prev[existingIdx].createdAt;
        next = [...prev];
        next[existingIdx] = record;
      } else {
        record.createdAt = new Date().toISOString();
        next = [record, ...prev];
      }

      // Keep at most MAX_HISTORY_ITEMS
      let capped = next.slice(0, MAX_HISTORY_ITEMS);

      // Safe saving with progressive fallback if quota is exceeded
      try {
        localStorage.setItem('scan_history', JSON.stringify(capped));
      } catch (err) {
        console.warn('Storage quota warning, trimming history to fit:', err);
        try {
          // If 50 is too large for mobile storage, reduce to 20
          capped = next.slice(0, 20);
          localStorage.setItem('scan_history', JSON.stringify(capped));
        } catch (e2) {
          try {
            // Further reduce to 10 if storage is very tight
            capped = next.slice(0, 10);
            localStorage.setItem('scan_history', JSON.stringify(capped));
          } catch (e3) {
            console.error('Unable to save history to localStorage:', e3);
          }
        }
      }

      return capped;
    });

    if (!isNew) showToast('💾 Đã lưu thay đổi vào lịch sử', 'success');
  };

  const loadHistoryItem = (item) => {
    setCurrentHistoryId(item.id);
    setSoPhieu(item.soPhieu || '');
    setTableItems(item.items || []);
    setPageResults(item.pageResults || []);
    setActiveResultTab('separate');
    setResultVisible(true);
    setHistoryOpen(false);
    setEngineBadge('gemini');
    showToast('🕘 Đã mở phiếu từ lịch sử', 'success');
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const deleteHistoryItem = (id, e) => {
    e?.stopPropagation();
    setScanHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      localStorage.setItem('scan_history', JSON.stringify(next));
      return next;
    });
    if (currentHistoryId === id) setCurrentHistoryId(null);
    showToast('Đã xóa phiếu khỏi lịch sử', 'success');
  };

  const clearAllHistory = () => {
    if (!scanHistory.length) return;
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử phiếu đã quét trên thiết bị này?')) {
      localStorage.removeItem('scan_history');
      setScanHistory([]);
      showToast('Đã xóa toàn bộ lịch sử trên thiết bị này', 'success');
    }
  };

  // Clipboard operations
  const copyToClipboard = async (text, keyId = null) => {
    if (!text) {
      showToast('Chưa có dữ liệu để sao chép', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (keyId) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 1500);
    }
    showToast('📋 Đã sao chép vào clipboard!', 'success');
  };

  const copyColumn = (key, itemsToCopy = tableItems, prefix = '') => {
    const values = itemsToCopy.map((item) => (item[key] || '').trim()).filter(Boolean);
    if (!values.length) {
      showToast(`Chưa có dữ liệu ở cột ${COLUMN_DEFS[key]?.short || key}`, 'error');
      return;
    }
    copyToClipboard(values.join('\n'), `${prefix}col_${key}`);
  };

  // Cell & Field editors
  const updatePageItemCell = (pageNum, itemIdx, colKey, val) => {
    setPageResults((prev) =>
      prev.map((p) => {
        if (p.pageNum === pageNum) {
          const nextItems = [...p.items];
          nextItems[itemIdx] = { ...nextItems[itemIdx], [colKey]: val };
          return { ...p, items: nextItems };
        }
        return p;
      })
    );
    setTableItems((prev) => {
      const filtered = prev.filter((item) => item._pageNum === pageNum);
      const targetItem = filtered[itemIdx];
      if (targetItem) {
        targetItem[colKey] = val;
      }
      return [...prev];
    });
  };

  const updatePageSoPhieu = (pageNum, val) => {
    setPageResults((prev) =>
      prev.map((p) => (p.pageNum === pageNum ? { ...p, soPhieu: val } : p))
    );
    setTableItems((prev) =>
      prev.map((item) => (item._pageNum === pageNum ? { ...item, soPhieu: val } : item))
    );
    if (pageNum === 1) setSoPhieu(val);
  };

  const resetAll = () => {
    setCurrentImageBase64(null);
    setPreviewSrc('');
    setResultVisible(false);
    setSoPhieu('');
    setTableItems([]);
    setPageResults([]);
    setActiveResultTab('separate');
    setCurrentHistoryId(null);
    setImageSharpened(false);
    setUnsharpenedSrc(null);
    setCropSourceSrc(null);
    setPdfPages([]);
    setLastSheetSync(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Đã đặt lại trạng thái', 'success');
  };

  const handleBackupApiFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.txt$/i.test(file.name) && file.type !== 'text/plain') {
      showToast('Chỉ hỗ trợ file định dạng .txt', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && l !== apiKey.trim());
      const unique = [...new Set(lines)];
      setBackupKeys(unique);
      localStorage.setItem('gemini_backup_api_keys', JSON.stringify(unique));
      showToast(`✅ Đã nạp thành công ${unique.length} API dự phòng`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const checkApiReadiness = async (key) => {
    showToast('Đang kiểm tra kết nối API...');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      const isReady = res.ok;
      const is429 = res.status === 429;
      if (is429) {
        setRateLimitedKeys((prev) => new Set(prev).add(key));
        showToast(`⚠️ ${maskApiKey(key)}: API đang bị giới hạn tạm thời (429)`, 'error');
      } else if (isReady) {
        setRateLimitedKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        showToast(`✅ ${maskApiKey(key)}: Kết nối Gemini 3.6 Flash tốt!`, 'success');
      } else {
        showToast(`⚠️ ${maskApiKey(key)}: Không khả dụng (Lỗi ${res.status})`, 'error');
      }
    } catch {
      showToast('Không thể kết nối máy chủ để kiểm tra', 'error');
    }
  };

  const checkAllApis = async () => {
    const keys = getGeminiApiKeys();
    if (!keys.length) {
      showToast('Chưa có API key nào để kiểm tra', 'error');
      return;
    }
    for (const key of keys) {
      await checkApiReadiness(key);
    }
  };

  const testGoogleSheetConnection = async () => {
    const url = googleSheetUrl.trim();
    if (!url) {
      showToast('Vui lòng dán Webhook URL trước khi kiểm tra', 'error');
      return;
    }

    if (url.includes('docs.google.com/spreadsheets')) {
      showToast('⚠️ Link bạn dán là link trang tính Google Sheet. Vui lòng dán link Webhook Google Apps Script (/exec)', 'error');
      return;
    }

    showToast('Đang kiểm tra kết nối Google Sheet...');
    try {
      const testPayload = {
        soPhieu: 'TEST-CONNECTION',
        pageNum: 1,
        items: [{ ten: 'Kiểm tra kết nối hệ thống', soLuongThucNhap: '1', ghiChu: 'Test OK' }],
      };

      const res = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, payload: testPayload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Lỗi kết nối Webhook (HTTP ${res.status})`);
      }

      showToast('✅ Đã ghi thử 1 dòng mẫu sang Google Sheet thành công!', 'success');
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  };

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('ai_provider', aiProvider);
    localStorage.setItem('openrouter_api_key', openRouterKey.trim());
    localStorage.setItem('openrouter_model', openRouterModel.trim());
    localStorage.removeItem('apinex_api_key');
    localStorage.removeItem('apinex_model');
    localStorage.setItem('kira_api_key', kiraKey.trim());
    localStorage.setItem('kira_model', kiraModel.trim());
    localStorage.setItem('bai_api_key', baiKey.trim());
    localStorage.setItem('bai_model', baiModel.trim());
    localStorage.setItem('google_sheet_webhook_url', googleSheetUrl.trim());
    localStorage.setItem('google_sheet_auto_sync', String(autoSyncSheet));
    localStorage.setItem('auto_cloud_sync_on_launch', String(autoCloudSyncOnLaunch));
    localStorage.setItem('scan_columns', JSON.stringify(selectedColumns));
    localStorage.setItem('scan_field_prompts', JSON.stringify(fieldPrompts));
    localStorage.setItem('view_mode', viewMode);
    applyViewMode(viewMode);

    // If sync code is active, auto push API + Sheet settings to cloud
    if (cloudSyncCode) {
      pushToCloud(cloudSyncCode, true);
    }

    setSettingsOpen(false);
    showToast('✅ Đã lưu cấu hình thành công', 'success');
  };

  const clearAllApis = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gemini_backup_api_keys');
    setApiKey('');
    setBackupKeys([]);
    setRateLimitedKeys(new Set());
    showToast('Đã xóa toàn bộ API key', 'success');
  };

  const availableApiCount = getGeminiApiKeys().filter((k) => !rateLimitedKeys.has(k)).length;
  const totalApiCount = getGeminiApiKeys().length;
  const isMultiPage = pageResults.length > 1;
  const selectedPdfPagesCount = pdfPages.filter((p) => p.selected).length;

  const singleTabResult = typeof activeResultTab === 'number'
    ? pageResults.find((p) => p.pageNum === activeResultTab)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative">
      {/* Ambient Wallpaper / Watermark Background for Web & Mobile */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        {/* Aoko Anime Watermark */}
        <div
          className="absolute -bottom-10 right-0 sm:right-6 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] opacity-[0.06] bg-contain bg-no-repeat bg-bottom-right pointer-events-none transition-opacity"
          style={{ backgroundImage: "url('/bg-aoko.png')" }}
        />
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[500] bg-blue-600/20 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-blue-500 m-4 rounded-3xl animate-fade-in pointer-events-none">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-elevated text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center animate-bounce">
              <IconUpload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Thả file PDF hoặc Ảnh vào đây</h3>
            <p className="text-sm text-slate-500">Tự động nạp tài liệu PDF nhiều trang hoặc Ảnh phiếu</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass-header text-white border-b border-slate-800 shadow-card">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-blue-400/40 shrink-0 bg-blue-600">
              <img src="/favicon.png" alt="Aoko" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">Scan Pro Max</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  v38.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Trích xuất số phiếu & danh mục hàng hóa bằng AI</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Cloud Sync Button */}
            <button
              onClick={() => {
                setSettingsTab('sync');
                setSettingsOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                cloudSyncCode
                  ? 'bg-blue-950/80 hover:bg-blue-900/90 text-blue-300 border-blue-600/60'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
              }`}
              title={cloudSyncCode ? `Đang đồng bộ cấu hình Cloud: ${cloudSyncCode}` : 'Đồng bộ cấu hình API & Google Sheet đa thiết bị'}
            >
              <IconCloud className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">{cloudSyncCode ? `Mã: ${cloudSyncCode}` : 'Đồng Bộ Cloud'}</span>
            </button>

            {/* Download Android APK Button */}
            <button
              onClick={() => {
                setSettingsTab('android');
                setSettingsOpen(true);
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 text-xs font-bold transition-all"
              title="Tải ứng dụng Android (.APK) cho nhân viên kho"
            >
              <IconDevicePhone className="w-4 h-4 text-emerald-400" />
              <span>App Android</span>
            </button>

            {/* Google Sheet indicator */}
            {googleSheetUrl && (
              <button
                onClick={() => {
                  setSettingsTab('sheet');
                  setSettingsOpen(true);
                }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 text-xs font-bold transition-all"
                title="Đã kết nối Google Sheet"
              >
                <IconSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Sheet</span>
              </button>
            )}

            {/* QR Quick Share on Mobile */}
            {cloudSyncCode && (
              <button
                onClick={() => setQrModalOpen(true)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60"
                title="Hiện mã QR để quét trên điện thoại"
              >
                <IconQrCode className="w-5 h-5 text-blue-400" />
              </button>
            )}

            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 hover:text-white border border-slate-700/60 relative"
              title="Lịch sử phiếu đã quét trên thiết bị này"
            >
              <IconHistory className="w-5 h-5" />
              {scanHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
                  {scanHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 hover:text-white border border-slate-700/60"
              title="Cài đặt & Cấu hình API, Cloud Sync, Google Sheet"
            >
              <IconSettings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sub-header Status Indicator Bar & Quick Provider Switcher */}
      <div className="bg-slate-100 border-b border-slate-200/80 py-2">
        <div className="max-w-[1200px] mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Quick Provider Toggle */}
            <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAiProvider('gemini');
                  localStorage.setItem('ai_provider', 'gemini');
                  showToast('Đang dùng chế độ Google Gemini');
                }}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  aiProvider === 'gemini'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiProvider('openrouter');
                  localStorage.setItem('ai_provider', 'openrouter');
                  showToast('Đang dùng chế độ OpenRouter');
                }}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  aiProvider === 'openrouter'
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                OpenRouter
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiProvider('kira');
                  localStorage.setItem('ai_provider', 'kira');
                  showToast('Đang dùng chế độ Kira AI (VN)');
                }}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  aiProvider === 'kira'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kira AI
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiProvider('bai');
                  localStorage.setItem('ai_provider', 'bai');
                  showToast('Đang dùng chế độ B.AI (90% Off)');
                }}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  aiProvider === 'bai'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                B.AI
              </button>
            </div>

            {/* Provider Status Details */}
            {aiProvider === 'bai' ? (
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    baiKey.trim() ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold text-slate-700">
                  {baiKey.trim() ? (
                    <>
                      <span className="text-rose-700 font-bold">B.AI</span>: {BAI_MODELS.find((m) => m.id === baiModel)?.shortName || baiModel}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsTab('api');
                        setSettingsOpen(true);
                      }}
                      className="text-rose-700 font-bold hover:underline"
                    >
                      ⚠️ Chưa dán B.AI Key (Bấm vào đây để dán)
                    </button>
                  )}
                </span>
              </div>
            ) : aiProvider === 'kira' ? (
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    kiraKey.trim() ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="font-semibold text-slate-700">
                  {kiraKey.trim() ? (
                    <>
                      <span className="text-amber-700 font-bold">Kira AI</span>: {KIRA_MODELS.find((m) => m.id === kiraModel)?.shortName || kiraModel}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsTab('api');
                        setSettingsOpen(true);
                      }}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      ⚠️ Chưa dán Kira AI Key (Bấm vào đây để dán)
                    </button>
                  )}
                </span>
              </div>
            ) : aiProvider === 'openrouter' ? (
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    openRouterKey.trim() ? 'bg-purple-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold text-slate-700">
                  {openRouterKey.trim() ? (
                    <>
                      <span className="text-purple-700 font-bold">OpenRouter</span>: {
                        OPENROUTER_MODELS.find((m) => m.id === openRouterModel)?.shortName || openRouterModel
                      }
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSettingsTab('api');
                        setSettingsOpen(true);
                      }}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      ⚠️ Chưa dán OpenRouter Key (Bấm vào đây để dán)
                    </button>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    availableApiCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold text-slate-700">
                  {totalApiCount > 0
                    ? availableApiCount > 0
                      ? `${availableApiCount}/${totalApiCount} API Gemini 3.6 Flash sẵn sàng`
                      : 'API Gemini đang bị giới hạn tạm thời (429)'
                    : 'Chế độ OCR Offline (Tesseract)'}
                </span>
              </div>
            )}

            {cloudSyncCode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                <IconCloud className="w-3 h-3 text-blue-600" />
                <span>Cloud: {cloudSyncCode}</span>
              </span>
            )}

            {googleSheetUrl && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                <IconSpreadsheet className="w-3 h-3 text-emerald-600" />
                <span>Sheet đã kết nối</span>
              </span>
            )}
          </div>

          <div className="text-slate-500 hidden md:flex items-center gap-3">
            <span>
              Mẹo: <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700">Kéo thả PDF / Ảnh</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700">Ctrl+V</kbd>
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-1 desktop-grid max-w-[1200px] mx-auto w-full p-3 sm:p-4 md:p-6">
        {/* Left Column (Upload Card & History Desktop Widget) */}
        <div className="desktop-left space-y-4 sm:space-y-5">
          {/* Upload Card with 4 Distinct Buttons */}
          <section className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-subtle hover:shadow-card transition-shadow">
            <div className="flex items-center justify-between mb-3.5 sm:mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <IconCamera className="w-4 h-4 text-blue-600" />
                Chọn Nguồn Tài Liệu
              </h2>
              <span className="text-[11px] font-medium text-slate-400">PDF, JPG, PNG, WEBP</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* 1. Camera Scan */}
              <button
                onClick={openCameraScanner}
                className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs shadow-sm active:scale-[0.98] transition-all"
              >
                <IconCamera className="w-4 h-4" />
                <span>Quét Camera</span>
              </button>

              {/* 2. Pick Image */}
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/80 active:scale-[0.98] transition-all"
                title="Chọn 1 hoặc nhiều ảnh phiếu cùng lúc (JPG, PNG, WEBP)"
              >
                <IconUpload className="w-4 h-4 text-blue-600" />
                <span>Chọn Ảnh / Nhiều Ảnh</span>
              </button>

              {/* 3. Pick PDF */}
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={isProcessingPdf}
                className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 font-bold text-xs border border-indigo-200/80 active:scale-[0.98] transition-all disabled:opacity-50"
                title="Chọn file tài liệu PDF 1 hoặc nhiều trang"
              >
                {isProcessingPdf ? (
                  <div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconLayers className="w-4 h-4 text-indigo-600" />
                )}
                <span>Chọn File PDF</span>
              </button>

              {/* 4. Paste Clipboard */}
              <button
                onClick={pasteFromClipboard}
                className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/80 active:scale-[0.98] transition-all"
              >
                <IconClipboard className="w-4 h-4 text-slate-600" />
                <span>Dán Clipboard</span>
              </button>
            </div>

            {/* Feature Badges */}
            <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1.5 text-xs text-blue-900 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold">
                <IconCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Chọn nhiều ảnh hoặc kéo thả trực tiếp nhiều file vào màn hình</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <IconCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Tự động đồng bộ cấu hình API & Google Sheet</span>
              </div>
            </div>

            {/* Hidden Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                if (e.target.files?.[0]) processFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleMultipleFiles(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <input
              ref={pdfInputRef}
              type="file"
              className="hidden"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleMultipleFiles(e.target.files);
                }
                e.target.value = '';
              }}
            />
          </section>

          {/* History Widget (Desktop Sidebar) */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hidden lg:block">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <IconHistory className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Lịch sử phiếu đã lưu</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 font-mono">
                  {scanHistory.length}/{MAX_HISTORY_ITEMS}
                </span>
              </div>
              {scanHistory.length > 0 && (
                <button onClick={clearAllHistory} className="text-xs text-red-600 hover:underline">
                  Xóa tất cả
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mb-3">Lưu tối đa 50 phiếu (tự động xóa phiếu cũ nhất khi có phiếu mới)</p>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {scanHistory.length > 0 ? (
                scanHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="p-3 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-sm text-slate-800 truncate flex items-center gap-1.5">
                        <span>{item.soPhieu || 'Chưa có số phiếu'}</span>
                        {item.pageResults?.length > 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                            {item.pageResults.length} trang tách biệt
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-600">{item.items?.length || 0} dòng hàng</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Xóa phiếu"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">Chưa có phiếu nào được lưu</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column (Image Preview, Studio Controls & OCR Results) */}
        <div className="desktop-right space-y-5">
          {/* Preview & Image Studio Card */}
          {previewSrc ? (
            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle animate-fade-in">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <IconFileText className="w-4 h-4 text-blue-600" />
                  Ảnh Xem Trước & Chỉnh Sửa
                </h3>
                <div className="flex items-center gap-2">
                  {pdfPages.length > 1 && (
                    <button
                      onClick={() => setPdfModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 border border-blue-200"
                      title="Mở danh sách các ảnh/trang đã nạp để chọn quét hàng loạt"
                    >
                      <IconLayers className="w-3.5 h-3.5" />
                      <span>Xem & Chọn {pdfPages.length} ảnh/trang</span>
                    </button>
                  )}
                  <span className="text-xs font-medium text-slate-500 font-mono">Đã sẵn sàng</span>
                </div>
              </div>

              {/* Image Canvas Viewport */}
              <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center min-h-[260px] max-h-[500px]">
                <img src={previewSrc} alt="Preview" className="w-full h-full object-contain max-h-[480px]" />

                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-1 scan-laser-line animate-scan-laser" />
                  </div>
                )}
              </div>

              {/* Segmented Image Studio Toolbar */}
              <div className="flex flex-wrap items-center gap-2 mt-4 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => rotatePreview(-90)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 active:scale-95 transition-all"
                >
                  <IconRotateLeft className="w-4 h-4" />
                  <span>Xoay trái</span>
                </button>
                <button
                  onClick={() => rotatePreview(90)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 active:scale-95 transition-all"
                >
                  <IconRotateRight className="w-4 h-4" />
                  <span>Xoay phải</span>
                </button>
                <button
                  onClick={openCropEditor}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 active:scale-95 transition-all"
                >
                  <IconCrop className="w-4 h-4" />
                  <span>Cắt góc</span>
                </button>
                <button
                  onClick={toggleSharpen}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border active:scale-95 transition-all ${
                    imageSharpened
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <IconSparkles className="w-4 h-4" />
                  <span>{imageSharpened ? 'Tắt làm nét' : 'Làm nét'}</span>
                </button>
                <button
                  onClick={resetImageEdits}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200 active:scale-95 transition-all ml-auto"
                >
                  <IconRefresh className="w-4 h-4" />
                  <span>Đặt lại</span>
                </button>
              </div>

              {/* Scan Progress Feedback */}
              {scanProgress.active && !batchProgressModal.active && (
                <div className="mt-4 space-y-2">
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 rounded-full"
                      style={{ width: `${scanProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-medium text-slate-600">
                    <span>{scanProgress.text}</span>
                    <span className="font-mono font-bold text-blue-600">{scanProgress.percent}%</span>
                  </div>
                </div>
              )}

              {/* Tesseract Warning */}
              {showTesseractWarning && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <IconInfo className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Đang dùng OCR Offline. Kết quả với chữ viết tay có thể giảm độ chuẩn. Hãy nhập API key Gemini trong Cài đặt ⚙️ để nhận dạng tốt nhất.
                  </span>
                </div>
              )}

              {/* Big Scan Button */}
              <button
                onClick={startScan}
                disabled={isScanning}
                className={`mt-4 w-full py-4 rounded-xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 transition-all ${
                  aiProvider === 'bai'
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:opacity-95 shadow-rose-600/25'
                    : aiProvider === 'kira'
                    ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:opacity-95 shadow-amber-600/25'
                    : aiProvider === 'openrouter'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:opacity-95 shadow-purple-600/25'
                    : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:opacity-95 shadow-blue-600/25'
                }`}
              >
                {isScanning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      Đang trích xuất bằng {
                        aiProvider === 'bai'
                          ? `B.AI (${BAI_MODELS.find((m) => m.id === baiModel)?.shortName || baiModel})`
                          : aiProvider === 'kira'
                          ? `Kira AI (${KIRA_MODELS.find((m) => m.id === kiraModel)?.shortName || kiraModel})`
                          : aiProvider === 'openrouter'
                          ? `OpenRouter (${OPENROUTER_MODELS.find((m) => m.id === openRouterModel)?.shortName || 'AI'})`
                          : 'Gemini 3.6 Flash'
                      }...
                    </span>
                  </>
                ) : (
                  <>
                    <IconSparkles className="w-5 h-5" />
                    <span>
                      {aiProvider === 'bai'
                        ? `Bắt Đầu Quét Bằng B.AI [${BAI_MODELS.find((m) => m.id === baiModel)?.shortName || baiModel}]`
                        : aiProvider === 'kira'
                        ? `Bắt Đầu Quét Bằng Kira AI [${KIRA_MODELS.find((m) => m.id === kiraModel)?.shortName || kiraModel}]`
                        : aiProvider === 'openrouter'
                        ? `Bắt Đầu Quét Bằng OpenRouter [${OPENROUTER_MODELS.find((m) => m.id === openRouterModel)?.shortName || openRouterModel}]`
                        : 'Bắt Đầu Quét Trích Xuất (Gemini 3.6 Flash)'}
                    </span>
                  </>
                )}
              </button>
            </section>
          ) : (
            /* Empty State Workspace */
            <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-10 sm:p-12 border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden group shadow-xs">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/15 border-2 border-blue-200 group-hover:scale-105 transition-transform duration-300 bg-blue-600 shrink-0">
                <img src="/bg-aoko.png" alt="Aoko Scan" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">Chưa có ảnh hoặc file PDF nào được chọn</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Hãy nhấn <strong>Chọn File PDF</strong>, <strong>Chọn Ảnh</strong>, <strong>Quét Camera</strong>, kéo thả file PDF vào đây hoặc nhấn <strong>Ctrl+V</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Results Section */}
          {resultVisible && (
            <section ref={resultRef} className="space-y-6 animate-slide-up">
              {/* Results Control Header */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Kết quả trích xuất</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        engineBadge === 'bai'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : engineBadge === 'kira'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : engineBadge === 'openrouter'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : engineBadge === 'groq'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : engineBadge === 'gemini'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {engineBadge === 'bai'
                        ? `✨ B.AI (${BAI_MODELS.find((m) => m.id === baiModel)?.shortName || baiModel})`
                        : engineBadge === 'kira'
                        ? `✨ Kira AI (${KIRA_MODELS.find((m) => m.id === kiraModel)?.shortName || kiraModel})`
                        : engineBadge === 'openrouter'
                        ? `✨ OpenRouter (${openRouterModel.split('/')[1]?.split(':')[0] || 'Qwen 2.5 VL'})`
                        : engineBadge === 'groq'
                        ? `✨ Groq (${groqModel})`
                        : engineBadge === 'gemini'
                        ? '✨ Gemini Vision 3.6 Flash'
                        : '📝 Tesseract OCR'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span>Tổng {tableItems.length} dòng hàng</span>
                    {isMultiPage && <span className="text-blue-600 font-bold font-mono">({pageResults.length} trang riêng biệt)</span>}
                  </div>
                </div>

                {/* Multi-Page View Switcher */}
                {isMultiPage && (
                  <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto">
                    <button
                      onClick={() => setActiveResultTab('separate')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${
                        activeResultTab === 'separate'
                          ? 'bg-blue-600 text-white shadow-blue-500/20'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <IconLayers className="w-3.5 h-3.5" />
                      <span>📑 Tách Riêng {pageResults.length} Trang (Độc lập)</span>
                    </button>

                    {pageResults.map((p) => {
                      const isActive = activeResultTab === p.pageNum;
                      const isError = p.status === 'error';
                      return (
                        <button
                          key={p.pageNum}
                          onClick={() => setActiveResultTab(p.pageNum)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            isActive
                              ? isError
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-blue-600 text-white shadow-sm'
                              : isError
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                              : 'bg-white/70 hover:bg-white text-slate-700'
                          }`}
                        >
                          <span>{isError ? '⚠️' : '📄'} Chỉ Trang {p.pageNum}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isActive
                                ? 'bg-black/20 text-white'
                                : isError
                                ? 'bg-red-200 text-red-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isError ? 'Lỗi' : `${p.items.length} dòng`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MODE 1: SEPARATE PAGES VIEW (Default for Multi-Page) */}
              {(activeResultTab === 'separate' || !isMultiPage) && (
                <div className="space-y-6">
                  {(pageResults.length ? pageResults : [{ pageNum: 1, soPhieu, items: tableItems, previewUrl: previewSrc }]).map((page) => (
                    <div
                      key={page.pageNum}
                      className={`bg-white rounded-3xl p-5 sm:p-6 border-2 shadow-card space-y-5 animate-fade-in ${
                        page.status === 'error' ? 'border-red-300 ring-2 ring-red-500/20' : 'border-slate-200/90'
                      }`}
                    >
                      {/* Page Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-sm shadow-sm ${
                              page.status === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {page.pageNum}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-base text-slate-900 uppercase tracking-tight flex items-center gap-2">
                              <span>Kết Quả Trang {page.pageNum}</span>
                              {page.status === 'error' && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                  Lỗi nhận diện
                                </span>
                              )}
                            </h4>
                            <span className="text-xs text-slate-500 font-semibold">
                              {page.status === 'error'
                                ? 'Trang này chưa trích xuất được bảng hàng hóa'
                                : `${page.items.length} dòng hàng của trang ${page.pageNum}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {page.status === 'error' ? (
                            <button
                              onClick={() => retrySingleBatchPage(page.pageNum)}
                              disabled={batchProgressModal.retryingPageNum === page.pageNum}
                              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                            >
                              <IconRefresh
                                className={`w-4 h-4 ${
                                  batchProgressModal.retryingPageNum === page.pageNum ? 'animate-spin' : ''
                                }`}
                              />
                              <span>
                                {batchProgressModal.retryingPageNum === page.pageNum
                                  ? 'Đang quét lại...'
                                  : 'Quét Lại Trang Này'}
                              </span>
                            </button>
                          ) : (
                            <button
                              onClick={() => syncToGoogleSheet(page.items, page.soPhieu, page.pageNum)}
                              disabled={isSyncingSheet}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <IconSpreadsheet className="w-4 h-4 text-emerald-600" />
                              <span>Lưu Trang {page.pageNum} Sang Sheet</span>
                            </button>
                          )}

                          {page.previewUrl && (
                            <button
                              onClick={() => loadImageFromDataUrl(page.previewUrl)}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-all active:scale-95"
                            >
                              <IconEye className="w-4 h-4" />
                              <span>Xem ảnh gốc</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Error Banner when this page failed */}
                      {page.status === 'error' && (
                        <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800 text-xs">
                          <div className="flex items-start gap-2.5">
                            <span className="text-base">⚠️</span>
                            <div>
                              <div className="font-bold text-sm text-red-900">
                                AI chưa trích xuất được bảng hàng hóa ở Trang {page.pageNum}
                              </div>
                              <div className="text-[11px] text-red-600 font-medium mt-0.5">
                                {page.error || 'Vui lòng kiểm tra lại ảnh hoặc bấm nút Quét Lại Trang Này ở trên.'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => retrySingleBatchPage(page.pageNum)}
                              disabled={batchProgressModal.retryingPageNum === page.pageNum}
                              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                            >
                              <IconRefresh
                                className={`w-3.5 h-3.5 ${
                                  batchProgressModal.retryingPageNum === page.pageNum ? 'animate-spin' : ''
                                }`}
                              />
                              <span>
                                {batchProgressModal.retryingPageNum === page.pageNum
                                  ? 'Đang quét...'
                                  : 'Thử Quét Lại'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Slip Number Ticket for this Page */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 p-4 rounded-2xl border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-2">
                            <span>Số Phiếu — Trang {page.pageNum}</span>
                          </div>
                          <input
                            type="text"
                            value={page.soPhieu || ''}
                            onChange={(e) => updatePageSoPhieu(page.pageNum, e.target.value)}
                            placeholder={`Chưa có số phiếu Trang ${page.pageNum}...`}
                            className="font-mono text-xl font-extrabold text-blue-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                          />
                        </div>
                        <button
                          onClick={() => copyToClipboard(page.soPhieu, `sp_p${page.pageNum}`)}
                          className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 shadow-sm active:scale-95 transition-all"
                        >
                          {copiedKey === `sp_p${page.pageNum}` ? (
                            <IconCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <IconCopy className="w-4 h-4" />
                          )}
                          <span>{copiedKey === `sp_p${page.pageNum}` ? 'Đã sao chép' : `Sao chép số phiếu P.${page.pageNum}`}</span>
                        </button>
                      </div>

                      {/* Items Table for this Page with STT starting from 1 */}
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                          Bảng danh mục hàng hóa (Trang {page.pageNum})
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                          <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                                <tr>
                                  <th className="p-2.5 text-center w-10 text-[10px]">STT</th>
                                  {selectedColumns.map((k) => (
                                    <th
                                      key={k}
                                      className={`p-2.5 whitespace-nowrap text-[10px] ${
                                        k === 'ten' ? 'min-w-[220px] sm:min-w-[280px]' : 'min-w-[85px]'
                                      }`}
                                    >
                                      {COLUMN_DEFS[k]?.short || k}
                                    </th>
                                  ))}
                                  <th className="p-2.5 text-center w-12 text-[10px]">Copy</th>
                                </tr>
                              </thead>
                            <tbody className="divide-y divide-slate-100">
                              {page.items.length > 0 ? (
                                page.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-50/50">
                                      {idx + 1}
                                    </td>
                                    {selectedColumns.map((k) => (
                                      <td key={k} className={`p-1.5 ${k === 'ten' ? 'min-w-[220px] sm:min-w-[280px]' : 'min-w-[85px]'}`}>
                                        {k === 'ten' ? (
                                          <textarea
                                            rows={Math.max(1, Math.ceil(((item[k] || '').length || 1) / 28))}
                                            value={item[k] || ''}
                                            onChange={(e) => updatePageItemCell(page.pageNum, idx, k, e.target.value)}
                                            placeholder={COLUMN_DEFS[k]?.short}
                                            className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white bg-transparent font-medium text-xs text-slate-900 outline-none transition-all resize-none leading-snug break-words"
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={item[k] || ''}
                                            onChange={(e) => updatePageItemCell(page.pageNum, idx, k, e.target.value)}
                                            onBlur={(e) => {
                                              if (k === 'soOSPO') {
                                                const formatted = formatOSPO(e.target.value);
                                                if (formatted !== e.target.value) {
                                                  updatePageItemCell(page.pageNum, idx, k, formatted);
                                                }
                                              }
                                            }}
                                            placeholder={COLUMN_DEFS[k]?.short}
                                            className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white bg-transparent font-mono text-xs text-slate-800 outline-none transition-all"
                                          />
                                        )}
                                      </td>
                                    ))}
                                    <td className="p-2 text-center">
                                      <button
                                        onClick={() => {
                                          const values = selectedColumns.map((k) => (item[k] || '').trim()).filter(Boolean);
                                          copyToClipboard(values.join(' | '), `p${page.pageNum}_row_${idx}`);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                        title="Sao chép dòng này"
                                      >
                                        {copiedKey === `p${page.pageNum}_row_${idx}` ? (
                                          <IconCheck className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                          <IconCopy className="w-4 h-4" />
                                        )}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={selectedColumns.length + 2} className="p-8 text-center text-slate-400">
                                    Trang này chưa có dữ liệu hàng hóa
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Column Quick Copy Chips for this Specific Page */}
                      <div className="pt-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Sao chép nhanh theo cột — Trang {page.pageNum}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedColumns.map((k) => (
                            <button
                              key={k}
                              onClick={() => copyColumn(k, page.items, `p${page.pageNum}_`)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs border transition-all active:scale-95 ${
                                copiedKey === `p${page.pageNum}_col_${k}`
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200/80 hover:border-blue-200'
                              }`}
                            >
                              {copiedKey === `p${page.pageNum}_col_${k}` ? (
                                <IconCheck className="w-3.5 h-3.5" />
                              ) : (
                                <IconCopy className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{COLUMN_DEFS[k]?.short} (Trang {page.pageNum})</span>
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                                {page.items.length}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MODE 2: SINGLE SPECIFIC PAGE VIEW */}
              {typeof activeResultTab === 'number' && singleTabResult && (
                <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-card space-y-5 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {singleTabResult.pageNum}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 uppercase tracking-tight">
                          Kết Quả Trang {singleTabResult.pageNum}
                        </h4>
                        <span className="text-xs text-slate-500 font-semibold">{singleTabResult.items.length} dòng hàng</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => syncToGoogleSheet(singleTabResult.items, singleTabResult.soPhieu, singleTabResult.pageNum)}
                        disabled={isSyncingSheet}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <IconSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Lưu Trang {singleTabResult.pageNum} Sang Sheet</span>
                      </button>

                      {singleTabResult.previewUrl && (
                        <button
                          onClick={() => loadImageFromDataUrl(singleTabResult.previewUrl)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-all active:scale-95"
                        >
                          <IconEye className="w-4 h-4" />
                          <span>Xem ảnh gốc</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slip Number */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 p-4 rounded-2xl border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                        Số Phiếu (Trang {singleTabResult.pageNum})
                      </div>
                      <input
                        type="text"
                        value={singleTabResult.soPhieu || ''}
                        onChange={(e) => updatePageSoPhieu(singleTabResult.pageNum, e.target.value)}
                        placeholder={`Chưa có số phiếu Trang ${singleTabResult.pageNum}...`}
                        className="font-mono text-xl font-extrabold text-blue-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                      />
                    </div>
                    <button
                      onClick={() => copyToClipboard(singleTabResult.soPhieu, `sp_single_${singleTabResult.pageNum}`)}
                      className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 shadow-sm active:scale-95 transition-all"
                    >
                      {copiedKey === `sp_single_${singleTabResult.pageNum}` ? (
                        <IconCheck className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <IconCopy className="w-4 h-4" />
                      )}
                      <span>{copiedKey === `sp_single_${singleTabResult.pageNum}` ? 'Đã sao chép' : `Sao chép số phiếu`}</span>
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 text-center w-10 text-[10px]">STT</th>
                          {selectedColumns.map((k) => (
                            <th
                              key={k}
                              className={`p-2.5 whitespace-nowrap text-[10px] ${
                                k === 'ten' ? 'min-w-[220px] sm:min-w-[280px]' : 'min-w-[85px]'
                              }`}
                            >
                              {COLUMN_DEFS[k]?.short || k}
                            </th>
                          ))}
                          <th className="p-2.5 text-center w-12 text-[10px]">Copy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {singleTabResult.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-50/50">
                              {idx + 1}
                            </td>
                            {selectedColumns.map((k) => (
                              <td key={k} className={`p-1.5 ${k === 'ten' ? 'min-w-[220px] sm:min-w-[280px]' : 'min-w-[85px]'}`}>
                                {k === 'ten' ? (
                                  <textarea
                                    rows={Math.max(1, Math.ceil(((item[k] || '').length || 1) / 28))}
                                    value={item[k] || ''}
                                    onChange={(e) => updatePageItemCell(singleTabResult.pageNum, idx, k, e.target.value)}
                                    placeholder={COLUMN_DEFS[k]?.short}
                                    className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white bg-transparent font-medium text-xs text-slate-900 outline-none transition-all resize-none leading-snug break-words"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={item[k] || ''}
                                    onChange={(e) => updatePageItemCell(singleTabResult.pageNum, idx, k, e.target.value)}
                                    onBlur={(e) => {
                                      if (k === 'soOSPO') {
                                        const formatted = formatOSPO(e.target.value);
                                        if (formatted !== e.target.value) {
                                          updatePageItemCell(singleTabResult.pageNum, idx, k, formatted);
                                        }
                                      }
                                    }}
                                    placeholder={COLUMN_DEFS[k]?.short}
                                    className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white bg-transparent font-mono text-xs text-slate-800 outline-none transition-all"
                                  />
                                )}
                              </td>
                            ))}
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  const values = selectedColumns.map((k) => (item[k] || '').trim()).filter(Boolean);
                                  copyToClipboard(values.join(' | '), `s_${singleTabResult.pageNum}_${idx}`);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="Sao chép dòng này"
                              >
                                {copiedKey === `s_${singleTabResult.pageNum}_${idx}` ? (
                                  <IconCheck className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <IconCopy className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Copy Chips */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedColumns.map((k) => (
                      <button
                        key={k}
                        onClick={() => copyColumn(k, singleTabResult.items, `single_${singleTabResult.pageNum}_`)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs border transition-all active:scale-95 ${
                          copiedKey === `single_${singleTabResult.pageNum}_col_${k}`
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200/80 hover:border-blue-200'
                        }`}
                      >
                        {copiedKey === `single_${singleTabResult.pageNum}_col_${k}` ? (
                          <IconCheck className="w-3.5 h-3.5" />
                        ) : (
                          <IconCopy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{COLUMN_DEFS[k]?.short} (Trang {singleTabResult.pageNum})</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                          {singleTabResult.items.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Master Actions */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => syncToGoogleSheet(tableItems, soPhieu, 1)}
                  disabled={isSyncingSheet}
                  className="flex-1 min-w-[200px] py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50"
                >
                  <IconSpreadsheet className="w-4 h-4" />
                  <span>
                    {isSyncingSheet ? 'Đang gửi sang Google Sheet...' : '📊 Lưu Toàn Bộ Sang Google Sheet'}
                  </span>
                </button>

                <button
                  onClick={() => saveHistoryRecord(currentHistoryId || 'h_' + Date.now(), soPhieu, tableItems, pageResults, false)}
                  className="flex-1 min-w-[180px] py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
                >
                  <IconSave className="w-4 h-4" />
                  <span>Lưu Vào Lịch Sử Cục Bộ</span>
                </button>

                <button
                  onClick={resetAll}
                  className="px-5 py-3.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1.5 active:scale-98 transition-all"
                >
                  <IconRefresh className="w-4 h-4" />
                  <span>Quét Lại Mới</span>
                </button>
              </div>

              {sheetSyncError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold">⚠️ Đồng bộ Sheet gián đoạn:</span>
                    <span className="text-slate-700">{sheetSyncError}</span>
                  </div>
                  <button
                    onClick={() => syncToGoogleSheet(tableItems, soPhieu, 1)}
                    disabled={isSyncingSheet}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all active:scale-95 text-[11px] whitespace-nowrap disabled:opacity-50"
                  >
                    {isSyncingSheet ? 'Đang thử lại...' : '🔄 Đồng bộ lại ngay'}
                  </button>
                </div>
              )}

              {lastSheetSync && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-emerald-600" />
                    <span>Lần đồng bộ Google Sheet gần nhất: <strong>{lastSheetSync.time}</strong> ({lastSheetSync.count} dòng)</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Page Footer */}
      <footer className="w-full max-w-[1200px] mx-auto px-4 py-8 mt-6 border-t border-slate-200 text-slate-500 text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Scan Pro Max — Trích Xuất Phiếu Kho AI</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-bold text-[10px]">
              Phiên bản v37.0.0
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Phát triển bởi:</span>
            <a
              href="https://t.me/vd81997"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-all hover:shadow-sm active:scale-95"
              title="Nhắn tin Telegram cho Đắc dzaii"
            >
              <svg className="w-3.5 h-3.5 fill-[#229ED9]" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              <span>Đắc dzaii</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Multi-Image / PDF Multi-Page Preview & Selection Modal */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-modal flex flex-col gap-4 text-slate-900 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconLayers className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Danh Sách {pdfPages.length} Ảnh / Trang Phiếu
                  </h3>
                  <p className="text-[11px] text-slate-500">Bấm vào ô để chọn/bỏ chọn quét hàng loạt hoặc bấm "Quét riêng" từng ảnh</p>
                </div>
              </div>
              <button
                onClick={() => setPdfModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Multi-Select Controls */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">
                  Đã chọn <strong className="text-blue-600 font-mono text-sm">{selectedPdfPagesCount}</strong> / {pdfPages.length} ảnh/trang
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAllPdfPages(true)}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 text-xs font-semibold"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => selectAllPdfPages(false)}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold"
                >
                  Bỏ chọn hết
                </button>
              </div>
            </div>

            {/* Thumbnail Grid with Multi-Select Full Card Click */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pdfPages.map((page, idx) => {
                  const isChecked = !!page.selected;
                  const isCurrentActive = selectedPdfIndex === idx;
                  return (
                    <div
                      key={page.pageNum}
                      onClick={() => {
                        setSelectedPdfIndex(idx);
                        togglePdfPageSelect(idx);
                      }}
                      className={`group relative p-2.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 select-none ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 opacity-60 hover:opacity-90'
                      }`}
                    >
                      {/* Checkbox badge on top-left */}
                      <div
                        className={`absolute top-3.5 left-3.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-white/90 border-slate-300 hover:border-blue-500 text-transparent'
                        }`}
                      >
                        <IconCheck className="w-4 h-4 stroke-[3]" />
                      </div>

                      {/* Image Thumbnail */}
                      <div className="relative w-full aspect-[3/4] bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex items-center justify-center">
                        <img src={page.thumbUrl} alt={`Ảnh/Trang ${page.pageNum}`} className="w-full h-full object-contain pointer-events-none" />
                        {isCurrentActive && (
                          <div className="absolute inset-0 ring-2 ring-blue-500/50 rounded-xl pointer-events-none" />
                        )}
                      </div>

                      {/* Label & Actions */}
                      <div className="w-full flex items-center justify-between px-1">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1 min-w-0">
                          <span className="truncate" title={page.name || `Ảnh ${page.pageNum}`}>
                            {page.name ? page.name : `Ảnh ${page.pageNum}`}
                          </span>
                          {isChecked && <span className="text-[10px] text-blue-600 font-bold shrink-0">(Đã chọn)</span>}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectSinglePdfPage(idx);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-bold px-1.5 py-0.5 rounded hover:bg-blue-100/50 shrink-0"
                        >
                          Quét riêng
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 truncate max-w-[240px]">
                Đang xem: <strong>{pdfPages[selectedPdfIndex]?.name || `Ảnh/Trang ${pdfPages[selectedPdfIndex]?.pageNum}`}</strong>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => selectSinglePdfPage(selectedPdfIndex)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all active:scale-95"
                >
                  Quét 1 Ảnh Đang Xem
                </button>

                <button
                  onClick={() => startBatchPdfScan()}
                  disabled={selectedPdfPagesCount === 0}
                  className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 ${
                    aiProvider === 'bai'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95'
                      : aiProvider === 'kira'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95'
                      : aiProvider === 'openrouter'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95'
                  }`}
                >
                  <IconSparkles className="w-4 h-4" />
                  <span>
                    Quét {selectedPdfPagesCount} Ảnh/Trang ({getActiveProviderLabel()})
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Multi-Page / Multi-Image Batch Progress Dialog */}
      {batchProgressModal.active && (
        <div className="fixed inset-0 z-[600] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-modal flex flex-col gap-4 text-slate-900 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    batchProgressModal.hasError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <IconLayers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    {batchProgressModal.isCompleted
                      ? batchProgressModal.hasError
                        ? `Quét Xong (${batchProgressModal.pageStatuses.filter((p) => p.status === 'error').length} Trang Lỗi)`
                        : 'Quét Hoàn Tất Toàn Bộ Trang'
                      : `Đang Quét Hàng Loạt (${batchProgressModal.current}/${batchProgressModal.total} Ảnh / Trang)`}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {batchProgressModal.hasError
                      ? 'Có trang gặp lỗi, Senpai có thể bấm "Quét lại" ngay bên dưới nha'
                      : 'Tiến trình nhận dạng AI đang diễn ra theo từng ảnh/trang'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-mono font-extrabold text-base ${
                    batchProgressModal.hasError ? 'text-amber-600' : 'text-blue-600'
                  }`}
                >
                  {batchProgressModal.percent}%
                </span>
                {batchProgressModal.isCompleted && (
                  <button
                    onClick={() => setBatchProgressModal((p) => ({ ...p, active: false }))}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all active:scale-95"
                    title="Đóng bảng tiến trình để xem kết quả"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  batchProgressModal.hasError
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
                }`}
                style={{ width: `${batchProgressModal.percent}%` }}
              />
            </div>

            {/* Per-Page Progress Items List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {batchProgressModal.pageStatuses.map((ps) => (
                <div
                  key={ps.pageNum}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    ps.status === 'running'
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                      : ps.status === 'done'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : ps.status === 'error'
                      ? 'bg-red-50/70 border-red-200'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        ps.status === 'done'
                          ? 'bg-emerald-600 text-white'
                          : ps.status === 'running'
                          ? 'bg-blue-600 text-white animate-pulse'
                          : ps.status === 'error'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {ps.pageNum}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Trang {ps.pageNum}</span>
                        {ps.soPhieu && (
                          <span className="font-mono text-[11px] text-blue-700 font-semibold truncate">
                            — Số phiếu: {ps.soPhieu}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          ps.status === 'error' ? 'text-red-600 font-medium' : 'text-slate-500'
                        }`}
                        title={ps.detail}
                      >
                        {ps.detail}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {ps.status === 'running' && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    {ps.status === 'done' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        +{ps.lines} dòng
                      </span>
                    )}
                    {ps.status === 'error' && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">Lỗi</span>
                        <button
                          onClick={() => retrySingleBatchPage(ps.pageNum)}
                          disabled={isScanning || batchProgressModal.retryingPageNum === ps.pageNum}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                          title={`Quét lại Trang ${ps.pageNum}`}
                        >
                          {batchProgressModal.retryingPageNum === ps.pageNum ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Đang quét...</span>
                            </>
                          ) : (
                            <>
                              <IconRefresh className="w-3 h-3" />
                              <span>Quét lại</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {ps.status === 'pending' && <span className="text-[10px] text-slate-400">Chờ...</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with Batch Retry & Provider Switch when there are errors */}
            {batchProgressModal.hasError && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Mô hình:</span>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    disabled={isScanning || batchProgressModal.retryingPageNum !== null}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl px-2.5 py-1.5 text-xs border border-slate-300 outline-none cursor-pointer transition-all"
                    title="Đổi nhà cung cấp AI để thử quét lại"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="bai">B.AI (90% Off)</option>
                    <option value="kira">Kira AI</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={retryAllFailedBatchPages}
                    disabled={isScanning || batchProgressModal.retryingPageNum !== null}
                    className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  >
                    <IconRefresh className="w-3.5 h-3.5" />
                    <span>
                      Quét Lại Các Trang Lỗi (
                      {batchProgressModal.pageStatuses.filter((p) => p.status === 'error').length})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setBatchProgressModal((p) => ({ ...p, active: false }));
                      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold transition-all"
                  >
                    Xem kết quả
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Live Modal with Auto-Crop Reticle */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl p-5 border border-slate-800 shadow-modal flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <IconCamera className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Trình Quét Camera Tự Động Cắt</h3>
                  <p className="text-[10px] text-blue-300">Tự động cắt chuẩn viền phiếu, không có viền thừa</p>
                </div>
              </div>
              <button
                onClick={closeCameraScanner}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-[3/4] max-h-[60vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              <div className="absolute w-[86%] h-[78%] border-2 border-blue-400/80 rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                <div className="reticle-corner reticle-top-left" />
                <div className="reticle-corner reticle-top-right" />
                <div className="reticle-corner reticle-bottom-left" />
                <div className="reticle-corner reticle-bottom-right" />
                <div className="w-full h-0.5 scan-laser-line animate-scan-laser" />
              </div>

              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-slate-900/90 text-blue-200 text-xs font-semibold backdrop-blur-sm border border-blue-500/40">
                  ✨ Ảnh chụp sẽ tự động cắt đúng khung này
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 items-center gap-3 pt-2">
              <button
                onClick={switchCamera}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <IconSwitchCamera className="w-4 h-4" />
                <span>Đổi Cam</span>
              </button>

              <button
                onClick={captureFromCamera}
                className="w-16 h-16 mx-auto rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/20 active:scale-90 transition-transform p-1"
                title="Chụp ảnh tự động cắt"
              >
                <div className="w-full h-full rounded-full border-2 border-slate-900 bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white" />
              </button>

              <button
                onClick={toggleTorch}
                disabled={!hasTorch}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${
                  torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                } disabled:opacity-40`}
              >
                <IconFlash className="w-4 h-4" />
                <span>{torchOn ? 'Tắt Đèn' : 'Đèn Flash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 border border-slate-200 shadow-modal flex flex-col gap-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconCrop className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">Cắt & Căn Chỉnh Tài Liệu</h3>
              </div>
              <button
                onClick={() => setCropOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center max-h-[40vh]">
              <canvas ref={cropCanvasRef} className="max-w-full max-h-[38vh] object-contain" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Mép Trái</span>
                  <span className="font-mono">{cropRange.left}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={cropRange.left}
                  onChange={(e) => setCropRange((p) => ({ ...p, left: +e.target.value }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Mép Trên</span>
                  <span className="font-mono">{cropRange.top}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={cropRange.top}
                  onChange={(e) => setCropRange((p) => ({ ...p, top: +e.target.value }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Mép Phải</span>
                  <span className="font-mono">{cropRange.right}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={cropRange.right}
                  onChange={(e) => setCropRange((p) => ({ ...p, right: +e.target.value }))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-500 font-semibold">
                  <span>Mép Dưới</span>
                  <span className="font-mono">{cropRange.bottom}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={cropRange.bottom}
                  onChange={(e) => setCropRange((p) => ({ ...p, bottom: +e.target.value }))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={applyCrop}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <IconCheck className="w-4 h-4" />
                <span>Áp Dụng Cắt Ảnh</span>
              </button>
              <button
                onClick={() => setCropOpen(false)}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs active:scale-95 transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal (Mobile & Tablet) */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setHistoryOpen(false)}
        >
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 border border-slate-200 shadow-modal flex flex-col gap-4 max-h-[85vh] animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconHistory className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Lịch Sử Phiếu ({scanHistory.length}/{MAX_HISTORY_ITEMS})
                  </h3>
                  <p className="text-[10px] text-slate-400">Lưu tối đa 50 phiếu gần nhất, tự động xóa cũ khi quét mới</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {scanHistory.length > 0 ? (
                scanHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-sm text-slate-900 flex items-center gap-2">
                        <span>{item.soPhieu || 'Không có số phiếu'}</span>
                        {item.pageResults?.length > 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                            {item.pageResults.length} trang tách biệt
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDate(item.updatedAt || item.createdAt)} • {item.items?.length || 0} dòng
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {(item.items || []).slice(0, 3).map((x) => x.ten || x.soOSPO || '').filter(Boolean).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadHistoryItem(item);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                      >
                        Mở
                      </button>
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Xóa"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">Chưa có lịch sử phiếu được lưu</div>
              )}
            </div>

            {scanHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button onClick={clearAllHistory} className="text-xs text-red-600 font-semibold hover:underline">
                  Xóa tất cả lịch sử trên máy này
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Quick Sync Modal */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setQrModalOpen(false)}
        >
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-slate-200 shadow-modal flex flex-col items-center gap-4 text-slate-900 animate-slide-up text-center">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconQrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Quét QR Bằng Điện Thoại</h3>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
              <QrCodeCanvas text={getShareLink()} size={200} />
            </div>

            <div className="space-y-1">
              <div className="font-mono text-sm font-extrabold text-blue-600">
                MÃ ĐỒNG BỘ: {cloudSyncCode || syncCodeInput}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mở camera trên điện thoại và quét mã QR này để tự động nạp toàn bộ cấu hình Mô Hình AI & Google Sheet!
              </p>
            </div>

            <button
              onClick={() => copyToClipboard(getShareLink(), 'share_link')}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <IconShare className="w-4 h-4" />
              <span>{copiedKey === 'share_link' ? 'Đã sao chép link!' : 'Sao chép link chia sẻ'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal with Cloud Sync, Google Sheets & API tabs */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
        >
          <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-modal flex flex-col gap-4 max-h-[90vh] animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconSettings className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">Cài Đặt & Cấu Hình Quét</h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setSettingsTab('sync')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  settingsTab === 'sync'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <IconCloud className="w-4 h-4 text-blue-600" />
                <span>Đồng Bộ Cloud ☁️</span>
              </button>
              <button
                onClick={() => setSettingsTab('api')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all ${
                  settingsTab === 'api'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Mô Hình AI
              </button>
              <button
                onClick={() => setSettingsTab('sheet')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  settingsTab === 'sheet'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <IconSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Google Sheet 📊</span>
              </button>
              <button
                onClick={() => setSettingsTab('columns')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all ${
                  settingsTab === 'columns'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Cột Trích Xuất
              </button>
              <button
                onClick={() => setSettingsTab('prompts')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all ${
                  settingsTab === 'prompts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Gợi Ý Prompt
              </button>
              <button
                onClick={() => setSettingsTab('view')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all ${
                  settingsTab === 'view'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Giao Diện
              </button>
              <button
                onClick={() => setSettingsTab('android')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all flex items-center gap-1 ${
                  settingsTab === 'android'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Cài Đặt App 📱</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* TAB 1: CLOUD SYNC (API & GOOGLE SHEETS) */}
              {settingsTab === 'sync' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2 text-blue-950 font-bold">
                      <IconCloud className="w-5 h-5 text-blue-600" />
                      <span>Đồng Bộ Cấu Hình API, Google Sheet, Cột & Prompt</span>
                    </div>
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      Chỉ cần nhập cùng một <strong>Mã Đồng Bộ</strong> hoặc <strong>Quét mã QR</strong> trên thiết bị khác, toàn bộ <strong>Mô Hình AI</strong>, <strong>Link Google Sheet</strong>, <strong>Cột trích xuất</strong> và <strong>Gợi ý Prompt</strong> sẽ được tự động đồng bộ ngay lập tức!
                    </p>
                  </div>

                  {/* Sync Code Input with Controls */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>Mã Đồng Bộ Của Bạn</span>
                      <button
                        type="button"
                        onClick={generateRandomSyncCode}
                        className="text-blue-600 hover:underline font-semibold text-xs"
                      >
                        Tạo mã tự động
                      </button>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={syncCodeInput}
                        onChange={(e) => setSyncCodeInput(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: KHO-TONG, KHO-01, SCAN888..."
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono font-bold text-sm text-blue-950 uppercase outline-none"
                      />
                    </div>
                  </div>

                  {/* Custom Storage Duration Selector (5m ~ 24h) */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <span>⏳ Thời Gian Lưu Trữ Trên Máy Chủ</span>
                      </label>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {cloudSyncDuration >= 60 ? `${Math.round(cloudSyncDuration / 60)} Giờ` : `${cloudSyncDuration} Phút`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                      {[
                        { label: '5 Phút', val: 5 },
                        { label: '15 Phút', val: 15 },
                        { label: '30 Phút', val: 30 },
                        { label: '1 Giờ', val: 60 },
                        { label: '4 Giờ', val: 240 },
                        { label: '12 Giờ', val: 720 },
                        { label: '24 Giờ', val: 1440 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => {
                            setCloudSyncDuration(item.val);
                            localStorage.setItem('cloud_sync_duration', String(item.val));
                          }}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                            cloudSyncDuration === item.val
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Tùy chỉnh phút (5 - 1440):</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="5"
                          max="1440"
                          value={cloudSyncDuration}
                          onChange={(e) => {
                            const val = Math.max(5, Math.min(1440, Number(e.target.value) || 5));
                            setCloudSyncDuration(val);
                            localStorage.setItem('cloud_sync_duration', String(val));
                          }}
                          className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold font-mono text-xs focus:border-blue-500 outline-none"
                        />
                        <span className="font-semibold text-slate-600">phút</span>
                      </div>
                    </div>
                  </div>

                  {/* Auto Cloud Sync on Launch Toggle */}
                  <label className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCloudSyncOnLaunch}
                      onChange={(e) => {
                        setAutoCloudSyncOnLaunch(e.target.checked);
                        localStorage.setItem('auto_cloud_sync_on_launch', String(e.target.checked));
                        showToast(e.target.checked ? 'Đã bật tự động đồng bộ khi mở web' : 'Đã tắt tự động đồng bộ khi mở web');
                      }}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 accent-blue-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>⚡ Tự động tải cấu hình đám mây khi mở trang web trên thiết bị này</span>
                      </div>
                      <div className="text-[11px] text-slate-600 leading-tight mt-0.5">
                        Mỗi khi mở trang web, hệ thống sẽ tự động cập nhật API Key và Google Sheet mới nhất từ Cloud mà không cần thao tác thủ công.
                      </div>
                    </div>
                  </label>

                  {/* Sync Actions Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => pushToCloud(syncCodeInput)}
                      disabled={isCloudSyncing}
                      className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    >
                      <IconCloud className="w-4 h-4" />
                      <span>{isCloudSyncing ? 'Đang đẩy...' : '☁️ Đẩy Cấu Hình Lên Cloud'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => pullFromCloud(syncCodeInput)}
                      disabled={isCloudSyncing}
                      className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <IconDevicePhone className="w-4 h-4 text-slate-600" />
                      <span>{isCloudSyncing ? 'Đang tải...' : '📥 Tải Từ Cloud Về Máy'}</span>
                    </button>
                  </div>

                  {/* Mobile QR Code & Share Box */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0">
                      <QrCodeCanvas text={getShareLink()} size={96} />
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left flex-1">
                      <div className="font-bold text-slate-800 text-xs">Quét QR mở ngay trên điện thoại:</div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Mở camera trên điện thoại quét mã này là tự động áp dụng API và Google Sheet.
                      </p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(getShareLink(), 'share_link_box')}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                      >
                        <IconCopy className="w-3.5 h-3.5" />
                        <span>{copiedKey === 'share_link_box' ? 'Đã sao chép link!' : 'Sao chép link chia sẻ'}</span>
                      </button>
                    </div>
                  </div>

                  {lastCloudSync && (
                    <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-semibold">
                        <IconCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Đã đồng bộ Cloud lúc <strong>{lastCloudSync.time}</strong> (Mã: <strong>{lastCloudSync.code}</strong>)</span>
                      </div>
                      {lastCloudSync.duration && (
                        <div className="text-[10.5px] text-emerald-700 pl-5 flex items-center gap-2">
                          <span>Thời gian lưu trữ: <strong>{lastCloudSync.duration}</strong></span>
                          {lastCloudSync.expiresAt && (
                            <span className="text-emerald-600">
                              (Hết hạn lúc {new Date(lastCloudSync.expiresAt).toLocaleTimeString('vi-VN')} {new Date(lastCloudSync.expiresAt).toLocaleDateString('vi-VN')})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: API GEMINI & OPENROUTER */}
              {settingsTab === 'api' && (
                <div className="space-y-4">
                  {/* AI Provider Switcher */}
                  <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1.5 text-xs font-bold border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setAiProvider('gemini');
                        localStorage.setItem('ai_provider', 'gemini');
                        showToast('Đã chuyển sang Google Gemini 3.6 Flash');
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        aiProvider === 'gemini'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <span>🔵 Google Gemini 3.6 Flash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiProvider('openrouter');
                        localStorage.setItem('ai_provider', 'openrouter');
                        showToast('Đã chuyển sang OpenRouter AI');
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        aiProvider === 'openrouter'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <span>🟣 OpenRouter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiProvider('kira');
                        localStorage.setItem('ai_provider', 'kira');
                        showToast('Đã chuyển sang Kira AI (VN)');
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        aiProvider === 'kira'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <span>🌟 Kira AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiProvider('bai');
                        localStorage.setItem('ai_provider', 'bai');
                        showToast('Đã chuyển sang B.AI (90% Off)');
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        aiProvider === 'bai'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <span>🔥 B.AI (90% Off)</span>
                    </button>
                  </div>

                  {/* B.AI SECTION */}
                  {aiProvider === 'bai' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
                        <div className="font-bold text-rose-950 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <IconSparkles className="w-4 h-4 text-rose-600" />
                            <span>Cấu Hình B.AI (b.ai • 300k Credits)</span>
                          </span>
                          <a
                            href="https://b.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-700 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <span>Trang chủ b.ai</span>
                            <IconExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[11px] text-rose-900 leading-relaxed">
                          B.AI cung cấp các mô hình Vision hàng đầu với ưu đãi <strong>Giảm giá 90% (90% Off)</strong>. Phù hợp quét phiếu xuất kho, trích xuất bảng biểu & nhận diện chữ viết tay.
                        </p>
                      </div>

                      {/* B.AI API Key Input */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 flex items-center justify-between text-xs">
                          <span>API Key B.AI</span>
                          <button
                            type="button"
                            onClick={testBaiConnection}
                            disabled={baiTesting || !baiKey.trim()}
                            className="text-rose-600 hover:underline font-semibold text-[11px] disabled:opacity-50"
                          >
                            {baiTesting ? 'Đang test...' : '⚡ Test Kết Nối'}
                          </button>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={baiKey}
                            onChange={(e) => setBaiKey(e.target.value)}
                            placeholder="Dán API Key B.AI tại đây"
                            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 font-mono text-xs outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">Key được lưu an toàn trên trình duyệt và tự động đồng bộ qua mã Cloud Sync.</p>
                      </div>

                      {/* B.AI Models Selector */}
                      <div className="space-y-2">
                        <label className="font-bold text-slate-700 block text-xs">Chọn Mô Hình B.AI Ưu Tiên (Đang giảm 90%)</label>
                        <div className="grid grid-cols-1 gap-2">
                          {BAI_MODELS.map((m) => {
                            const isSelected = baiModel === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setBaiModel(m.id);
                                  localStorage.setItem('bai_model', m.id);
                                }}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                                  isSelected
                                    ? 'border-rose-500 bg-rose-50/70 shadow-sm ring-1 ring-rose-500'
                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.badgeColor}`}>{m.badge}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-tight">{m.desc}</p>
                                  <div className="font-mono text-[10px] text-rose-700 font-semibold">{m.id}</div>
                                </div>
                                {isSelected && (
                                  <div className="text-right shrink-0">
                                    <div className="text-[11px] text-rose-600 font-bold">✓ Đang chọn</div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom B.AI Model Input */}
                        <div className="pt-1">
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Hoặc nhập mã model B.AI tùy chỉnh:</label>
                          <input
                            type="text"
                            value={baiModel}
                            onChange={(e) => {
                              setBaiModel(e.target.value);
                              localStorage.setItem('bai_model', e.target.value);
                            }}
                            placeholder="Ví dụ: DeepSeek-V4.1-Flash hoặc GLM-5.3-Flash"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-rose-500 font-mono text-xs outline-none bg-slate-50"
                          />
                        </div>
                        <p className="text-[10px] text-rose-900 bg-rose-100/70 p-2 rounded-lg mt-1 leading-normal">
                          💡 <strong>Khuyên dùng:</strong> <code>DeepSeek-V4.1-Flash</code> là mô hình MoE 552B siêu tốc mặc định, hoặc <code>Qwen3.8-Flash</code> để đọc chữ viết tay tốt nhất.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* KIRA AI SECTION */}
                  {aiProvider === 'kira' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                        <div className="font-bold text-amber-950 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <IconSparkles className="w-4 h-4 text-amber-600" />
                            <span>Cấu Hình Kira AI (kiraai.vn)</span>
                          </span>
                          <a
                            href="https://kiraai.vn"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-700 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <span>Trang chủ kiraai.vn</span>
                            <IconExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-relaxed">
                          Kira AI là nền tảng API tương thích chuẩn OpenAI tối ưu tại Việt Nam, cung cấp hạn mức miễn phí lớn hàng ngày (150M - 250M token). <em>Lưu ý: Chỉ nhập các mô hình có hỗ trợ đọc ảnh (Vision) để quét phiếu.</em>
                        </p>
                      </div>

                      {/* Kira AI API Key Input */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 flex items-center justify-between text-xs">
                          <span>API Key Kira AI</span>
                          <button
                            type="button"
                            onClick={testKiraConnection}
                            disabled={kiraTesting || !kiraKey.trim()}
                            className="text-amber-600 hover:underline font-semibold text-[11px] disabled:opacity-50"
                          >
                            {kiraTesting ? 'Đang test...' : '⚡ Test Kết Nối'}
                          </button>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={kiraKey}
                            onChange={(e) => setKiraKey(e.target.value)}
                            placeholder="Dán key kira_... tại đây"
                            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 font-mono text-xs outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">Key của Kira thường có định dạng tiền tố <code className="text-amber-700 font-bold">kira_...</code></p>
                      </div>

                      {/* Kira Models Selector */}
                      <div className="space-y-2">
                        <label className="font-bold text-slate-700 block text-xs">Chọn Mô Hình AI Kira AI (kiraai.vn)</label>
                        <div className="grid grid-cols-1 gap-2">
                          {KIRA_MODELS.map((m) => {
                            const isSelected = kiraModel === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setKiraModel(m.id);
                                  localStorage.setItem('kira_model', m.id);
                                }}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                                  isSelected
                                    ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-500'
                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.badgeColor}`}>{m.badge}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-tight">{m.desc}</p>
                                  <div className="font-mono text-[10px] text-amber-700 font-semibold">{m.id}</div>
                                </div>
                                {isSelected && (
                                  <div className="text-right shrink-0">
                                    <div className="text-[11px] text-amber-600 font-bold">✓ Đang chọn</div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Kira Model Input */}
                        <div className="pt-1">
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Hoặc nhập mã model Kira AI tùy chỉnh:</label>
                          <input
                            type="text"
                            value={kiraModel}
                            onChange={(e) => {
                              setKiraModel(e.target.value);
                              localStorage.setItem('kira_model', e.target.value);
                            }}
                            placeholder="Ví dụ: qwen3.8-flash-free hoặc kira-3.5-flash-pdf"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 font-mono text-xs outline-none bg-slate-50"
                          />
                        </div>
                        <p className="text-[10px] text-amber-900 bg-amber-100/70 p-2 rounded-lg mt-1 leading-normal">
                          💡 <strong>Mẹo dùng mượt mà:</strong> Với gói Free 100M tokens/ngày, hãy chọn <code>qwen3.8-flash-free</code> hoặc <code>qwen3.8-27b-free</code> để có tốc độ phản hồi nhanh nhất và độ chính xác cao đối với chữ viết tay.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* OPENROUTER SECTION */}
                  {aiProvider === 'openrouter' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                        <div className="font-bold text-purple-950 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <IconSparkles className="w-4 h-4 text-purple-600" />
                            <span>Cấu Hình OpenRouter AI</span>
                          </span>
                          <a
                            href="https://openrouter.ai/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <span>Lấy key OpenRouter</span>
                            <IconExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-[11px] text-purple-900 leading-relaxed">
                          OpenRouter cho phép bạn dùng nhiều mô hình AI Vision mạnh mẽ để trích xuất dữ liệu phiếu kho song song với Gemini.
                        </p>
                      </div>

                      {/* OpenRouter API Key Input */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 flex items-center justify-between text-xs">
                          <span>API Key OpenRouter</span>
                          <button
                            type="button"
                            onClick={testOpenRouterConnection}
                            disabled={openRouterTesting || !openRouterKey.trim()}
                            className="text-purple-600 hover:underline font-semibold text-[11px] disabled:opacity-50"
                          >
                            {openRouterTesting ? 'Đang test...' : '⚡ Test Kết Nối'}
                          </button>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={openRouterKey}
                            onChange={(e) => setOpenRouterKey(e.target.value)}
                            placeholder="Dán key sk-or-v1-... tại đây"
                            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 font-mono text-xs outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">Key được lưu an toàn trên máy và tự động đồng bộ sang điện thoại qua Cloud Sync.</p>
                      </div>

                      {/* 4 Models Selector */}
                      <div className="space-y-2">
                        <label className="font-bold text-slate-700 block text-xs">Chọn Mô Hình AI OpenRouter</label>
                        <div className="grid grid-cols-1 gap-2">
                          {OPENROUTER_MODELS.map((m) => {
                            const isSelected = openRouterModel === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setOpenRouterModel(m.id);
                                  localStorage.setItem('openrouter_model', m.id);
                                }}
                                className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                                  isSelected
                                    ? 'border-purple-500 bg-purple-50/70 shadow-sm ring-1 ring-purple-500'
                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${m.badgeColor}`}>{m.badge}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-tight">{m.desc}</p>
                                  <div className="font-mono text-[10px] text-purple-700 font-semibold">{m.id}</div>
                                </div>
                                {isSelected && (
                                  <div className="text-right shrink-0">
                                    <div className="text-[11px] text-purple-600 font-bold">✓ Đang chọn</div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Model Input */}
                        <div className="pt-1">
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Hoặc nhập mã model OpenRouter tùy chỉnh:</label>
                          <input
                            type="text"
                            value={openRouterModel}
                            onChange={(e) => setOpenRouterModel(e.target.value)}
                            placeholder="Ví dụ: google/gemini-2.0-flash-001"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-purple-500 font-mono text-xs outline-none bg-slate-50"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GEMINI SECTION */}
                  {aiProvider === 'gemini' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Google AI Studio Setup Guide */}
                      <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 space-y-2">
                        <div className="font-bold text-blue-900 flex items-center gap-2">
                          <IconKey className="w-4 h-4 text-blue-600" />
                          <span>Cách Lấy API Key từ Google AI Studio</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800 leading-relaxed">
                          <li>Vào trang <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="font-bold underline">aistudio.google.com/apikey</a> (đăng nhập tài khoản Google)</li>
                          <li>Bấm nút <strong>&ldquo;Create API key&rdquo;</strong> → Chọn project hoặc tạo mới</li>
                          <li>Sao chép API key (bắt đầu bằng <code className="bg-blue-100 px-1 rounded">AIza...</code>)</li>
                          <li>Dán vào ô <strong>&ldquo;API Key Gemini Chính&rdquo;</strong> bên dưới → Bấm <strong>Lưu</strong></li>
                        </ol>
                        <p className="text-[10px] text-blue-700 font-medium">✅ Gói Pay-as-you-go: Tốc độ cao 1.000 RPM • Không bao giờ nghẽn 429</p>
                      </div>

                      {/* Primary Key */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 flex items-center justify-between">
                          <span>API Key Gemini Chính</span>
                          <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <span>Lấy key Google AI Studio</span>
                            <IconExternalLink className="w-3 h-3" />
                          </a>
                        </label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Dán API Key Gemini tại đây (AIza...)..."
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono outline-none"
                        />
                        <p className="text-[11px] text-slate-400">Key chỉ lưu trên trình duyệt và mã đồng bộ riêng của bạn.</p>
                      </div>

                      {/* Backup Keys File */}
                      <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="font-bold text-slate-700 block">Nạp Danh Sách API Dự Phòng (.TXT)</label>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Mỗi dòng 1 key. Tự động luân chuyển sang key kế tiếp khi gặp mã lỗi <strong>429 (Rate Limit)</strong> từ Gemini.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => backupFileInputRef.current?.click()}
                            className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
                          >
                            <IconUpload className="w-3.5 h-3.5" />
                            <span>Tải file .TXT</span>
                          </button>
                          <span className="font-medium text-slate-600">
                            {backupKeys.length ? `Đã nạp ${backupKeys.length} key dự phòng` : 'Chưa có file'}
                          </span>
                        </div>
                        <input ref={backupFileInputRef} type="file" className="hidden" accept=".txt,text/plain" onChange={handleBackupApiFile} />
                      </div>

                      {/* API Status Monitor */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Kiểm Tra Trạng Thái API</span>
                          <button onClick={checkAllApis} className="text-blue-600 hover:underline font-semibold text-xs">
                            Kiểm tra tất cả
                          </button>
                        </div>

                        <div className="p-2 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-1.5">
                          <span>🤖</span>
                          <span>Đang dùng mô hình <strong>Gemini 3.6 Flash</strong> chuẩn mới nhất. Hệ thống tự động chuyển key dự phòng khi gặp lỗi 429.</span>
                        </div>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {getGeminiApiKeys().length > 0 ? (
                            getGeminiApiKeys().map((key, index) => {
                              const isLimited = rateLimitedKeys.has(key);
                              return (
                                <div key={key} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-mono font-bold text-slate-800 text-xs truncate">
                                      {index === 0 ? 'Chính' : `Dự phòng #${index}`} • {maskApiKey(key)}
                                    </div>
                                    <div className="text-[10px] flex items-center gap-2 mt-0.5">
                                      <span className={isLimited ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                                        {isLimited ? '⚠ Tạm bị giới hạn (429)' : '✓ Sẵn sàng'}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => checkApiReadiness(key)}
                                    className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-[10px] font-bold shrink-0"
                                  >
                                    Test
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4 text-slate-400">Chưa cấu hình API key nào</div>
                          )}
                        </div>
                        {rateLimitedKeys.size > 0 && (
                          <button
                            onClick={() => { setRateLimitedKeys(new Set()); showToast('Đã xóa trạng thái giới hạn, thử lại với tất cả API', 'success'); }}
                            className="w-full py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 active:scale-95 transition-all"
                          >
                            Xóa trạng thái 429 &amp; thử lại tất cả API
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: GOOGLE SHEETS INTEGRATION */}
              {settingsTab === 'sheet' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <IconSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <span>Kết Nối Google Sheets Tự Động Lưu Phiếu</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Mỗi dòng hàng sau khi quét sẽ được tự động ghi vào trang tính Google Sheet của bạn (tự động cách 1 dòng trống giữa các phiếu).
                    </p>
                  </div>

                  {/* Webhook URL Input */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>Google Apps Script Webhook URL</span>
                      <button
                        type="button"
                        onClick={testGoogleSheetConnection}
                        className="text-emerald-600 hover:underline font-bold text-xs flex items-center gap-1"
                      >
                        <span>Kiểm tra kết nối</span>
                      </button>
                    </label>
                    <input
                      type="url"
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 font-mono text-xs outline-none"
                    />
                  </div>

                  {/* Auto-sync Checkbox */}
                  <label className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSyncSheet}
                      onChange={(e) => setAutoSyncSheet(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-slate-800">Tự động đồng bộ sang Google Sheet sau khi quét xong</div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Tự động đẩy toàn bộ các dòng hàng vừa nhận diện xong sang Sheet mà không cần bấm nút lưu thủ công.
                      </div>
                    </div>
                  </label>

                  {/* 3-Step Setup Instructions */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Hướng Dẫn Cài Đặt (Mất 2 Phút):</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(APPS_SCRIPT_SAMPLE, 'apps_script')}
                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                      >
                        <IconCopy className="w-3.5 h-3.5" />
                        <span>{copiedKey === 'apps_script' ? 'Đã sao chép code!' : '📋 Sao chép mã Apps Script'}</span>
                      </button>
                    </div>

                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <li>Mở file Google Sheet của bạn ➔ vào menu <strong>Tiện ích mở rộng (Extensions)</strong> ➔ chọn <strong>Apps Script</strong>.</li>
                      <li>Xóa hết code cũ trong đó, nhấn nút <strong>Sao chép mã Apps Script</strong> ở trên và dán vào ➔ nhấn <strong>Lưu (Ctrl+S)</strong>.</li>
                      <li>Nhấn <strong>Triển khai (Deploy)</strong> ➔ <strong>Tùy chọn triển khai mới (New deployment)</strong>:
                        <ul className="list-disc list-inside pl-4 text-slate-500">
                          <li>Loại: <strong>Ứng dụng web (Web app)</strong></li>
                          <li>Người có quyền truy cập (Who has access): Chọn <strong>Bất kỳ ai (Anyone)</strong></li>
                        </ul>
                      </li>
                      <li>Bấm <strong>Triển khai</strong> ➔ sao chép link Webhook (kết thúc bằng <code>/exec</code>) và dán vào ô bên trên.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* TAB 4: COLUMNS SELECTION */}
              {settingsTab === 'columns' && (
                <div className="space-y-3">
                  <p className="text-slate-500 leading-relaxed">
                    Tùy chỉnh các cột cần AI trích xuất từ bảng phiếu. Cột <strong>Số phiếu</strong> luôn được trích xuất mặc định.
                  </p>
                  <div className="grid gap-2">
                    {Object.entries(COLUMN_DEFS).map(([key, col]) => {
                      const isChecked = selectedColumns.includes(key);
                      return (
                        <label
                          key={key}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                            isChecked ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={key}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedColumns((prev) => [...prev, key]);
                              } else {
                                setSelectedColumns((prev) => prev.filter((k) => k !== key));
                              }
                            }}
                            className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 accent-blue-600"
                          />
                          <div>
                            <div className="font-bold text-slate-800">{col.short}</div>
                            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{col.label}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: PROMPTS CUSTOMIZATION */}
              {settingsTab === 'prompts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 text-[11px]">
                      Ghi hướng dẫn riêng cho từng trường để Gemini đọc đúng định dạng đặc thù của doanh nghiệp.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFieldPrompts(DEFAULT_FIELD_PROMPTS)}
                      className="text-blue-600 hover:underline font-semibold whitespace-nowrap text-xs"
                    >
                      Dùng mặc định
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {['soPhieu', ...selectedColumns].map((key) => (
                      <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{key === 'soPhieu' ? 'Số phiếu' : COLUMN_DEFS[key]?.short}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">{key}</span>
                        </div>
                        <textarea
                          rows={2}
                          value={fieldPrompts[key] || ''}
                          onChange={(e) => setFieldPrompts((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder="Nhập hướng dẫn OCR cho trường này..."
                          className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white font-sans outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: VIEW MODE */}
              {settingsTab === 'view' && (
                <div className="space-y-3">
                  <p className="text-slate-500 leading-relaxed">Chọn chế độ bố cục giao diện hiển thị phù hợp với thiết bị của bạn:</p>
                  <div className="grid gap-2">
                    {[
                      ['auto', 'Tự Động (Khuyến nghị)', 'Tự động co giãn 2 cột trên máy tính và 1 cột trên điện thoại'],
                      ['mobile', 'Chế Độ Mobile Cố Định', 'Giao diện dạng thẻ 1 cột tối ưu cho thao tác một tay'],
                      ['desktop', 'Chế Độ Desktop Cố Định', 'Bố cục 2 cột chia đôi màn hình mở rộng'],
                    ].map(([val, title, desc]) => (
                      <label
                        key={val}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                          viewMode === val ? 'bg-blue-50/50 border-blue-300' : 'bg-white border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="viewModeOption"
                          value={val}
                          checked={viewMode === val}
                          onChange={(e) => setViewMode(e.target.value)}
                          className="mt-0.5 w-4 h-4 text-blue-600 accent-blue-600"
                        />
                        <div>
                          <div className="font-bold text-slate-800">{title}</div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: PWA & ANDROID APP (.APK) */}
              {settingsTab === 'android' && (
                <div className="space-y-4">
                  {/* Top Intro Card */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-teal-50 rounded-2xl border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                      <IconDevicePhone className="w-5 h-5 text-blue-600" />
                      <span>Cài Đặt Ứng Dụng Đa Nền Tảng (PWA & Android APK)</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cả 2 phương án đều kết nối trực tiếp vào hệ thống, <strong>tự động đồng bộ 100% thời gian thực</strong> (API Key, Cấu hình Cột & Google Sheet) với máy tính qua Cloud.
                    </p>
                  </div>

                  {/* PHƯƠNG ÁN 1: PWA */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-blue-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center">1</span>
                        <span className="font-extrabold text-sm text-slate-900">Phương Án 1: Cài Đặt Trực Tiếp (PWA)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Khuyên Dùng • Cài Ngay
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Cài đặt trực tiếp từ trình duyệt trên điện thoại Android/iPhone/Máy tính. Chạy toàn màn hình, mượt mà như App tải từ Store, không cần tải file cài đặt.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                      <button
                        onClick={installPwaApp}
                        className="w-full sm:w-auto px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        <IconDevicePhone className="w-4 h-4" />
                        <span>📲 {isPwaInstalled ? 'Đã Cài Đặt Ứng Dụng (Mở App)' : 'Cài Đặt Ứng Dụng Ngay (PWA)'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <div><strong>• Trên Android (Chrome):</strong> Bấm nút trên hoặc chọn menu <strong>⋮</strong> ➔ chọn <em>"Cài đặt ứng dụng"</em> hoặc <em>"Thêm vào MH chính"</em>.</div>
                      <div><strong>• Trên iPhone (Safari):</strong> Bấm nút <strong>Chia sẻ (Share)</strong> ➔ chọn <em>"Thêm vào MH chính (Add to Home Screen)"</em>.</div>
                    </div>
                  </div>

                  {/* PHƯƠNG ÁN 2: ANDROID APK */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">2</span>
                        <span className="font-extrabold text-sm text-slate-900">Phương Án 2: File Cài Đặt Android Native (.APK)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Capacitor Native
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Dành cho các dòng máy Android phát nội bộ cho nhân viên kho. Đóng gói độc lập, tích hợp sâu phần cứng Camera & Flashlight.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                      <a
                        href="https://github.com/kentnobita/scanzzz/releases/latest/download/ScanPhieuKho-v38.apk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        <IconUpload className="w-4 h-4 rotate-180" />
                        <span>📥 Tải File Cài Đặt Android (ScanPhieuKho-v38.apk)</span>
                      </a>

                      <a
                        href="https://github.com/kentnobita/scanzzz/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-all"
                      >
                        <IconExternalLink className="w-3.5 h-3.5" />
                        <span>Xem Tất Cả Bản Phát Hành</span>
                      </a>
                    </div>
                  </div>

                  {/* UNIVERSAL SYNC EXPLANATION */}
                  <div className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl space-y-2 text-[11px]">
                    <div className="font-bold text-white flex items-center gap-2">
                      <IconCloud className="w-4 h-4 text-blue-400" />
                      <span>Cơ Chế Đồng Bộ Đa Nền Tảng:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      Bất kể bạn dùng <strong>Web Máy Tính</strong>, <strong>App PWA Điện Thoại</strong> hay <strong>App Android APK</strong>: Chỉ cần nhập cùng <strong>Mã Đồng Bộ Cloud</strong> (ví dụ <code>{cloudSyncCode || 'KHO-01'}</code>) hoặc quét mã QR, mọi API Key Gemini và cấu hình Google Sheet sẽ tự động đồng bộ ngay lập tức!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={saveSettings}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <IconCheck className="w-4 h-4" />
                <span>Lưu & Áp Dụng Cài Đặt</span>
              </button>
              <button
                onClick={clearAllApis}
                className="px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs active:scale-95 transition-all"
                title="Xóa toàn bộ API keys đã lưu"
              >
                Xóa Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[700] px-5 py-3 rounded-full text-xs font-bold text-white shadow-modal animate-fade-in flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-red-600'
              : 'bg-slate-900'
          }`}
        >
          {toast.type === 'success' ? (
            <IconCheck className="w-4 h-4 text-white" />
          ) : toast.type === 'error' ? (
            <IconClose className="w-4 h-4 text-white" />
          ) : (
            <IconInfo className="w-4 h-4 text-white" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
