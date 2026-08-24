'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useUser, UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
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
} from '@/components/Icons';
import {
  scanSlipBackend,
  fetchSlipsBackend,
  saveSlipBackend,
  updateSlipBackend,
  deleteSlipBackend,
  checkBackendHealth,
  BACKEND_URL,
} from '@/lib/api';

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
  soPhieu: 'Tìm số phiếu hoặc số chứng từ. Giữ nguyên tiền tố, dấu cách và toàn bộ chữ số như trên phiếu.',
  ten: 'Lấy mã hàng hoặc tên hàng hóa thực tế. Không gộp hai dòng hàng thành một giá trị.',
  soOSPO: 'Lấy đúng mã O.S/PO, đơn đặt hàng hoặc mã tham chiếu được in trên cùng dòng hàng.',
  donViTinh: 'Lấy đơn vị tính viết trên phiếu, ví dụ EA, PCS, KG, BOX. Không tự suy diễn.',
  soLuongChungTu: 'Chỉ lấy số lượng theo chứng từ. Chỉ trả về số, không thêm đơn vị tính.',
  soLuongThucNhap: 'Chỉ lấy số lượng thực nhập. Chỉ trả về số, không thêm đơn vị tính.',
  soPallet: 'Lấy số pallet hoặc mã pallet. Giữ số 0 ở đầu nếu có.',
  ghiChu: 'Lấy ghi chú cùng dòng hàng nếu có; nếu trống thì trả về chuỗi rỗng.',
};

const API_LOCAL_LIMIT = 20;

