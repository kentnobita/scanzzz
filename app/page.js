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

const DEFAULT_FIELD_PROMPTS = {
  soPhieu: 'Đọc kỹ số phiếu/số chứng từ ở đầu phiếu, bao gồm cả số in sẵn hoặc chữ viết tay bổ sung. Giữ nguyên toàn bộ ký tự và số.',
  ten: 'Lấy chính xác tên hàng, quy cách hoặc mã sản phẩm (đọc cả chữ viết tay tiếng Việt có dấu, chữ viết tắt như Thùng, Cuộn, Cây, Bộ, Hộp). Không gộp hai dòng hàng thành một.',
  soOSPO: 'Chỉ lấy số, không lấy thêm bất kỳ chữ hay ký tự nào. Tự động điều chỉnh theo định dạng 5 chữ số (xxxxx): nếu trên phiếu ghi dạng TiềnTố-HậuTố (ví dụ: 8-999 -> 80999, 8-99 -> 80099, 8-9 -> 80009, 8-1999 -> 81999, 8-x999 -> 8x999) thì phần sau dấu gạch nối luôn được bù số 0 ở đầu thành 4 chữ số ghép với số đầu.',
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

  // 1. Kiểm tra nếu có dấu gạch nối hoặc dấu phân cách: ví dụ "8-999", "8 - 99", "8.999", "8/9"
  const matchWithSep = str.match(/(\d+)\s*[-/._\s]\s*(\d+)/);
  if (matchWithSep) {
    const prefix = matchWithSep[1];
    const suffix = matchWithSep[2];
    // Hậu tố được bù các số 0 ở đầu thành đúng 4 chữ số
    const paddedSuffix = suffix.padStart(4, '0');
    return `${prefix}${paddedSuffix}`;
  }

  // 2. Nếu là số thuần hoặc chuỗi chứa số: chỉ giữ lại các chữ số
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

const API_LOCAL_LIMIT = 20;

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
  const showToast = useCallback((message, type = '') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // Image & Scan state
  const [currentImageBase64, setCurrentImageBase64] = useState(null);
  const [currentImageMimeType, setCurrentImageMimeType] = useState('image/jpeg');
  const [previewSrc, setPreviewSrc] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ active: false, percent: 0, text: '' });
  const [showTesseractWarning, setShowTesseractWarning] = useState(false);
  const [engineBadge, setEngineBadge] = useState('');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Result state
  const [soPhieu, setSoPhieu] = useState('');
  const [tableItems, setTableItems] = useState([]);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Multi-page PDF states & Per-page separation
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfPages, setPdfPages] = useState([]); // [{ pageNum, fullUrl, thumbUrl, base64, selected: true }]
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Per-page Results separation ('separate' | pageNum)
  const [pageResults, setPageResults] = useState([]); // [{ pageNum, soPhieu, items: [], previewUrl, status, itemCount }]
  const [activeResultTab, setActiveResultTab] = useState('separate');

  // Live Batch Progress Dialog state
  const [batchProgressModal, setBatchProgressModal] = useState({
    active: false,
    total: 0,
    current: 0,
    percent: 0,
    pageStatuses: [], // [{ pageNum, status: 'pending'|'running'|'done'|'error', detail: '', lines: 0, soPhieu: '' }]
  });

  // Settings & Storage state
  const [apiKey, setApiKey] = useState('');
  const [backupKeys, setBackupKeys] = useState([]);
  const [apiUsage, setApiUsage] = useState({});
  const [apiHistory, setApiHistory] = useState([]);
  const [rateLimitedKeys, setRateLimitedKeys] = useState(new Set());
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_COLUMNS);
  const [fieldPrompts, setFieldPrompts] = useState(DEFAULT_FIELD_PROMPTS);
  const [viewMode, setViewMode] = useState('auto');
  const [scanHistory, setScanHistory] = useState([]);

  // Google Sheets Integration State
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [autoSyncSheet, setAutoSyncSheet] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSheetSync, setLastSheetSync] = useState(null);

  // Cloud Multi-Device Sync State
  const [cloudSyncCode, setCloudSyncCode] = useState('');
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [autoCloudSyncOnLaunch, setAutoCloudSyncOnLaunch] = useState(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Modals & Tabs state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('sync'); // 'sync' | 'api' | 'sheet' | 'columns' | 'prompts' | 'view'
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

    try {
      const bKeys = JSON.parse(localStorage.getItem('gemini_backup_api_keys') || '[]');
      setBackupKeys(Array.isArray(bKeys) ? bKeys.filter((k) => k !== key) : []);
    } catch {
      setBackupKeys([]);
    }

    try {
      const todayGmt7 = getGmt7DateString();
      const lastQuotaDate = localStorage.getItem('gemini_quota_date');
      const rawUsage = JSON.parse(localStorage.getItem('gemini_api_usage') || '{}');

      if (lastQuotaDate && lastQuotaDate !== todayGmt7) {
        // Reset 0h GMT+7
        const resetUsage = {};
        Object.keys(rawUsage).forEach((k) => {
          if (k === '_date') return;
          resetUsage[k] = { ...(rawUsage[k] || {}), used: 0, checkStatus: 'Đã reset 0h GMT+7' };
        });
        resetUsage._date = todayGmt7;
        setApiUsage(resetUsage);
        localStorage.setItem('gemini_api_usage', JSON.stringify(resetUsage));
        localStorage.setItem('gemini_quota_date', todayGmt7);
      } else {
        setApiUsage(rawUsage);
        if (!lastQuotaDate) localStorage.setItem('gemini_quota_date', todayGmt7);
      }
    } catch {
      setApiUsage({});
    }

    try {
      const hist = JSON.parse(localStorage.getItem('gemini_api_usage_history') || '[]');
      setApiHistory(Array.isArray(hist) ? hist : []);
    } catch {
      setApiHistory([]);
    }

    try {
      const cols = JSON.parse(localStorage.getItem('scan_columns') || '[]');
      if (Array.isArray(cols) && cols.length) setSelectedColumns(cols);
    } catch {}

    try {
      const prompts = JSON.parse(localStorage.getItem('scan_field_prompts') || '{}');
      setFieldPrompts({ ...DEFAULT_FIELD_PROMPTS, ...prompts });
    } catch {}

    const mode = localStorage.getItem('view_mode') || 'auto';
    setViewMode(mode);
    applyViewMode(mode);

    try {
      const localHist = JSON.parse(localStorage.getItem('scan_history') || '[]');
      setScanHistory(Array.isArray(localHist) ? localHist : []);
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
        // Automatically sync configuration and quota from Cloud on app launch
        pullFromCloud(savedSyncCode, true);
      }
    }

    // Real-time background timer for crossing 0h GMT+7
    const quotaTimer = setInterval(() => {
      const currentToday = getGmt7DateString();
      const recordedDate = localStorage.getItem('gemini_quota_date');
      if (recordedDate && recordedDate !== currentToday) {
        console.log(`[0h GMT+7 Quota Reset] Date rolled over to ${currentToday}`);
        setApiUsage((prev) => {
          const next = {};
          Object.keys(prev).forEach((k) => {
            if (k === '_date') return;
            next[k] = { ...(prev[k] || {}), used: 0, checkStatus: 'Đã reset 0h GMT+7' };
          });
          next._date = currentToday;
          localStorage.setItem('gemini_api_usage', JSON.stringify(next));
          localStorage.setItem('gemini_quota_date', currentToday);
          return next;
        });
        setRateLimitedKeys(new Set());
      }
    }, 15000);

    return () => clearInterval(quotaTimer);
  }, []);

  const applyViewMode = (mode) => {
    document.body.classList.remove('view-mobile', 'view-desktop');
    if (mode === 'mobile') document.body.classList.add('view-mobile');
    if (mode === 'desktop') document.body.classList.add('view-desktop');
  };

  // Cloud Sync Functions: API, Quota & Google Sheets Configuration
  const pushToCloud = async (overrideCode = null, silent = false) => {
    const code = (overrideCode || cloudSyncCode || syncCodeInput).trim().toUpperCase();
    if (!code || code.length < 3) {
      showToast('Vui lòng nhập Mã Đồng Bộ ít nhất 3 ký tự (Ví dụ: KHO-01)', 'error');
      return false;
    }

    setIsCloudSyncing(true);
    if (!silent) showToast(`☁️ Đang đồng bộ cấu hình API, Bộ đếm & Sheet lên Cloud [${code}]...`);

    try {
      const payload = {
        code,
        apiKey: apiKey.trim(),
        backupKeys,
        apiUsage,
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Lỗi server');
      }

      setCloudSyncCode(code);
      localStorage.setItem('cloud_sync_code', code);
      const nowStr = new Date().toLocaleTimeString('vi-VN');
      setLastCloudSync({ time: nowStr, code });
      if (!silent) showToast(`✅ Đã lưu cấu hình API & Sheet lên Cloud [${code}] thành công!`, 'success');
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
      if (data.apiUsage && typeof data.apiUsage === 'object') {
        setApiUsage(data.apiUsage);
        localStorage.setItem('gemini_api_usage', JSON.stringify(data.apiUsage));
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

      setCloudSyncCode(code);
      setSyncCodeInput(code);
      localStorage.setItem('cloud_sync_code', code);

      const nowStr = new Date().toLocaleTimeString('vi-VN');
      setLastCloudSync({ time: nowStr, code });
      if (!silent) {
        showToast(`🎉 Đã đồng bộ cấu hình API, Bộ đếm & Google Sheet từ Cloud [${code}]!`, 'success');
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
      const usage = apiUsage[key] || { used: 0 };
      const remaining = Math.max(0, API_LOCAL_LIMIT - usage.used);
      const limited = rateLimitedKeys.has(key);
      const exhausted = remaining === 0;
      return {
        key,
        index,
        used: usage.used || 0,
        remaining,
        limited,
        exhausted,
        lastUsedAt: usage.lastUsedAt || '',
        lastResult: usage.lastResult || '',
        lastCheckedAt: usage.lastCheckedAt || '',
        checkStatus: usage.checkStatus || '',
        checkDetail: usage.checkDetail || '',
        status: exhausted ? 'Hết 20 lượt' : 'Sẵn sàng',
      };
    });
  }, [getGeminiApiKeys, apiUsage, rateLimitedKeys]);

  const recordApiAttempt = useCallback((key, result, detail = '', forceExhausted = false) => {
    setApiUsage((prev) => {
      const next = { ...prev };
      const item = next[key] || { used: 0 };
      item.used = forceExhausted ? API_LOCAL_LIMIT : Math.min(API_LOCAL_LIMIT, (item.used || 0) + 1);
      item.lastUsedAt = new Date().toISOString();
      item.lastResult = result;
      next[key] = item;
      localStorage.setItem('gemini_api_usage', JSON.stringify(next));

      // Auto-sync quota counter to Cloud in background
      if (cloudSyncCode) {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cloudSyncCode,
            apiKey: apiKey.trim(),
            backupKeys,
            apiUsage: next,
            googleSheetUrl: googleSheetUrl.trim(),
            autoSyncSheet,
            selectedColumns,
            fieldPrompts,
          }),
        }).catch(() => {});
      }

      return next;
    });

    setApiHistory((prev) => {
      const usage = (apiUsage[key]?.used || 0) + 1;
      const item = {
        id: 'api_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        at: new Date().toISOString(),
        api: maskApiKey(key),
        result,
        detail,
        used: forceExhausted ? API_LOCAL_LIMIT : Math.min(API_LOCAL_LIMIT, usage),
        remaining: forceExhausted ? 0 : Math.max(0, API_LOCAL_LIMIT - usage),
      };
      const next = [item, ...prev].slice(0, 80);
      localStorage.setItem('gemini_api_usage_history', JSON.stringify(next));
      return next;
    });
  }, [apiUsage, cloudSyncCode, apiKey, backupKeys, googleSheetUrl, autoSyncSheet, selectedColumns, fieldPrompts]);

  const loadImageFromDataUrl = useCallback((dataUrl, isNewRaw = true) => {
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
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.94);

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

  const processFile = useCallback((file) => {
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      handlePDF(file);
    } else if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadImageFromDataUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      showToast('Định dạng không hỗ trợ (chỉ nhận PDF, JPG, PNG, WEBP)', 'error');
    }
  }, [handlePDF, loadImageFromDataUrl, showToast]);

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

  // Drag & Drop event listeners
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
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
        showToast(
          file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
            ? '📥 Đã nhận file PDF kéo thả'
            : '📥 Đã nhận file ảnh kéo thả',
          'success'
        );
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
  }, [processFile, showToast]);

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

    setIsSyncingSheet(true);
    if (!silent) showToast('📊 Đang đồng bộ dữ liệu vào Google Sheet...');

    try {
      const payload = {
        soPhieu: targetSoPhieu || soPhieu || '',
        pageNum: pageNum || 1,
        items: items.map((item) => ({
          ...item,
          soPhieu: item.soPhieu || targetSoPhieu || soPhieu || '',
        })),
      };

      const res = await fetch('/api/sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl, payload }),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok || !resData.success) {
        throw new Error(resData.error || `Lỗi đồng bộ Google Sheet (HTTP ${res.status})`);
      }

      const nowStr = new Date().toLocaleTimeString('vi-VN');
      setLastSheetSync({ time: nowStr, count: items.length });
      if (!silent) {
        showToast(`📊 Đã lưu thành công ${items.length} dòng vào Google Sheet lúc ${nowStr}!`, 'success');
      }
      return true;
    } catch (e) {
      console.error('Google Sheet Sync Error:', e);
      if (!silent) {
        showToast('❌ ' + e.message, 'error');
      }
      return false;
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Direct Gemini OCR with Google Generative AI
  const scanClientGeminiWithBase64 = async (base64Data, mimeType, key) => {
    const schema = selectedColumns.map((k) => `"${k}": "giá trị"`).join(',\n        ');
    const rules = ['soPhieu', ...selectedColumns]
      .map((k) => `- ${k === 'soPhieu' ? 'Số phiếu' : COLUMN_DEFS[k]?.short || k} → trường ${k}: ${fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''}`)
      .join('\n');

    const promptText = `Bạn là chuyên gia thị giác AI OCR chuyên đọc phiếu xuất kho / nhập kho / giao hàng Việt Nam, đặc biệt xử lý xuất sắc CHỮ VIẾT TAY và BẢNG BIỂU PHỨC TẠP.

HƯỚNG DẪN NHẬN DIỆN CHỮ VIẾT TAY:
1. Đọc chuẩn xác chữ viết tay tiếng Việt (chữ viết bút bi, bút mực, nét ngoáy, nét nghiêng, viết đè, viết tắt).
2. Phân biệt rõ các ký tự số viết tay dễ nhầm lẫn:
   - Số 0 và chữ O, D
   - Số 1 và số 7, chữ l, I, /
   - Số 2 và chữ Z
   - Số 5 và chữ S, số 6
   - Số 8 và chữ B, số 0
3. Nếu một ô có cả chữ in và chữ viết tay sửa/ghi đè lên, ưu tiên lấy giá trị viết tay mới nhất.
4. Quét từng dòng bảng từ trên xuống dưới theo chiều ngang, không bỏ sót dòng viết tay nhỏ hoặc dòng ở cuối bảng. Bỏ qua các dòng tổng cộng ("Tổng", "Cộng", "Tổng số lượng", "Ký nhận").

QUY TẮC TRÍCH XUẤT CHO TỪNG CỘT:
${rules}

Nếu một trường hoàn toàn không đọc được, ghi "???". Không tự suy diễn dữ liệu không xuất hiện trên phiếu.

Trả về đúng JSON thuần theo cấu trúc:
{
  "soPhieu": "số phiếu",
  "items": [
    {${schema}}
  ]
}
Không trả markdown hoặc giải thích.`;

    const body = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
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

    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      return { soPhieu: '', items: [{ ten: text }] };
    }
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

  // OCR Single Image Helper with Failover
  const executeOcrOnImage = async (base64Data, mimeType, progressPrefix = '') => {
    const availableEntries = getApiMonitorEntries().filter((i) => !i.limited && !i.exhausted);
    const apiKeys = availableEntries.map((i) => i.key);

    if (apiKeys.length) {
      for (let i = 0; i < apiKeys.length; i++) {
        const key = apiKeys[i];
        try {
          const res = await scanClientGeminiWithBase64(base64Data, mimeType, key);
          recordApiAttempt(key, 'Thành công');
          setRateLimitedKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          return { data: res, engine: 'gemini' };
        } catch (error) {
          const is429 = error?.status === 429;
          if (is429) {
            recordApiAttempt(key, 'Hết 20 lượt', 'Gemini trả về 429', true);
            setRateLimitedKeys((prev) => new Set(prev).add(key));
            if (i < apiKeys.length - 1) {
              setScanProgress({
                active: true,
                percent: 50,
                text: `${progressPrefix} ↪ Đang chuyển sang API dự phòng...`,
              });
              continue;
            }
          } else {
            recordApiAttempt(key, 'Lỗi', error?.message || 'Lỗi request');
          }
          throw error;
        }
      }
    } else {
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
    }
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

      const normalizedItems = (Array.isArray(resultData.items) ? resultData.items : []).map((item) => {
        const out = {};
        selectedColumns.forEach((k) => {
          let val = item?.[k] ?? '';
          if (k === 'soOSPO') val = formatOSPO(val);
          out[k] = val;
        });
        return out;
      });

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

          const pageSoPhieu = pageResult.soPhieu || '';
          if (pageSoPhieu && !detectedFirstSoPhieu) {
            detectedFirstSoPhieu = pageSoPhieu;
          }

          const normalized = (Array.isArray(pageResult.items) ? pageResult.items : []).map((item) => {
            const out = { _pageNum: pageNum, soPhieu: pageSoPhieu };
            selectedColumns.forEach((k) => {
              let val = item?.[k] ?? '';
              if (k === 'soOSPO') val = formatOSPO(val);
              out[k] = val;
            });
            return out;
          });

          accumulatedItems = [...accumulatedItems, ...normalized];

          const singleResult = {
            pageNum,
            soPhieu: pageSoPhieu,
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
              soPhieu: pageSoPhieu,
            };
            return {
              ...prev,
              percent: Math.round(((i + 1) / total) * 100),
              pageStatuses: nextStatuses,
            };
          });
        } catch (pageErr) {
          console.error(`Error on page ${pageNum}:`, pageErr);
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
      showToast(`✨ Đã trích xuất thành công ${accumulatedItems.length} dòng từ ${total} trang PDF`, 'success');

      if (autoSyncSheet && googleSheetUrl && accumulatedItems.length > 0) {
        syncToGoogleSheet(accumulatedItems, detectedFirstSoPhieu || '', 1, true);
      }

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 250);
    } catch (e) {
      console.error(e);
      showToast('❌ Lỗi quét PDF: ' + e.message, 'error');
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        setBatchProgressModal((prev) => ({ ...prev, active: false }));
        setScanProgress((prev) => ({ ...prev, active: false }));
      }, 1500);
    }
  };

  // History Operations in LocalStorage
  const saveHistoryRecord = (id, spVal, itemsVal, pageResultsVal = [], isNew = false) => {
    const currentPR = pageResultsVal.length ? pageResultsVal : pageResults;
    const record = {
      id,
      createdAt: isNew ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
      soPhieu: spVal,
      items: itemsVal,
      pageResults: currentPR,
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
      const capped = next.slice(0, 50);
      localStorage.setItem('scan_history', JSON.stringify(capped));
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
    showToast(`Đang kiểm tra kết nối API...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      const isReady = res.ok;
      const is429 = res.status === 429;
      setApiUsage((prev) => {
        const next = { ...prev };
        const item = next[key] || { used: 0 };
        item.lastCheckedAt = new Date().toISOString();
        item.checkStatus = isReady ? 'Sẵn sàng' : is429 ? 'Hết 20 lượt' : 'Không sẵn sàng';
        item.checkDetail = isReady ? 'Kết nối Gemini thành công' : `Lỗi ${res.status}`;
        if (is429) item.used = API_LOCAL_LIMIT;
        next[key] = item;
        localStorage.setItem('gemini_api_usage', JSON.stringify(next));
        return next;
      });
      if (isReady) showToast(`✅ ${maskApiKey(key)}: Kết nối tốt!`, 'success');
      else showToast(`⚠️ ${maskApiKey(key)}: ${is429 ? 'Đã hết lượt (429)' : 'Không khả dụng'}`, 'error');
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

  const resetApiCounters = () => {
    const next = {};
    getGeminiApiKeys().forEach((k) => (next[k] = { used: 0, lastUsedAt: '', lastResult: '' }));
    setApiUsage(next);
    localStorage.setItem('gemini_api_usage', JSON.stringify(next));
    setRateLimitedKeys(new Set());
    
    // Also push reset quota counters to cloud if connected
    if (cloudSyncCode) {
      pushToCloud(cloudSyncCode, true);
    }
    showToast('Đã đặt lại 20 lượt cho tất cả API', 'success');
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
    localStorage.setItem('google_sheet_webhook_url', googleSheetUrl.trim());
    localStorage.setItem('google_sheet_auto_sync', String(autoSyncSheet));
    localStorage.setItem('auto_cloud_sync_on_launch', String(autoCloudSyncOnLaunch));
    localStorage.setItem('scan_columns', JSON.stringify(selectedColumns));
    localStorage.setItem('scan_field_prompts', JSON.stringify(fieldPrompts));
    localStorage.setItem('view_mode', viewMode);
    applyViewMode(viewMode);

    // If sync code is active, auto push API + Quota + Sheet settings to cloud
    if (cloudSyncCode) {
      pushToCloud(cloudSyncCode, true);
    }

    setSettingsOpen(false);
    showToast('✅ Đã lưu cấu hình thành công', 'success');
  };

  const clearAllApis = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('gemini_backup_api_keys');
    localStorage.removeItem('gemini_api_usage');
    localStorage.removeItem('gemini_api_usage_history');
    setApiKey('');
    setBackupKeys([]);
    setApiUsage({});
    setApiHistory([]);
    setRateLimitedKeys(new Set());
    showToast('Đã xóa toàn bộ API key', 'success');
  };

  const availableApiCount = getApiMonitorEntries().filter((i) => !i.limited && !i.exhausted).length;
  const totalApiCount = getGeminiApiKeys().length;
  const isMultiPage = pageResults.length > 1;
  const selectedPdfPagesCount = pdfPages.filter((p) => p.selected).length;

  const singleTabResult = typeof activeResultTab === 'number'
    ? pageResults.find((p) => p.pageNum === activeResultTab)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <IconScan className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">Scan Pro Max</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  v36.0.17
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

      {/* Sub-header Status Indicator Bar */}
      <div className="bg-slate-100 border-b border-slate-200/80 py-2">
        <div className="max-w-[1200px] mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  availableApiCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold text-slate-700">
                {totalApiCount > 0
                  ? `${availableApiCount}/${totalApiCount} API Gemini sẵn sàng`
                  : 'Chế độ OCR Offline (Tesseract)'}
              </span>
            </div>

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
      <main className="flex-1 desktop-grid max-w-[1200px] mx-auto w-full p-4 sm:p-6">
        {/* Left Column (Upload Card & History Desktop Widget) */}
        <div className="desktop-left space-y-5">
          {/* Upload Card with 4 Distinct Buttons */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hover:shadow-card transition-shadow">
            <div className="flex items-center justify-between mb-4">
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
              >
                <IconUpload className="w-4 h-4 text-blue-600" />
                <span>Chọn Ảnh</span>
              </button>

              {/* 3. Pick PDF */}
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={isProcessingPdf}
                className="flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 font-bold text-xs border border-indigo-200/80 active:scale-[0.98] transition-all disabled:opacity-50"
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
                <span>Kéo thả trực tiếp file PDF hoặc file Ảnh vào màn hình</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <IconCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Tự động đồng bộ cấu hình API, Bộ đếm & Google Sheet</span>
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
              onChange={(e) => {
                if (e.target.files?.[0]) processFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <input
              ref={pdfInputRef}
              type="file"
              className="hidden"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) processFile(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </section>

          {/* History Widget (Desktop Sidebar) */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hidden lg:block">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <IconHistory className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Lịch sử phiếu thiết bị này</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                  {scanHistory.length}
                </span>
              </div>
              {scanHistory.length > 0 && (
                <button onClick={clearAllHistory} className="text-xs text-red-600 hover:underline">
                  Xóa tất cả
                </button>
              )}
            </div>

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
                    >
                      <IconLayers className="w-3.5 h-3.5" />
                      <span>Xem & Chọn {pdfPages.length} trang PDF</span>
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
                className="mt-4 w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 transition-all"
              >
                {isScanning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang trích xuất dữ liệu phiếu...</span>
                  </>
                ) : (
                  <>
                    <IconSparkles className="w-5 h-5" />
                    <span>Bắt Đầu Quét Trích Xuất Dữ Liệu</span>
                  </>
                )}
              </button>
            </section>
          ) : (
            /* Empty State Workspace */
            <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-subtle">
                <IconScan className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Chưa có ảnh hoặc file PDF nào được chọn</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Hãy nhấn <strong>Chọn File PDF</strong>, <strong>Chọn Ảnh</strong>, <strong>Quét Camera</strong>, kéo thả file PDF vào đây hoặc nhấn <strong>Ctrl+V</strong>.
              </p>
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
                        engineBadge === 'gemini'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {engineBadge === 'gemini' ? '✨ Gemini Vision 3.6 Flash' : '📝 Tesseract OCR'}
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
                      return (
                        <button
                          key={p.pageNum}
                          onClick={() => setActiveResultTab(p.pageNum)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white/70 hover:bg-white text-slate-700'
                          }`}
                        >
                          <span>📄 Chỉ Trang {p.pageNum}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {p.items.length} dòng
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
                      className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200/90 shadow-card space-y-5 animate-fade-in"
                    >
                      {/* Page Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                            {page.pageNum}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-base text-slate-900 uppercase tracking-tight">
                              Kết Quả Trang {page.pageNum}
                            </h4>
                            <span className="text-xs text-slate-500 font-semibold">{page.items.length} dòng hàng của trang {page.pageNum}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => syncToGoogleSheet(page.items, page.soPhieu, page.pageNum)}
                            disabled={isSyncingSheet}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <IconSpreadsheet className="w-4 h-4 text-emerald-600" />
                            <span>Lưu Trang {page.pageNum} Sang Sheet</span>
                          </button>

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
                                <th className="p-2.5 text-center w-12">STT</th>
                                {selectedColumns.map((k) => (
                                  <th key={k} className="p-2.5 whitespace-nowrap">
                                    {COLUMN_DEFS[k]?.short || k}
                                  </th>
                                ))}
                                <th className="p-2.5 text-center w-12">Copy</th>
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
                                      <td key={k} className="p-1.5">
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
                          <th className="p-2.5 text-center w-12">STT</th>
                          {selectedColumns.map((k) => (
                            <th key={k} className="p-2.5 whitespace-nowrap">
                              {COLUMN_DEFS[k]?.short || k}
                            </th>
                          ))}
                          <th className="p-2.5 text-center w-12">Copy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {singleTabResult.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-50/50">
                              {idx + 1}
                            </td>
                            {selectedColumns.map((k) => (
                              <td key={k} className="p-1.5">
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
              Phiên bản v36.0.17
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Phát triển bởi:</span>
            <a
              href="https://t.me/vd81997"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-all hover:shadow-sm active:scale-95"
            >
              <svg className="w-3.5 h-3.5 fill-[#229ED9]" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              <span>Liên hệ: Đắc dzaii</span>
            </a>
          </div>
        </div>
      </footer>

      {/* PDF Multi-Page Preview & Selection Modal */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-modal flex flex-col gap-4 text-slate-900 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconLayers className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">File PDF Có {pdfPages.length} Trang</h3>
                  <p className="text-[11px] text-slate-500">Bấm vào bất kỳ đâu trên ô trang để chọn hoặc bỏ chọn</p>
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
                  Đã chọn <strong className="text-blue-600 font-mono text-sm">{selectedPdfPagesCount}</strong> / {pdfPages.length} trang
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
                        <img src={page.thumbUrl} alt={`Trang ${page.pageNum}`} className="w-full h-full object-contain pointer-events-none" />
                        {isCurrentActive && (
                          <div className="absolute inset-0 ring-2 ring-blue-500/50 rounded-xl pointer-events-none" />
                        )}
                      </div>

                      {/* Label & Actions */}
                      <div className="w-full flex items-center justify-between px-1">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
                          <span>Trang {page.pageNum}</span>
                          {isChecked && <span className="text-[10px] text-blue-600 font-bold">(Đã chọn)</span>}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectSinglePdfPage(idx);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-bold px-1.5 py-0.5 rounded hover:bg-blue-100/50"
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
              <div className="text-xs text-slate-500">
                Đang xem: <strong>Trang {pdfPages[selectedPdfIndex]?.pageNum}</strong>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => selectSinglePdfPage(selectedPdfIndex)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all active:scale-95"
                >
                  Quét 1 Trang Đang Xem (P.{pdfPages[selectedPdfIndex]?.pageNum})
                </button>

                <button
                  onClick={() => startBatchPdfScan()}
                  disabled={selectedPdfPagesCount === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                >
                  <IconSparkles className="w-4 h-4" />
                  <span>Quét {selectedPdfPagesCount} Trang Đã Chọn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Multi-Page Batch Progress Dialog */}
      {batchProgressModal.active && (
        <div className="fixed inset-0 z-[600] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-modal flex flex-col gap-4 text-slate-900 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IconLayers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Đang Quét File PDF ({batchProgressModal.current}/{batchProgressModal.total} Trang)
                  </h3>
                  <p className="text-xs text-slate-500">Tiến trình nhận dạng AI đang diễn ra theo từng trang</p>
                </div>
              </div>
              <span className="font-mono font-extrabold text-blue-600 text-base">
                {batchProgressModal.percent}%
              </span>
            </div>

            {/* Main Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-all duration-300 rounded-full"
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
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
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
                      <div className="font-bold text-slate-800">
                        Trang {ps.pageNum} {ps.soPhieu ? `— Số phiếu: ${ps.soPhieu}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{ps.detail}</div>
                    </div>
                  </div>

                  <div>
                    {ps.status === 'running' && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    {ps.status === 'done' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        +{ps.lines} dòng
                      </span>
                    )}
                    {ps.status === 'error' && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">Lỗi</span>
                    )}
                    {ps.status === 'pending' && <span className="text-[10px] text-slate-400">Chờ...</span>}
                  </div>
                </div>
              ))}
            </div>
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
                <h3 className="font-bold text-sm text-slate-900">Lịch Sử Phiếu ({scanHistory.length})</h3>
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
                Mở camera trên điện thoại và quét mã QR này để tự động nạp toàn bộ cấu hình API Gemini, Bộ đếm & Google Sheet!
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
                API Gemini
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
                <span>App Android (.APK) 📱</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* TAB 1: CLOUD SYNC (API, QUOTA COUNTER & GOOGLE SHEETS) */}
              {settingsTab === 'sync' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2 text-blue-950 font-bold">
                      <IconCloud className="w-5 h-5 text-blue-600" />
                      <span>Đồng Bộ Cấu Hình API, Bộ Đếm, Google Sheet, Cột & Prompt</span>
                    </div>
                    <p className="text-[11px] text-blue-900 leading-relaxed">
                      Chỉ cần nhập cùng một <strong>Mã Đồng Bộ</strong> hoặc <strong>Quét mã QR</strong> trên thiết bị khác, toàn bộ <strong>API Key Gemini</strong>, <strong>Bộ đếm lượt dùng (20 lượt)</strong>, <strong>Link Google Sheet</strong>, <strong>Cột trích xuất</strong> và <strong>Gợi ý Prompt</strong> sẽ được tự động đồng bộ ngay lập tức!
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
                        Mỗi khi mở trang web, hệ thống sẽ tự động cập nhật API Key, Bộ đếm lượt quota và Google Sheet mới nhất từ Cloud mà không cần thao tác thủ công.
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
                        Mở camera trên điện thoại quét mã này là tự động áp dụng API, Bộ đếm quota và Google Sheet.
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
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đồng bộ Cloud gần nhất: <strong>{lastCloudSync.time}</strong> (Mã: <strong>{lastCloudSync.code}</strong>)</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: API GEMINI */}
              {settingsTab === 'api' && (
                <div className="space-y-4">
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
                      placeholder="Dán API Key Gemini tại đây..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono outline-none"
                    />
                    <p className="text-[11px] text-slate-400">Key chỉ lưu trên trình duyệt và mã đồng bộ riêng của bạn.</p>
                  </div>

                  {/* Backup Keys File */}
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-700 block">Nạp Danh Sách API Dự Phòng (.TXT)</label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Mỗi dòng 1 key. Tự động luân chuyển khi gặp mã lỗi 429 hoặc chạm hạn mức 20 lượt.
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

                  {/* Monitor & Counters */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Giám Sát Quota Cục Bộ (Đồng bộ Cloud)</span>
                      <div className="flex items-center gap-2">
                        <button onClick={checkAllApis} className="text-blue-600 hover:underline font-semibold">
                          Kiểm tra tất cả
                        </button>
                        <span>•</span>
                        <button onClick={resetApiCounters} className="text-slate-500 hover:underline">
                          Đặt lại 20 lượt
                        </button>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                      <span>⏰</span>
                      <span>Bộ đếm 20 lượt tự động làm mới về 0 vào lúc <strong>00:00 hàng ngày (Múi giờ GMT+7)</strong>.</span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {getApiMonitorEntries().length > 0 ? (
                        getApiMonitorEntries().map((item) => (
                          <div key={item.key} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-slate-800 text-xs truncate">
                                {item.index === 0 ? 'Chính' : `Dự phòng #${item.index}`} • {maskApiKey(item.key)}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{item.status}</span>
                                {item.checkStatus && (
                                  <>
                                    <span>•</span>
                                    <span className={item.checkStatus === 'Sẵn sàng' ? 'text-emerald-600 font-bold' : 'text-red-500'}>
                                      {item.checkStatus}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-700">
                                {item.used}/{API_LOCAL_LIMIT}
                              </span>
                              <button
                                onClick={() => checkApiReadiness(item.key)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-[10px] font-bold"
                              >
                                Test
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-slate-400">Chưa cấu hình API key nào</div>
                      )}
                    </div>
                  </div>
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

              {/* TAB 7: ANDROID APP (.APK) */}
              {settingsTab === 'android' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                      <IconDevicePhone className="w-5 h-5 text-emerald-600" />
                      <span>Ứng Dụng Android Độc Lập Cho Nhân Viên Kho</span>
                    </div>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      Toàn bộ hệ thống quét phiếu đã được đóng gói thành file cài đặt <strong>.APK</strong> với đầy đủ quyền Camera quét tự động, Đèn Flash và tự động đồng bộ Cloud & Google Sheet thời gian thực.
                    </p>

                    {/* Direct Download Button */}
                    <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                      <a
                        href="https://github.com/kentnobita/scanzzz/releases/latest/download/ScanPhieuKho-v36.apk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                      >
                        <IconUpload className="w-4 h-4 rotate-180" />
                        <span>📥 Tải File Cài Đặt Android (ScanPhieuKho-v36.apk)</span>
                      </a>

                      <a
                        href="https://github.com/kentnobita/scanzzz/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-all"
                      >
                        <IconExternalLink className="w-3.5 h-3.5" />
                        <span>Xem Danh Sách Bản Phát Hành</span>
                      </a>
                    </div>
                  </div>

                  {/* Android Quick Setup Box */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span>📋 Hướng Dẫn Cài Đặt Lên Điện Thoại Android:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                      <li>Bấm nút <strong>Tải File Cài Đặt</strong> ở trên hoặc gửi file <code>ScanPhieuKho-v36.apk</code> qua Zalo/Telegram.</li>
                      <li>Mở file <code>.apk</code> trên điện thoại ➔ Nếu máy hỏi, chọn <strong>Cho phép cài đặt từ nguồn này</strong>.</li>
                      <li>Mở app <strong>Scan Phiếu Pro Max</strong> ➔ Nhập <strong>Mã Đồng Bộ</strong> (hoặc quét mã QR) để nạp toàn bộ cấu hình API & Google Sheet vào máy.</li>
                    </ol>
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