export default function Home() {
  // Clerk Auth state
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  // Toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = '') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // Backend Health status
  const [backendStatus, setBackendStatus] = useState(null); // null | { status, database_configured, r2_configured }

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
  const [imageUrlR2, setImageUrlR2] = useState(null);

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

  // Modals & Tabs state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api'); // 'api' | 'cloud' | 'columns' | 'prompts' | 'view'
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Image edits state
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

  // Refs
  const fileInputRef = useRef(null);
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

  // Check Backend Health & Sync Slips from Neon DB on Mount or User Login
  useEffect(() => {
    async function initCloudSync() {
      const health = await checkBackendHealth();
      setBackendStatus(health);

      // If backend is active and user is signed in, fetch slips from Neon DB
      try {
        const token = isSignedIn ? await getToken() : null;
        const cloudSlips = await fetchSlipsBackend(token);
        if (cloudSlips && cloudSlips.length > 0) {
          // Normalize cloud slips
          const formatted = cloudSlips.map((s) => ({
            id: s.id,
            soPhieu: s.so_phieu,
            image_url: s.image_url,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
            columns: s.columns_json || DEFAULT_COLUMNS,
            items: (s.items || []).map((it) => ({
              ten: it.ten_hang,
              soOSPO: it.so_os_po,
              donViTinh: it.don_vi_tinh,
              soLuongChungTu: it.sl_chung_tu,
              soLuongThucNhap: it.sl_thuc_nhap,
              soPallet: it.so_pallet,
              ghiChu: it.ghi_chu,
            })),
          }));
          setScanHistory(formatted);
          localStorage.setItem('scan_history', JSON.stringify(formatted));
          return;
        }
      } catch (e) {
        console.warn('Sync warning:', e);
      }

      // Local storage fallback
      try {
        const localHist = JSON.parse(localStorage.getItem('scan_history') || '[]');
        setScanHistory(Array.isArray(localHist) ? localHist : []);
      } catch {}
    }

    initCloudSync();
  }, [isSignedIn, getToken]);

  // Sync state with localStorage on mount
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || '';
    setApiKey(key);

    try {
      const bKeys = JSON.parse(localStorage.getItem('gemini_backup_api_keys') || '[]');
      setBackupKeys(Array.isArray(bKeys) ? bKeys.filter((k) => k !== key) : []);
    } catch {
      setBackupKeys([]);
    }

    try {
      const usage = JSON.parse(localStorage.getItem('gemini_api_usage') || '{}');
      setApiUsage(usage);
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
  }, []);

  const applyViewMode = (mode) => {
    document.body.classList.remove('view-mobile', 'view-desktop');
    if (mode === 'mobile') document.body.classList.add('view-mobile');
    if (mode === 'desktop') document.body.classList.add('view-desktop');
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
  }, [apiUsage]);

  const loadImageFromDataUrl = useCallback((dataUrl) => {
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
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.9);

      setCurrentImageBase64(jpegUrl.split(',')[1]);
      setCurrentImageMimeType('image/jpeg');
      setPreviewSrc(jpegUrl);
      setResultVisible(false);
      setImageSharpened(false);
      setUnsharpenedSrc(null);
    };
    img.src = dataUrl;
  }, []);

  const handlePDF = useCallback(async (file) => {
    try {
      showToast('📄 Đang xử lý PDF...');
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
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

      loadImageFromDataUrl(canvas.toDataURL('image/jpeg', 0.92));
      showToast(`📄 Đã tải trang 1/${pdf.numPages}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('❌ Không thể đọc file PDF', 'error');
    }
  }, [loadImageFromDataUrl, showToast]);

  const processFile = useCallback((file) => {
    if (file.type === 'application/pdf') {
      handlePDF(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadImageFromDataUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      showToast('Định dạng không hỗ trợ (chỉ nhận JPG, PNG, PDF)', 'error');
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
        showToast('📥 Đã nhận file kéo thả', 'success');
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

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      showToast('Camera chưa sẵn sàng', 'error');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    closeCameraScanner();
    loadImageFromDataUrl(canvas.toDataURL('image/jpeg', 0.94));
    showToast('📷 Đã chụp ảnh, sẵn sàng quét', 'success');
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
    if (imageSharpened && unsharpenedSrc) {
      setImageSharpened(false);
      loadImageFromDataUrl(unsharpenedSrc);
      showToast('Đã tắt làm nét', 'success');
      return;
    }
    if (!previewSrc) return;
    setUnsharpenedSrc(previewSrc);

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
      const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
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
            d[(y * w + x) * 4 + c] = Math.max(0, Math.min(255, total));
          }
          d[(y * w + x) * 4 + 3] = s[(y * w + x) * 4 + 3];
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').putImageData(out, 0, 0);

      setImageSharpened(true);
      loadImageFromDataUrl(canvas.toDataURL('image/jpeg', 0.94));
      showToast('✨ Đã làm nét ảnh', 'success');
    };
    img.src = previewSrc;
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
      loadImageFromDataUrl(canvas.toDataURL('image/jpeg', 0.94));
      showToast('✅ Đã cắt ảnh', 'success');
    };
    img.src = cropSourceSrc;
  };

  const resetImageEdits = () => {
    if (!previewSrc) return;
    setImageSharpened(false);
    setUnsharpenedSrc(null);
    loadImageFromDataUrl(previewSrc);
    showToast('↺ Đã đặt lại ảnh gốc', 'success');
  };

  // Client-side fallback OCR when backend is offline
  const scanClientGemini = async (key) => {
    const schema = selectedColumns.map((k) => `"${k}": "giá trị"`).join(',\n        ');
    const rules = ['soPhieu', ...selectedColumns]
      .map((k) => `- ${k === 'soPhieu' ? 'Số phiếu' : COLUMN_DEFS[k]?.short || k} → trường ${k}: ${fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''}`)
      .join('\n');

    const promptText = `Bạn là hệ thống OCR chuyên đọc phiếu nhập kho/xuất kho Việt Nam. Hãy đọc chính xác phần đầu phiếu và bảng hàng hóa.

Trích xuất số phiếu và các cột được chọn theo hướng dẫn riêng sau:
${rules}

Chỉ lấy dòng hàng hóa có dữ liệu thực tế, bỏ qua dòng trống và dòng tổng cộng. Nếu một trường không đọc được, ghi "???". Không tự suy diễn dữ liệu không xuất hiện trên phiếu.

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
            { inline_data: { mime_type: currentImageMimeType, data: currentImageBase64 } },
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
      const err = new Error(`API Error: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const err = new Error('Không nhận được kết quả từ Gemini');
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

  const scanWithTesseract = async (onProgress) => {
    if (!window.Tesseract) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Không thể tải Tesseract.js'));
        document.head.appendChild(s);
      });
    }

    const result = await window.Tesseract.recognize(
      'data:' + currentImageMimeType + ';base64,' + currentImageBase64,
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

  // Main Scan Dispatcher: Backend Serverless -> Client Gemini Failover -> Tesseract
  const startScan = async () => {
    if (isScanning || !currentImageBase64) return;
    setIsScanning(true);
    setScanProgress({ active: true, percent: 10, text: 'Đang chuẩn bị...' });
    setShowTesseractWarning(false);

    try {
      let resultData = null;
      let usedEngine = 'gemini-3.6-flash';
      let r2Url = null;
      let slipId = null;

      // 1. Try Backend API first if reachable
      if (backendStatus?.status === 'healthy') {
        setScanProgress({ active: true, percent: 35, text: '🤖 Đang phân tích qua FastAPI Backend...' });
        const token = isSignedIn ? await getToken() : null;

        const backendRes = await scanSlipBackend({
          imageBase64: currentImageBase64,
          mimeType: currentImageMimeType,
          selectedColumns,
          customFieldPrompts: fieldPrompts,
          saveToDb: true,
          uploadToR2: true,
          token,
        });

        resultData = {
          soPhieu: backendRes.so_phieu,
          items: backendRes.items,
        };
        usedEngine = backendRes.engine_used;
        r2Url = backendRes.image_url;
        slipId = backendRes.slip_id;
        setEngineBadge('gemini');
      } else {
        // 2. Client-side fallback if backend not yet running
        const availableEntries = getApiMonitorEntries().filter((i) => !i.limited && !i.exhausted);
        const apiKeys = availableEntries.map((i) => i.key);

        if (apiKeys.length) {
          setScanProgress({ active: true, percent: 30, text: '🤖 Đang gọi Gemini AI Vision...' });
          for (let i = 0; i < apiKeys.length; i++) {
            const key = apiKeys[i];
            try {
              resultData = await scanClientGemini(key);
              recordApiAttempt(key, 'Thành công');
              setRateLimitedKeys((prev) => {
                const next = new Set(prev);
                next.delete(key);
                return next;
              });
              break;
            } catch (error) {
              const is429 = error?.status === 429;
              if (is429) {
                recordApiAttempt(key, 'Hết 20 lượt', 'Gemini trả về 429', true);
                setRateLimitedKeys((prev) => new Set(prev).add(key));
                if (i < apiKeys.length - 1) {
                  setScanProgress({
                    active: true,
                    percent: Math.min(85, 30 + (i + 1) * 20),
                    text: '↪ Đang chuyển sang API dự phòng...',
                  });
                  showToast('↪ Đang dùng API dự phòng', 'success');
                  continue;
                }
              } else {
                recordApiAttempt(key, 'Lỗi', error?.message || 'Lỗi request');
              }
              throw error;
            }
          }
          setEngineBadge('gemini');
        } else {
          setShowTesseractWarning(true);
          setScanProgress({ active: true, percent: 15, text: '📥 Đang tải engine OCR offline...' });
          resultData = await scanWithTesseract((p) => {
            const pct = Math.round(p * 100);
            setScanProgress({
              active: true,
              percent: pct,
              text: p < 0.3 ? '📥 Đang nạp OCR...' : p < 0.9 ? `🔍 Đang nhận diện... ${pct}%` : '✅ Hoàn tất!',
            });
          });
          setEngineBadge('tesseract');
        }
      }

      setScanProgress({ active: true, percent: 100, text: '✅ Trích xuất thành công!' });

      const normalizedItems = (Array.isArray(resultData.items) ? resultData.items : []).map((item) => {
        const out = {};
        selectedColumns.forEach((k) => (out[k] = item?.[k] ?? ''));
        return out;
      });

      const nextId = slipId || 'h_' + Date.now();
      setCurrentHistoryId(nextId);
      setSoPhieu(resultData.soPhieu || '');
      setTableItems(normalizedItems);
      setImageUrlR2(r2Url);
      setResultVisible(true);

      saveHistoryRecord(nextId, resultData.soPhieu || '', normalizedItems, r2Url, true);

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

  // History Operations with Neon DB and LocalStorage
  const saveHistoryRecord = async (id, spVal, itemsVal, r2Url = null, isNew = false) => {
    const record = {
      id,
      createdAt: isNew ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
      soPhieu: spVal,
      image_url: r2Url || imageUrlR2,
      items: itemsVal,
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
      localStorage.setItem('scan_history', JSON.stringify(next.slice(0, 50)));
      return next;
    });

    // Sync update to Neon DB via Backend if available
    if (backendStatus?.database_configured) {
      try {
        const token = isSignedIn ? await getToken() : null;
        await updateSlipBackend(
          id,
          {
            so_phieu: spVal,
            columns: selectedColumns,
            items: itemsVal,
          },
          token
        );
      } catch (e) {
        console.warn('Backend update notice:', e);
      }
    }

    if (!isNew) showToast('💾 Đã lưu thay đổi vào cơ sở dữ liệu', 'success');
  };

  const loadHistoryItem = (item) => {
    setCurrentHistoryId(item.id);
    setSoPhieu(item.soPhieu || '');
    setTableItems(item.items || []);
    setImageUrlR2(item.image_url || null);
    setResultVisible(true);
    setHistoryOpen(false);
    setEngineBadge('gemini');
    showToast('🕘 Đã mở phiếu từ lịch sử', 'success');
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const deleteHistoryItem = async (id, e) => {
    e?.stopPropagation();
    setScanHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      localStorage.setItem('scan_history', JSON.stringify(next));
      return next;
    });
    if (currentHistoryId === id) setCurrentHistoryId(null);

    // Delete in Neon DB
    if (backendStatus?.database_configured) {
      try {
        const token = isSignedIn ? await getToken() : null;
        await deleteSlipBackend(id, token);
      } catch (err) {
        console.warn('Delete warning:', err);
      }
    }

    showToast('Đã xóa phiếu khỏi lịch sử', 'success');
  };

  const clearAllHistory = () => {
    if (!scanHistory.length) return;
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử phiếu đã quét?')) {
      localStorage.removeItem('scan_history');
      setScanHistory([]);
      showToast('Đã xóa toàn bộ lịch sử', 'success');
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

  const copyColumn = (key) => {
    const values = tableItems.map((item) => (item[key] || '').trim()).filter(Boolean);
    if (!values.length) {
      showToast(`Chưa có dữ liệu ở cột ${COLUMN_DEFS[key]?.short || key}`, 'error');
      return;
    }
    copyToClipboard(values.join('\n'), `col_${key}`);
  };

  const resetAll = () => {
    setCurrentImageBase64(null);
    setPreviewSrc('');
    setResultVisible(false);
    setSoPhieu('');
    setTableItems([]);
    setCurrentHistoryId(null);
    setImageUrlR2(null);
    setImageSharpened(false);
    setUnsharpenedSrc(null);
    setCropSourceSrc(null);
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
    showToast('Đã đặt lại 20 lượt cho tất cả API', 'success');
  };

  const clearApiHistory = () => {
    localStorage.removeItem('gemini_api_usage_history');
    setApiHistory([]);
    showToast('Đã xóa toàn bộ lịch sử API', 'success');
  };

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('scan_columns', JSON.stringify(selectedColumns));
    localStorage.setItem('scan_field_prompts', JSON.stringify(fieldPrompts));
    localStorage.setItem('view_mode', viewMode);
    applyViewMode(viewMode);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[500] bg-blue-600/20 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-blue-500 m-4 rounded-3xl animate-fade-in pointer-events-none">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-elevated text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center animate-bounce">
              <IconUpload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Thả file ảnh hoặc PDF vào đây</h3>
            <p className="text-sm text-slate-500">Tự động nạp tài liệu và tối ưu để quét OCR</p>
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
                  FULL-STACK
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AI OCR • Clerk Auth • Neon DB • Cloudflare R2</p>
            </div>
          </div>

          {/* User Auth & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Clerk User Button / Sign In */}
            <SignedIn>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <UserButton afterSignOutUrl="/" showName={false} />
                <span className="text-xs text-slate-300 hidden md:block font-medium">
                  {user?.firstName || user?.username || 'Tài khoản'}
                </span>
              </div>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm active:scale-95 transition-all">
                  Đăng nhập
                </button>
              </SignInButton>
            </SignedOut>

            <button
              onClick={() => setHistoryOpen(true)}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 hover:text-white border border-slate-700/60 relative"
              title="Lịch sử phiếu đã quét"
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
              title="Cài đặt & Cấu hình API"
            >
              <IconSettings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sub-header Status Indicator Bar */}
      <div className="bg-slate-100 border-b border-slate-200/80 py-2">
        <div className="max-w-[1200px] mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                backendStatus?.status === 'healthy' || availableApiCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {backendStatus?.status === 'healthy'
                ? `⚡ FastAPI Backend & Koyeb (${backendStatus.database_configured ? 'Neon DB ✓' : ''} ${
                    backendStatus.r2_configured ? 'R2 Storage ✓' : ''
                  })`
                : totalApiCount > 0
                ? `${availableApiCount}/${totalApiCount} API Gemini sẵn sàng (Client mode)`
                : 'Chế độ OCR Offline (Tesseract)'}
            </span>
          </div>
          <div className="text-slate-500 hidden md:flex items-center gap-3">
            <span>
              Mẹo: <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700">Ctrl+V</kbd> để dán ảnh bất kỳ lúc nào
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <main className="flex-1 desktop-grid max-w-[1200px] mx-auto w-full p-4 sm:p-6">
        {/* Left Column (Upload Card & History Desktop Widget) */}
        <div className="desktop-left space-y-5">
          {/* Upload Card */}
          <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle hover:shadow-card transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <IconCamera className="w-4 h-4 text-blue-600" />
                Chọn Nguồn Tài Liệu
              </h2>
              <span className="text-[11px] font-medium text-slate-400">PDF, JPG, PNG</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={openCameraScanner}
                className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-xs shadow-sm active:scale-[0.98] transition-all"
              >
                <IconCamera className="w-5 h-5" />
                <span>Quét Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80 active:scale-[0.98] transition-all"
              >
                <IconUpload className="w-5 h-5 text-slate-600" />
                <span>Chọn File</span>
              </button>

              <button
                onClick={pasteFromClipboard}
                className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80 active:scale-[0.98] transition-all"
              >
                <IconClipboard className="w-5 h-5 text-slate-600" />
                <span>Dán Clipboard</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
              <IconInfo className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Bảo mật Full-Stack:</strong> Ảnh và dữ liệu trích xuất được lưu tự động trên Cloudflare R2 & Neon PostgreSQL khi đã đăng nhập.
              </span>
            </div>

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
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,application/pdf"
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Lịch sử Cloud & Cục bộ</h3>
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
                        {item.image_url && <span className="text-[10px] text-blue-500" title="Đã lưu trên Cloudflare R2">☁</span>}
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
                <span className="text-xs font-medium text-slate-500 font-mono">Đã sẵn sàng quét</span>
              </div>

              {/* Image Canvas Viewport */}
              <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center min-h-[260px] max-h-[500px]">
                <img src={previewSrc} alt="Preview" className="w-full h-full object-contain max-h-[480px]" />

                {/* Laser animation when scanning */}
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
              {scanProgress.active && (
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
                    Đang quét bằng OCR Offline. Hãy triển khai Backend trên Koyeb hoặc nhập API Key trong Cài đặt để nhận dạng chữ viết tay chuẩn xác nhất.
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
              <h3 className="text-base font-bold text-slate-800">Chưa có ảnh phiếu nào được chọn</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Hãy nhấn <strong>Quét Camera</strong>, <strong>Chọn File</strong>, hoặc nhấn <strong>Ctrl+V</strong> để dán ảnh chụp phiếu xuất nhập kho.
              </p>
            </div>
          )}

          {/* Results Section */}
          {resultVisible && (
            <section ref={resultRef} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle animate-slide-up space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
                <span className="text-xs font-medium text-slate-500">{tableItems.length} dòng hàng</span>
              </div>

              {/* Slip Number Ticket Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Số Phiếu Xuất/Nhập Kho</div>
                  <input
                    type="text"
                    value={soPhieu}
                    onChange={(e) => setSoPhieu(e.target.value)}
                    placeholder="Chưa nhận dạng được số phiếu..."
                    className="font-mono text-xl font-extrabold text-blue-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                  />
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {imageUrlR2 && (
                    <a
                      href={imageUrlR2}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-100/70 hover:bg-blue-200/70 text-blue-800 font-semibold text-xs transition-all"
                      title="Xem ảnh gốc lưu trên Cloudflare R2"
                    >
                      <span>Xem file R2</span>
                      <IconExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => copyToClipboard(soPhieu, 'soPhieu')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 shadow-sm active:scale-95 transition-all"
                  >
                    {copiedKey === 'soPhieu' ? <IconCheck className="w-4 h-4 text-emerald-600" /> : <IconCopy className="w-4 h-4" />}
                    <span>{copiedKey === 'soPhieu' ? 'Đã sao chép' : 'Sao chép số phiếu'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Extracted Table */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Chi tiết danh mục hàng hóa</div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">STT</th>
                        {selectedColumns.map((k) => (
                          <th key={k} className="p-2.5 whitespace-nowrap">
                            {COLUMN_DEFS[k]?.short || k}
                          </th>
                        ))}
                        <th className="p-2.5 text-center w-12">Copy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableItems.length > 0 ? (
                        tableItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            {selectedColumns.map((k) => (
                              <td key={k} className="p-1.5">
                                <input
                                  type="text"
                                  value={item[k] || ''}
                                  onChange={(e) => {
                                    const next = [...tableItems];
                                    next[idx] = { ...next[idx], [k]: e.target.value };
                                    setTableItems(next);
                                  }}
                                  placeholder={COLUMN_DEFS[k]?.short}
                                  className="w-full px-2 py-1.5 rounded-md border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white bg-transparent font-mono text-xs text-slate-800 outline-none transition-all"
                                />
                              </td>
                            ))}
                            <td className="p-2 text-center">
                              <button
                                onClick={() => {
                                  const values = selectedColumns.map((k) => (item[k] || '').trim()).filter(Boolean);
                                  copyToClipboard(values.join(' | '), `row_${idx}`);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="Sao chép dòng này"
                              >
                                {copiedKey === `row_${idx}` ? (
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
                            Chưa tìm thấy dòng dữ liệu hàng hóa
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Column Quick Copy Chips */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Sao chép nhanh theo từng cột</div>
                <div className="flex flex-wrap gap-2">
                  {selectedColumns.map((k) => (
                    <button
                      key={k}
                      onClick={() => copyColumn(k)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border transition-all active:scale-95 ${
                        copiedKey === `col_${k}`
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200/80 hover:border-blue-200'
                      }`}
                    >
                      {copiedKey === `col_${k}` ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{COLUMN_DEFS[k]?.short}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-700 font-mono">
                        {tableItems.length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => saveHistoryRecord(currentHistoryId || 'h_' + Date.now(), soPhieu, tableItems, imageUrlR2, false)}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
                >
                  <IconSave className="w-4 h-4" />
                  <span>Lưu Chỉnh Sửa Vào Lịch Sử & Database</span>
                </button>
                <button
                  onClick={resetAll}
                  className="px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1.5 active:scale-98 transition-all"
                >
                  <IconRefresh className="w-4 h-4" />
                  <span>Quét Lại</span>
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Camera Live Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl p-5 border border-slate-800 shadow-modal flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <IconCamera className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Trình Quét Camera Chuyên Dụng</h3>
              </div>
              <button
                onClick={closeCameraScanner}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            {/* Video Feed with Corner Reticle & Laser */}
            <div className="relative aspect-[3/4] max-h-[60vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {/* Document Bounding Box Reticle */}
              <div className="absolute w-[86%] h-[78%] border border-blue-400/40 rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                <div className="reticle-corner reticle-top-left" />
                <div className="reticle-corner reticle-top-right" />
                <div className="reticle-corner reticle-bottom-left" />
                <div className="reticle-corner reticle-bottom-right" />
                <div className="w-full h-0.5 scan-laser-line animate-scan-laser" />
              </div>

              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-slate-900/80 text-blue-200 text-xs font-medium backdrop-blur-sm border border-blue-500/30">
                  Căn toàn bộ phiếu vào khung hình
                </span>
              </div>
            </div>

            {/* Shutter & Controls */}
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
                title="Chụp ảnh"
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
                <h3 className="font-bold text-sm text-slate-900">Lịch Sử Phiếu Đã Quét ({scanHistory.length})</h3>
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
                      <div className="font-mono font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{item.soPhieu || 'Không có số phiếu'}</span>
                        {item.image_url && <span className="text-xs text-blue-500" title="Ảnh lưu trên R2">☁</span>}
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
                  Xóa tất cả lịch sử
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}
        >
          <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-modal flex flex-col gap-4 max-h-[90vh] animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconSettings className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">Cài Đặt & Cấu Hình Full-Stack</h3>
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
                onClick={() => setSettingsTab('api')}
                className={`pb-2 px-3 border-b-2 whitespace-nowrap transition-all ${
                  settingsTab === 'api'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                API Gemini & Backend
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
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* TAB 1: API & BACKEND */}
              {settingsTab === 'api' && (
                <div className="space-y-4">
                  {/* Backend Status Card */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Trạng Thái Backend Máy Chủ (Koyeb)</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          backendStatus?.status === 'healthy'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {backendStatus?.status === 'healthy' ? '⚡ Hoạt động' : 'Chưa kết nối Backend'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Địa chỉ Backend:{' '}
                      <code className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono text-blue-700">
                        {BACKEND_URL}
                      </code>
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Neon DB</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">
                          {backendStatus?.database_configured ? '✅ Đã kết nối' : '⚠️ Chưa nạp'}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Cloudflare R2</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">
                          {backendStatus?.r2_configured ? '✅ Đã kết nối' : '⚠️ Chưa nạp'}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-center">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Gemini OCR</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">
                          {backendStatus?.gemini_configured ? '✅ Server key' : 'Client fallback'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary Client Key Fallback */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>API Key Gemini Cục Bộ (Client Fallback)</span>
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
                      placeholder="Dán API Key Gemini tại đây nếu chạy client..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono outline-none"
                    />
                  </div>

                  {/* Backup Keys File */}
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="font-bold text-slate-700 block">Nạp Danh Sách API Dự Phòng (.TXT)</label>
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
                      <span className="font-bold text-slate-700">Giám Sát Quota Cục Bộ</span>
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

                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
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
                        <div className="text-center py-4 text-slate-400">Chưa có API key client nào</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COLUMNS SELECTION */}
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

              {/* TAB 3: PROMPTS CUSTOMIZATION */}
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

              {/* TAB 4: VIEW MODE */}
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
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] px-5 py-3 rounded-full text-xs font-bold text-white shadow-modal animate-fade-in flex items-center gap-2 ${
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
