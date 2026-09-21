const fs = require('fs');
const path = require('path');

// Tự động nạp biến môi trường từ .env.local hoặc .env (nếu có) mà không để lộ key vào Git
try {
  ['.env.local', '.env'].forEach((envFile) => {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [k, ...v] = trimmed.split('=');
          const key = k.trim();
          const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  });
} catch (e) {}

let mupdfModule = null;
async function getMupdf() {
  if (!mupdfModule) {
    mupdfModule = await import('mupdf');
  }
  return mupdfModule;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8387886894:AAG5fHgOiRN7s8q7ufOygMxTrrvavmjOW2c';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const DATA_DIR = path.join(process.cwd(), '.data');
const CONFIG_FILE = path.join(DATA_DIR, 'bot_config.json');
const SYNC_STORE = path.join(DATA_DIR, 'sync_store.json');
const BOT_HISTORY_FILE = path.join(DATA_DIR, 'bot_history.json');

const BOT_COMMANDS = [
  { command: 'astart', description: 'Khởi động bé Akko & xem hướng dẫn quét phiếu' },
  { command: 'ahelp', description: 'Xem danh sách phép thuật và cách dùng' },
  { command: 'astatus', description: 'Xem trạng thái AI, Google Sheet & Topic' },
  { command: 'atopic', description: 'Khóa quét phiếu vào Topic này (/atopic all mở khóa)' },
  { command: 'amodel', description: 'Đổi mô hình AI (Gemini, Qwen, Nex, Minimax...)' },
  { command: 'aprovider', description: 'Đổi nhà cung cấp AI (Gemini, B.AI, Kira, OpenRouter)' },
  { command: 'akey', description: 'Nạp API Key (Google, B.AI, Kira, OpenRouter)' },
  { command: 'async', description: 'Đồng bộ cấu hình từ Web qua mã Cloud Sync' },
  { command: 'asheet', description: 'Cài đặt link Webhook Google Sheet' },
  { command: 'aserver', description: 'Cài đặt máy chủ Web Cloud Sync' }
];

async function syncTelegramBotCommands() {
  try {
    const scopes = [
      { type: 'default' },
      { type: 'all_group_chats' },
      { type: 'all_private_chats' }
    ];
    for (const scope of scopes) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        await fetch(`${TELEGRAM_API}/setMyCommands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commands: BOT_COMMANDS, scope }),
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
      } catch (e) {}
    }
    console.log('✅ [Akko Bot] Đã đồng bộ danh sách gợi ý câu lệnh (/a...) lên Telegram thành công!');
  } catch (err) {
    console.warn('⚠️ Lỗi đồng bộ commands lên Telegram:', err.message);
  }
}

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
  ten: 'Lấy chính xác tên hàng, quy cách hoặc mã sản phẩm (đọc cả chữ viết tay tiếng Việt có dấu, chữ viết tắt như Thùng, Cuộn, Cây, Bộ, Hộp). NGUYÊN TẮC GỘP DÒNG: Nếu một mặt hàng/sản phẩm được in/viết dàn trải thành 2 dòng (ví dụ dòng trên là tên/loại bao bì, dòng dưới là kích thước/quy cách mã nhưng chỉ có chung 1 số lượng, 1 STT hoặc 1 số OS/PO) thì PHẢI GỘP thành 1 dòng hàng duy nhất (ví dụ: "PE SHOE BOX (ECO) 290*180*110mm MK-A-1"). Chỉ tách thành các dòng khác nhau khi có các số lượng/STT/mã OS/PO riêng biệt.',
  soOSPO: 'Chỉ lấy số thuần sau khi đã ghép. Cột Số O.S/PO thường có dạng [Tháng]-[Số đơn hàng] (ví dụ: 9-697, 9-296). Quy tắc chuẩn hóa: Vế trước dấu "-" là số hiệu Tháng (từ 1 đến 12), vế sau là Số thứ tự đơn hàng trong tháng đó (không quá 5000 đơn) nên luôn có đúng 4 chữ số (nếu ít hơn 4 chữ số thì tự động bù các số 0 vào phía trước). Ghép thành dạng [Tháng][4 chữ số đơn]: ví dụ 9-697 -> 90697, 9-296 -> 90296, 9-506 -> 90506, 9-45 -> 90045, 9-5 -> 90005, 10-123 -> 100123. ĐẶC BIỆT CHÚ Ý CHỮ VIẾT TAY: Chữ viết tay số 9 ở vế tháng có nét đuôi cong xuống dưới rất dễ bị đọc nhầm thành chữ "g" hoặc "q" (ví dụ "g-297", "g-697", "q-508" thực chất đều là số 9 viết tay "9-297" -> "90297", "9-697" -> "90697"). Tuyệt đối chỉ trả về các chữ số thuần sau khi ghép, không giữ lại dấu "-" và không chứa chữ cái.',
  donViTinh: 'Lấy đơn vị tính viết trên phiếu (ví dụ: PCS, EA, KG, BOX, CÁI, THÙNG, BỘ, CUỘN, CÂY). Nếu trên phiếu không ghi đơn vị tính hoặc bị mờ/trống, mặc định luôn luôn là "pcs". Không để trống.',
  soLuongChungTu: 'Chỉ lấy số lượng theo chứng từ (chỉ trả về số thuần). Nếu có chữ viết tay sửa đổi/ghi đè lên số in, ưu tiên lấy số viết tay mới nhất.',
  soLuongThucNhap: 'Chỉ lấy số lượng thực nhập/thực xuất (chỉ trả về số thuần). Đọc kỹ các con số viết tay bằng bút bi/bút mực.',
  soPallet: 'Lấy số pallet hoặc mã pallet viết tay/in sẵn. Giữ nguyên số 0 ở đầu nếu có.',
  ghiChu: 'Lấy ghi chú viết tay hoặc in cùng dòng hàng nếu có; nếu trống thì trả về chuỗi rỗng.',
};

function maskSyncCode(code) {
  if (!code || typeof code !== 'string') return 'Chưa liên kết';
  const clean = code.trim();
  if (!clean) return 'Chưa liên kết';
  if (clean.length <= 3) return '•••';
  if (clean.length <= 5) return clean.slice(0, 1) + '•••' + clean.slice(-1);
  return clean.slice(0, 2) + '•••' + clean.slice(-2);
}

function sanitizeForMd(str) {
  if (!str) return '';
  return String(str)
    .replace(/\*/g, '×')
    .replace(/_/g, '-')
    .replace(/[`\[\]]/g, '');
}


function getGeminiKeys(cfg) {
  if (!cfg) return [];
  const keys = [];
  if (cfg.geminiKey && typeof cfg.geminiKey === 'string') {
    const parts = cfg.geminiKey.split(/[\r\n,;]+/).map(k => k.trim()).filter(Boolean);
    keys.push(...parts);
  }
  if (Array.isArray(cfg.geminiBackupKeys)) {
    cfg.geminiBackupKeys.forEach(k => {
      if (k && typeof k === 'string') {
        const parts = k.split(/[\r\n,;]+/).map(x => x.trim()).filter(Boolean);
        keys.push(...parts);
      }
    });
  }
  return Array.from(new Set(keys));
}

let botGeminiKeyIndex = 0;

function getBotConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (!parsed.openRouterModel) parsed.openRouterModel = 'nex-agi/nex-n2.5-pro:free';
      if (!parsed.kiraModel) parsed.kiraModel = 'qwen3.8-27b-free';
      if (!parsed.baiModel) parsed.baiModel = 'DeepSeek-V4.1-Flash';
      if (!parsed.geminiModel || parsed.geminiModel === 'gemini-2.5-flash') parsed.geminiModel = 'gemini-3.6-flash';
      if (!Array.isArray(parsed.geminiBackupKeys)) parsed.geminiBackupKeys = [];
      if (!parsed.aiProvider || parsed.aiProvider === 'apinex') parsed.aiProvider = 'gemini';
      if (!parsed.groupTopics) parsed.groupTopics = {};
      return parsed;
    }
  } catch (e) {}

  let defaultSync = {};
  try {
    if (fs.existsSync(SYNC_STORE)) {
      const store = JSON.parse(fs.readFileSync(SYNC_STORE, 'utf8'));
      const keys = Object.keys(store);
      if (keys.length > 0) {
        const sorted = keys
          .map(k => store[k])
          .filter(Boolean)
          .sort((a, b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
        if (sorted.length > 0) defaultSync = sorted[0];
      }
    }
  } catch (e) {}

  const rawProv = defaultSync.aiProvider || process.env.AI_PROVIDER || 'gemini';
  const effectiveProv = rawProv === 'apinex' ? 'gemini' : rawProv;

  return {
    aiProvider: effectiveProv,
    geminiKey: defaultSync.apiKey || process.env.GEMINI_API_KEY || '',
    geminiBackupKeys: Array.isArray(defaultSync.backupKeys) ? defaultSync.backupKeys : [],
    geminiModel: (defaultSync.geminiModel && defaultSync.geminiModel !== 'gemini-2.5-flash') ? defaultSync.geminiModel : (process.env.GEMINI_MODEL || 'gemini-3.6-flash'),
    openRouterKey: defaultSync.openRouterKey || process.env.OPENROUTER_API_KEY || '',
    openRouterModel: defaultSync.openRouterModel || process.env.OPENROUTER_MODEL || 'nex-agi/nex-n2.5-pro:free',
    kiraKey: defaultSync.kiraKey || process.env.KIRA_API_KEY || '',
    kiraModel: defaultSync.kiraModel || process.env.KIRA_MODEL || 'qwen3.8-27b-free',
    baiKey: defaultSync.baiKey || process.env.BAI_API_KEY || '',
    baiModel: defaultSync.baiModel || process.env.BAI_MODEL || 'DeepSeek-V4.1-Flash',
    googleSheetUrl: defaultSync.googleSheetUrl || process.env.GOOGLE_SHEET_URL || 'https://script.google.com/macros/s/AKfycbxvSkHl-Ebg-VDX88B-iF0BhiH6ujtJ9ZKk-MroWOlU2ky4K4IBG40zyt2qsMfBa0gE/exec',
    autoSyncSheet: defaultSync.autoSyncSheet !== undefined ? !!defaultSync.autoSyncSheet : true,
    cloudSyncCode: defaultSync.code || '',
    selectedColumns: defaultSync.selectedColumns && defaultSync.selectedColumns.length ? defaultSync.selectedColumns : DEFAULT_COLUMNS,
    fieldPrompts: defaultSync.fieldPrompts || DEFAULT_FIELD_PROMPTS,
    groupTopics: defaultSync.groupTopics || {}
  };
}

function saveBotConfig(cfg) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('Lỗi lưu bot_config:', e);
  }
}

// History Storage for Resync
function getBotHistory() {
  try {
    if (fs.existsSync(BOT_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(BOT_HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveBotHistoryItem(id, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const hist = getBotHistory();
    hist[id] = { ...data, timestamp: Date.now() };
    // Keep max 50 items
    const keys = Object.keys(hist);
    if (keys.length > 50) {
      delete hist[keys[0]];
    }
    fs.writeFileSync(BOT_HISTORY_FILE, JSON.stringify(hist, null, 2), 'utf8');
  } catch (e) {
    console.error('Lỗi lưu bot_history:', e);
  }
}

function formatOSPO(raw) {
  if (raw === null || raw === undefined) return '';
  let str = String(raw).trim();
  if (!str || str === '???') return str;

  // 1. Chuẩn hóa chữ cái viết tay dễ bị OCR đọc nhầm: "g-" hoặc "q-" ở đầu (thực chất là tháng 9)
  str = str.replace(/^[gGqQ]\s*[-/._\s]/, '9-');
  str = str.replace(/^[gGqQ](\d{2,4})$/, '9-$1');

  // 2. Kiểm tra nếu có dấu gạch nối hoặc dấu phân cách: ví dụ "9-697", "8-999", "8 - 99", "8.999", "8/9"
  const matchWithSep = str.match(/(\d+)\s*[-/._\s]\s*(\d+)/);
  if (matchWithSep) {
    return `${matchWithSep[1]}${matchWithSep[2].padStart(4, '0')}`;
  }

  // 3. Nếu là số thuần hoặc chuỗi chứa số: chỉ giữ lại các chữ số
  const onlyDigits = str.replace(/\D/g, '');
  if (!onlyDigits) return '';
  if (onlyDigits.length >= 5) return onlyDigits;
  if (onlyDigits.length >= 2 && onlyDigits.length < 5) {
    return `${onlyDigits[0]}${onlyDigits.slice(1).padStart(4, '0')}`;
  }
  return onlyDigits;
}

function cleanOcrCell(val, colKey) {
  if (val === null || val === undefined) return colKey === 'donViTinh' ? 'pcs' : '';
  let s = String(val).trim();
  if (!s || s === '???') return colKey === 'donViTinh' ? 'pcs' : '';

  // 1. Loại bỏ các tiền tố nhãn thông thường do AI sinh ra (Tên:, Mã hàng:, Cột B:...)
  s = s.replace(/^(?:Tên\s*(?:hàng|mã|sản\s*phẩm)?|Mã\s*(?:hàng)?|Cột\s*[A-Z]|Item)\s*[:：\-]\s*/i, '');

  // 2. Loại bỏ các hậu tố ghi chú như (same), (như trên), (trùng)
  s = s.replace(/\s*\((?:same|như trên|trùng|giống trên|tương tự)\)\s*$/i, '');

  // 3. Phát hiện suy luận nháp / so sánh lựa chọn của AI (ví dụ: "A" or "B"? It looks "B".)
  if (/(?:maybe|actually|let's read|let's see|in column|it might be|handwritten|looks like|wait column|we have|the table shows|could be|probably|seems to be|not sure|i think|first row|second row|\bor\b|\?|it looks|分析|猜测|可能是|我认为)/i.test(s)) {
    const quotes = [...s.matchAll(/"([^"]+)"/g)].map(m => m[1].trim());
    if (quotes.length > 0) {
      s = quotes[quotes.length - 1]; // Lấy chuỗi chốt cuối cùng
    } else {
      s = s.replace(/(?:maybe|actually|let's see|let's read|in column|it might be|handwritten|looks like|wait column|we have|the table shows|could be|probably|seems to be|not sure|i think|first row|second row|\bor\b|\?|it looks|分析|猜测|可能是|我认为)[\s\S]*/i, '').trim();
    }
  }

  // 4. Bỏ ngoặc kép bao quanh nếu còn sót lại
  s = s.replace(/^["'`]+|["'`]+$/g, '').trim();

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
    if (dvt) {
      return dvt[0].toLowerCase() === 'pcs' ? 'pcs' : dvt[0];
    }
    return s || 'pcs';
  }
  if (colKey === 'soPallet') {
    s = s.replace(/["'?]/g, '').trim();
    s = s.replace(/(?:ghi chú|actually|maybe)[\s\S]*/i, '').trim();
  }
  return s.replace(/^[:\s\-]+/, '').replace(/[:\s\-]+$/, '');
}

function parseOcrResultToItems(resultData, selectedColumns) {
  let rawList = [];
  if (Array.isArray(resultData.rows)) {
    rawList = resultData.rows.map((row) => {
      const obj = {};
      if (Array.isArray(row)) {
        selectedColumns.forEach((colKey, idx) => { obj[colKey] = row[idx] ?? ''; });
      } else if (typeof row === 'object' && row !== null) {
        selectedColumns.forEach((colKey) => { obj[colKey] = row[colKey] ?? ''; });
      }
      return obj;
    });
  } else if (Array.isArray(resultData.items)) {
    rawList = resultData.items;
  }

  const formatted = rawList.map((item) => {
    const out = {};
    selectedColumns.forEach((k) => {
      out[k] = cleanOcrCell(item?.[k], k);
      if (k === 'donViTinh' && !out[k]) out[k] = 'pcs';
    });
    return out;
  });

  const merged = [];
  for (let i = 0; i < formatted.length; i++) {
    const cur = formatted[i];
    const hasQty = !!(cur.soLuongChungTu || cur.soLuongThucNhap);
    const hasOspo = !!cur.soOSPO;
    const hasPallet = !!cur.soPallet;
    const hasData = hasQty || hasOspo || hasPallet;

    if (!hasData && cur.ten && cur.ten.trim()) {
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        prev.ten = (prev.ten ? prev.ten + ' ' : '') + cur.ten.trim();
        continue;
      } else if (i + 1 < formatted.length) {
        const next = formatted[i + 1];
        next.ten = cur.ten.trim() + (next.ten ? ' ' + next.ten : '');
        continue;
      }
    }
    merged.push(cur);
  }
  return merged;
}

function robustParseOcrJson(rawText, selectedColumns = DEFAULT_COLUMNS) {
  if (!rawText || typeof rawText !== 'string') return { soPhieu: '', items: [] };
  let text = rawText.trim();

  // Loại bỏ tag <think>...</think> nếu có từ reasoning models
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const toFormatted = (parsed) => {
    if (parsed && parsed.soPhieu) {
      let sp = String(parsed.soPhieu).trim();
      if (/^(?:phi|phiếu|so|số)$/i.test(sp)) sp = '';
      if (/maybe|actually|let's/i.test(sp)) {
        const q = sp.match(/"([^"]+)"/);
        if (q) sp = q[1].trim();
      }
      sp = sp.replace(/^["'`]+|["'`]+$/g, '').trim();
      parsed.soPhieu = sp;
    }

    const filterValidRow = (item) => {
      const ten = item.ten || '';
      // Lọc bỏ dòng reasoning dump rác chứa nhiều mã hoặc bóc nháp B: "..." C: "..." SL:
      if (ten.length > 70 && (ten.includes('B:') || ten.includes('C:') || ten.includes('SL:'))) return false;
      if (/(?:DO2[A-Z0-9.\-]+(?:\s+|$)){4,}/i.test(ten)) return false;
      return true;
    };

    if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
      parsed.items = parsed.rows
        .filter((r) => Array.isArray(r) || (typeof r === 'object' && r !== null))
        .map((row) => {
          if (typeof row === 'object' && !Array.isArray(row)) {
            const cleaned = {};
            selectedColumns.forEach((colKey) => {
              cleaned[colKey] = cleanOcrCell(row[colKey], colKey);
              if (colKey === 'donViTinh' && !cleaned[colKey]) cleaned[colKey] = 'pcs';
            });
            return cleaned;
          }
          const obj = {};
          selectedColumns.forEach((colKey, idx) => {
            obj[colKey] = cleanOcrCell(row[idx], colKey);
            if (colKey === 'donViTinh' && !obj[colKey]) obj[colKey] = 'pcs';
          });
          return obj;
        })
        .filter(filterValidRow);
    } else if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items
        .map((item) => {
          const cleaned = {};
          selectedColumns.forEach((colKey) => {
            cleaned[colKey] = cleanOcrCell(item[colKey], colKey);
            if (colKey === 'donViTinh' && !cleaned[colKey]) cleaned[colKey] = 'pcs';
          });
          return cleaned;
        })
        .filter(filterValidRow);
    }
    return parsed;
  };

  try {
    const p = JSON.parse(text);
    if (p && (Array.isArray(p.rows) || Array.isArray(p.items))) return toFormatted(p);
  } catch (e1) {}

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      const p = JSON.parse(candidate);
      if (p && (Array.isArray(p.rows) || Array.isArray(p.items))) return toFormatted(p);
    } catch (e2) {}

    try {
      const sanitized = candidate
        .replace(/[\u0000-\u001F]+/g, (match) => (match.includes('\n') ? ' ' : ''))
        .replace(/,\s*([\]}])/g, '$1');
      const p = JSON.parse(sanitized);
      if (p && (Array.isArray(p.rows) || Array.isArray(p.items))) return toFormatted(p);
    } catch (e3) {}
  }

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

  let detectedSoPhieu = '';
  const spMatch = text.match(/"soPhieu"\s*:\s*"([^"]*)"/i);
  if (spMatch) {
    let sp = spMatch[1].trim();
    if (/^(?:phi|phiếu|so|số)$/i.test(sp)) sp = '';
    if (/maybe|actually|let's/i.test(sp)) {
      const q = sp.match(/"([^"]+)"/);
      if (q) sp = q[1].trim();
    }
    sp = sp.replace(/^["'`]+|["'`]+$/g, '').trim();
    detectedSoPhieu = sp;
  } else {
    const spFallback = text.match(/(?:Số\s*phiếu|Mã\s*phiếu|Số\s*chứng\s*từ|Số\s*XKP|No\.?)[:\s]+([A-Za-z0-9_\-\/]{3,})/i);
    if (spFallback && !/^(?:phi|phiếu|so|số)$/i.test(spFallback[1].trim())) {
      detectedSoPhieu = spFallback[1].trim();
    }
  }

  const rows = [];
  const rowRegex = /\[\s*((?:"(?:\\.|[^"\\])*"|[^,\]]*?)(?:\s*,\s*(?:"(?:\\.|[^"\\])*"|[^,\]]*?))*)\s*\]/g;
  let match;
  while ((match = rowRegex.exec(text)) !== null) {
    const inside = match[0];
    try {
      const parsedRow = JSON.parse(inside);
      if (Array.isArray(parsedRow) && parsedRow.length >= 2) rows.push(parsedRow);
    } catch {
      const cells = [];
      const cellRegex = /"((?:\\.|[^"\\])*)"/g;
      let cMatch;
      while ((cMatch = cellRegex.exec(inside)) !== null) cells.push(cMatch[1]);
      if (cells.length >= 2) rows.push(cells);
    }
  }

  if (rows.length > 0) return toFormatted({ soPhieu: detectedSoPhieu, rows });
  return { soPhieu: detectedSoPhieu, items: [{ ten: cleanOcrCell(text, 'ten') }] };
}

async function scanWithOpenRouter(base64Data, mimeType, key, model, selectedColumns, fieldPrompts) {
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
    '4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp (ví dụ dòng trên ghi tên loại sản phẩm như "PE SHOE BOX (ECO)", dòng dưới ghi kích thước/quy cách mã như "290*180*110mm MK-A-1", hoặc dòng trên là mã và dòng dưới là quy cách) nhưng chỉ có chung 1 bộ số lượng, 1 STT hoặc 1 mã OS/PO thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất (nối tên thành 1 chuỗi hoàn chỉnh). Tuyệt đối không tách thành 2 dòng riêng biệt nếu dòng kia không có số lượng thực tế.\n' +
    'Hướng dẫn cột:\n' + rules + '\n\n' +
    'ĐỊNH DẠNG TRẢ VỀ:\n' +
    'Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [' + colListStr + ']):\n' +
    '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}';

  const selectedModel = model || 'nex-agi/nex-n2.5-pro:free';
  const reqBody = {
    model: selectedModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64Data } }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 3000,
  };

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
      'HTTP-Referer': 'https://scanzzz.vercel.app',
      'X-Title': 'Scan Pro Max Telegram Bot'
    },
    body: JSON.stringify(reqBody)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || ('OpenRouter Error: ' + res.status));
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  let text = (msg?.content || '').trim();
  if (!text && msg?.reasoning) text = msg.reasoning.trim();
  if (!text) throw new Error('Không nhận được dữ liệu từ OpenRouter');

  return robustParseOcrJson(text, selectedColumns);
}
const RETRY_TASKS = new Map();

async function deleteTelegramMessage(chatId, messageId) {
  try {
    if (!chatId || !messageId) return;
    await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });
  } catch (e) {}
}

function getActiveProviderInfo(cfg) {
  const provider = (cfg.aiProvider || 'gemini').toLowerCase().trim();
  if (provider === 'gemini') {
    const keys = getGeminiKeys(cfg);
    return {
      provider: 'gemini',
      providerName: 'Google Gemini',
      model: cfg.geminiModel || 'gemini-3.6-flash',
      key: keys[0] || cfg.geminiKey,
      allKeys: keys,
      keyCount: keys.length,
      nextKeyIndex: keys.length > 0 ? (botGeminiKeyIndex % keys.length) : 0,
      keyHint: 'Google Gemini API Key (`AIzaSy...`)'
    };
  } else if (provider === 'bai') {
    return {
      provider: 'bai',
      providerName: 'B.AI',
      model: cfg.baiModel || 'DeepSeek-V4.1-Flash',
      key: cfg.baiKey,
      keyHint: 'B.AI API Key'
    };
  } else if (provider === 'kira') {
    return {
      provider: 'kira',
      providerName: 'Kira AI',
      model: cfg.kiraModel || 'qwen3.8-27b-free',
      key: cfg.kiraKey,
      keyHint: 'Kira AI API Key (`kira_...`)'
    };
  } else {
    return {
      provider: 'openrouter',
      providerName: 'OpenRouter',
      model: cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free',
      key: cfg.openRouterKey,
      keyHint: 'OpenRouter API Key (`sk-or-...`)'
    };
  }
}

async function scanWithBai(base64Data, mimeType, key, model, selectedColumns, fieldPrompts) {
  const effectiveModel = String(model || 'qwen3.8-flash').toLowerCase().trim();

  const payloadBase64 = base64Data;
  const payloadMime = mimeType || 'image/jpeg';

  const colListStr = selectedColumns.map((k, i) => (i + 1) + '.' + (COLUMN_DEFS[k]?.short || k)).join(', ');
  const rules = ['soPhieu', ...selectedColumns]
    .map((k) => '- ' + (k === 'soPhieu' ? 'Số phiếu' : (COLUMN_DEFS[k]?.short || k)) + ': ' + (fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''))
    .join('\n');

  const promptText = 'Chuyên gia OCR phiếu kho Việt Nam (đọc chuẩn chữ in & chữ viết tay).\n' +
    'YÊU CẦU BẮT BUỘC:\n' +
    '- XUẤT KẾT QUẢ JSON NGAY DÒNG ĐẦU TIÊN. Tuyệt đối không suy luận dài dòng, không giải thích bên ngoài JSON.\n' +
    '- Định dạng trả về duy nhất là chuỗi JSON:\n' +
    '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}\n\n' +
    'Quy tắc trích xuất quan trọng:\n' +
    '1. Đọc chuẩn chữ viết tay tiếng Việt, số viết tay (phân biệt 0/O, 1/7, 2/Z, 5/S, 8/B).\n' +
    '2. Ưu tiên giá trị viết tay sửa đè. Bỏ qua dòng tổng cộng.\n' +
    '3. Ô không có dữ liệu để chuỗi rỗng "" (tuyệt đối không ghi ???, không tự suy diễn).\n' +
    '4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp nhưng chỉ có chung 1 bộ số lượng thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất.\n' +
    'Hướng dẫn cột:\n' + rules + '\n\n' +
    'ĐỊNH DẠNG TRẢ VỀ: Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [' + colListStr + ']):\n' +
    '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}';

  const reqPayload = {
    model: effectiveModel,
    messages: [
      {
        role: 'system',
        content: 'You are an expert OCR assistant for Vietnamese warehouse delivery notes and invoices. You MUST output ONLY valid, raw JSON. Do NOT output any internal monologue, thinking process, preamble, or markdown code fences.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: `data:${payloadMime};base64,${payloadBase64}` } }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 6000
  };

  // B.AI hỗ trợ JSON mode cho tất cả các model bao gồm cả Qwen, DeepSeek, GLM
  reqPayload.response_format = { type: 'json_object' };

  const sendRequest = async (payload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);
    try {
      return await fetch('https://api.b.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let res;
  let activePayload = { ...reqPayload };
  const retryableStatuses = [429, 500, 502, 503, 504];

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      res = await sendRequest(activePayload);
      if (res.ok) break;

      if (retryableStatuses.includes(res.status) && attempt < 2) {
        console.warn(`[Bot B.AI] Model ${activePayload.model} bị lỗi ${res.status}, thử lại lần ${attempt + 1}...`);
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        // Nếu model chính lỗi và không phải qwen3.8-27b, thử fallback sang qwen3.8-27b
        if (attempt === 1 && !activePayload.model.includes('qwen3.8-27b')) {
          activePayload.model = 'qwen3.8-27b';
          console.warn(`[Bot B.AI] Chuyển hướng dự phòng sang model qwen3.8-27b...`);
        }
        continue;
      }
      break;
    } catch (reqErr) {
      if (attempt < 2) {
        console.warn(`[Bot B.AI] Lỗi mạng (${reqErr.message}), thử lại lần ${attempt + 1}...`);
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw reqErr;
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    let errMsg = `B.AI (${effectiveModel}) Error: ${res.status}`;
    if (errData.error?.message) errMsg += ` - ${errData.error.message}`;
    throw new Error(errMsg);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  let text = (msg?.content || '').trim();
  if (!text && msg?.reasoning_content) {
    text = msg.reasoning_content.trim();
  }
  if (!text) throw new Error('Không nhận được dữ liệu từ B.AI');

  // Lọc bỏ tag <think>...</think> nếu có
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  return robustParseOcrJson(text, selectedColumns);
}

async function scanWithKira(base64Data, mimeType, key, model, selectedColumns, fieldPrompts) {
  const effectiveModel = (model || 'qwen3.8-27b-free').trim();
  const isFree = effectiveModel.includes('-free') || effectiveModel.startsWith('kira-');

  // Kira AI payload limit: auto-compress with mupdf if larger than 90KB base64
  let payloadBase64 = base64Data;
  let payloadMime = mimeType;
  if (base64Data && base64Data.length > 90000) {
    try {
      const mupdf = await getMupdf();
      const rawBuf = Buffer.from(base64Data, 'base64');
      const doc = mupdf.Document.openDocument(rawBuf, mimeType.startsWith('image/') ? mimeType : 'image/jpeg');
      const page = doc.loadPage(0);
      const bounds = page.getBounds();
      const maxDim = Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]);
      const scale = maxDim > 800 ? (800 / maxDim) : 0.7;
      const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB);
      const pngBuf = Buffer.from(pixmap.asPNG());
      if (pngBuf.length < rawBuf.length) {
        payloadBase64 = pngBuf.toString('base64');
        payloadMime = 'image/png';
        console.log(`[Bot Kira AI] Đã tối ưu kích thước ảnh từ ${rawBuf.length}b -> ${pngBuf.length}b cho model ${effectiveModel}`);
      }
    } catch (compressErr) {
      console.warn('[Bot Kira AI] Không thể nén ảnh bằng mupdf:', compressErr.message);
    }
  }

  const colListStr = selectedColumns.map((k, i) => (i + 1) + '.' + (COLUMN_DEFS[k]?.short || k)).join(', ');
  const rules = ['soPhieu', ...selectedColumns]
    .map((k) => '- ' + (k === 'soPhieu' ? 'Số phiếu' : (COLUMN_DEFS[k]?.short || k)) + ': ' + (fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''))
    .join('\n');

  const promptText = 'Chuyên gia OCR phiếu kho Việt Nam (chữ in & viết tay).\n' +
    'Quy tắc trích xuất quan trọng:\n' +
    '1. Đọc chuẩn chữ viết tay tiếng Việt, số viết tay (phân biệt 0/O, 1/7, 2/Z, 5/S, 8/B).\n' +
    '2. Ưu tiên giá trị viết tay sửa đè. Bỏ qua dòng tổng cộng.\n' +
    '3. Ô không có dữ liệu để chuỗi rỗng "" (tuyệt đối không ghi ???, không tự suy diễn).\n' +
    '4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp (ví dụ dòng trên ghi tên loại sản phẩm như "PE SHOE BOX (ECO)", dòng dưới ghi kích thước/quy cách mã như "290*180*110mm MK-A-1", hoặc dòng trên là mã và dòng dưới là quy cách) nhưng chỉ có chung 1 bộ số lượng, 1 STT hoặc 1 mã OS/PO thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất (nối tên thành 1 chuỗi hoàn chỉnh). Tuyệt đối không tách thành 2 dòng riêng biệt nếu dòng kia không có số lượng thực tế.\n' +
    'Hướng dẫn cột:\n' + rules + '\n\n' +
    'ĐỊNH DẠNG TRẢ VỀ:\n' +
    'Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [' + colListStr + ']):\n' +
    '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}';

  const sendRequest = async () => {
    const reqBody = {
      model: effectiveModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: 'data:' + payloadMime + ';base64,' + payloadBase64 } }
          ]
        }
      ],
      temperature: 0.1
    };
    if (isFree) {
      reqBody.max_tokens = 650;
      if (!effectiveModel.includes('qwen')) {
        reqBody.response_format = { type: 'json_object' };
      }
    } else {
      reqBody.response_format = { type: 'json_object' };
    }

    return await fetch('https://kiraai.vn/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reqBody)
    });
  };

  let res = await sendRequest();

  // If rate limit / 502 occurs on free tier, wait 2.5s and retry once with same model
  if ((res.status === 502 || res.status === 500 || res.status === 429) && isFree) {
    console.warn(`[Bot Kira AI] Model ${effectiveModel} phản hồi ${res.status}, chờ 2.5s rồi thử lại...`);
    await new Promise(r => setTimeout(r, 2500));
    res = await sendRequest();
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    let errMsg = `Kira AI (${effectiveModel}) Error: ${res.status}`;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.error?.message) errMsg = errJson.error.message;
    } catch {
      if (res.status === 502) {
        errMsg = `Mô hình [${effectiveModel}] đang tạm thời quá tải hoặc ảnh gửi quá nhanh (502 Bad Gateway). Vui lòng bấm [Thử lại 🔄] sau vài giây hoặc đổi mô hình /model qwen3.8-27b-free.`;
      }
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Không nhận được dữ liệu từ Kira AI');

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
      parsed.items = parsed.rows.map((row) => {
        const obj = {};
        if (Array.isArray(row)) {
          selectedColumns.forEach((colKey, idx) => { obj[colKey] = row[idx] ?? ''; });
        }
        return obj;
      });
    }
    return parsed;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
        parsed.items = parsed.rows.map((row) => {
          const obj = {};
          if (Array.isArray(row)) {
            selectedColumns.forEach((colKey, idx) => { obj[colKey] = row[idx] ?? ''; });
          }
          return obj;
        });
      }
      return parsed;
    }
    throw new Error('Dữ liệu Kira AI trả về không đúng định dạng JSON');
  }
}

async function scanWithGemini(base64Data, mimeType, key, selectedColumns, fieldPrompts, modelName = 'gemini-3.6-flash') {
  const colListStr = selectedColumns.map((k, i) => (i + 1) + '.' + (COLUMN_DEFS[k]?.short || k)).join(', ');
  const rules = ['soPhieu', ...selectedColumns]
    .map((k) => '- ' + (k === 'soPhieu' ? 'Số phiếu' : (COLUMN_DEFS[k]?.short || k)) + ': ' + (fieldPrompts[k] || DEFAULT_FIELD_PROMPTS[k] || ''))
    .join('\n');

  const promptText = 'Chuyên gia OCR phiếu kho Việt Nam (đọc chuẩn chữ in & chữ viết tay).\n' +
    'Quy tắc trích xuất quan trọng:\n' +
    '1. Đọc chuẩn chữ viết tay tiếng Việt, số viết tay (phân biệt 0/O, 1/7, 2/Z, 5/S, 8/B).\n' +
    '2. Ưu tiên giá trị viết tay sửa đè. Bỏ qua dòng tổng cộng.\n' +
    '3. Ô không có dữ liệu để chuỗi rỗng "" (tuyệt đối không ghi ???, không tự suy diễn).\n' +
    '4. XỬ LÝ MẶT HÀNG 2 DÒNG: Trong phiếu kho, nếu một mặt hàng chiếm 2 dòng liên tiếp (ví dụ dòng trên ghi tên loại sản phẩm như "PE SHOE BOX (ECO)", dòng dưới ghi kích thước/quy cách mã như "290*180*110mm MK-A-1", hoặc dòng trên là mã và dòng dưới là quy cách) nhưng chỉ có chung 1 bộ số lượng, 1 STT hoặc 1 mã OS/PO thì PHẢI GỘP chúng thành 1 dòng hàng duy nhất (nối tên thành 1 chuỗi hoàn chỉnh). Tuyệt đối không tách thành 2 dòng riêng biệt nếu dòng kia không có số lượng thực tế.\n' +
    'Hướng dẫn cột:\n' + rules + '\n\n' +
    'ĐỊNH DẠNG TRẢ VỀ:\n' +
    'Trả về đúng JSON thuần với mảng "rows" (mỗi dòng là 1 mảng giá trị theo đúng thứ tự: [' + colListStr + ']):\n' +
    '{"soPhieu":"số phiếu","rows":[["giá trị 1","giá trị 2",...]]}';

  const body = {
    contents: [
      {
        parts: [
          { text: promptText },
          { inline_data: { mime_type: mimeType, data: base64Data } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 16384,
      topP: 0.95,
      responseMimeType: 'application/json'
    }
  };

  const actualModel = (modelName || 'gemini-3.6-flash').trim();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(actualModel)}:generateContent?key=${encodeURIComponent(key.trim())}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || ('Gemini Error: ' + res.status));
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Không nhận được dữ liệu từ Gemini');

  return robustParseOcrJson(text, selectedColumns);
}

async function performOcr(cfg, base64Data, mimeType) {
  const provider = (cfg.aiProvider || 'gemini').toLowerCase().trim();
  const selectedColumns = cfg.selectedColumns || DEFAULT_COLUMNS;
  const fieldPrompts = cfg.fieldPrompts || DEFAULT_FIELD_PROMPTS;

  if (provider === 'gemini') {
    const allKeys = getGeminiKeys(cfg);
    if (allKeys.length === 0) {
      throw new Error('Chưa có Google Gemini API Key! Gõ /akey AIzaSy... hoặc đồng bộ /async <Mã>');
    }
    const model = cfg.geminiModel || 'gemini-3.6-flash';
    const startIndex = allKeys.length > 0 ? (botGeminiKeyIndex % allKeys.length) : 0;
    const orderedKeys = allKeys.length > 1
      ? [...allKeys.slice(startIndex), ...allKeys.slice(0, startIndex)]
      : allKeys;

    let lastError = null;
    let successfulKeyIndex = -1;
    let ocrRaw = null;

    for (let i = 0; i < orderedKeys.length; i++) {
      const currentKey = orderedKeys[i];
      const actualKeyIdx = allKeys.indexOf(currentKey);
      try {
        console.log(`[Gemini Bot] Đang quét phiếu bằng key #${actualKeyIdx + 1}/${allKeys.length} (${currentKey.slice(0, 8)}...${currentKey.slice(-4)}) - Model: ${model}`);
        ocrRaw = await scanWithGemini(base64Data, mimeType, currentKey, selectedColumns, fieldPrompts, model);
        successfulKeyIndex = actualKeyIdx;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini Bot] Lỗi với key #${actualKeyIdx + 1}/${allKeys.length}: ${err.message}`);
        if (i < orderedKeys.length - 1) {
          console.log(`[Gemini Bot] Chuyển sang key dự phòng tiếp theo trong dàn luân chuyển...`);
          continue;
        }
      }
    }

    if (!ocrRaw) {
      throw lastError || new Error('Không thể kết nối đến Google Gemini với tất cả các key hiện có.');
    }

    // Sau khi xử lý xong 1 phiếu thành công, luân chuyển sang key kế tiếp cho phiếu sau
    botGeminiKeyIndex = (successfulKeyIndex + 1) % allKeys.length;
    const modelUsed = allKeys.length > 1
      ? `Gemini (${model} • Key #${successfulKeyIndex + 1}/${allKeys.length})`
      : `Gemini (${model})`;

    return { ocrRaw, modelUsed };
  } else if (provider === 'bai') {
    if (!cfg.baiKey) {
      throw new Error('Chưa có B.AI API Key! Gõ /key <Key> hoặc đồng bộ /sync <Mã>');
    }
    const model = String(cfg.baiModel || 'deepseek-v4.1-flash').toLowerCase().trim();
    const ocrRaw = await scanWithBai(base64Data, mimeType, cfg.baiKey, model, selectedColumns, fieldPrompts);
    return { ocrRaw, modelUsed: `B.AI (${model})` };
  } else if (provider === 'kira') {
    if (!cfg.kiraKey) {
      throw new Error('Chưa có Kira AI API Key! Gõ /key kira_... hoặc đồng bộ /sync <Mã>');
    }
    const model = cfg.kiraModel || 'qwen3.8-27b-free';
    const ocrRaw = await scanWithKira(base64Data, mimeType, cfg.kiraKey, model, selectedColumns, fieldPrompts);
    return { ocrRaw, modelUsed: `Kira AI (${model})` };
  } else {
    if (!cfg.openRouterKey) {
      throw new Error('Chưa có OpenRouter API Key! Gõ /key sk-or... hoặc đồng bộ /sync <Mã>');
    }
    const model = cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free';
    const ocrRaw = await scanWithOpenRouter(base64Data, mimeType, cfg.openRouterKey, model, selectedColumns, fieldPrompts);
    return { ocrRaw, modelUsed: `OpenRouter (${model})` };
  }
}

function partitionItemsIntoSlipGroups(itemsList, defaultSoPhieu, defaultPageNum) {
  if (!itemsList || !itemsList.length) return [];
  const groups = [];
  let currentGroup = [];
  let lastGroupKey = null;

  for (let i = 0; i < itemsList.length; i++) {
    const item = itemsList[i];
    const itemSp = (item.soPhieu || defaultSoPhieu || '').trim();
    const itemPage = item._pageNum !== undefined && item._pageNum !== null ? item._pageNum : (defaultPageNum || 1);
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
}

async function syncToGoogleSheet(sheetUrl, soPhieu, items) {
  if (!sheetUrl || !sheetUrl.startsWith('https://script.google.com/')) {
    return { success: false, message: 'Chưa cấu hình Link Google Sheet Webhook' };
  }
  if (!items || !items.length) {
    return { success: false, message: 'Chưa có dòng hàng nào để lưu' };
  }

  const groups = partitionItemsIntoSlipGroups(items, soPhieu, 1);
  if (!groups.length) {
    return { success: false, message: 'Không tìm thấy dòng hàng hợp lệ để lưu' };
  }

  // Chuẩn bị toàn bộ danh sách dòng hàng với số phiếu và số trang cho từng dòng
  const allItems = [];
  groups.forEach((grp, idx) => {
    const grpSp = grp.soPhieu || soPhieu || '';
    const grpPage = grp.pageNum || (idx + 1);
    grp.items.forEach(item => {
      allItems.push({
        ...item,
        donViTinh: item.donViTinh || 'pcs',
        soPhieu: item.soPhieu || grpSp,
        _pageNum: item._pageNum || grpPage
      });
    });
  });

  const CHUNK_SIZE = 150;
  const chunks = [];
  for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
    chunks.push(allItems.slice(i, i + CHUNK_SIZE));
  }

  let totalSaved = 0;

  for (let c = 0; c < chunks.length; c++) {
    const chunkItems = chunks[c];
    const payload = {
      soPhieu: chunkItems[0]?.soPhieu || soPhieu || '',
      pageNum: chunkItems[0]?._pageNum || 1,
      items: chunkItems
    };

    let chunkSuccess = false;
    let lastErrMessage = '';

    // Thử lại tối đa 3 lần với backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(sheetUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const resText = await res.text();
        let isOk = res.ok;
        try {
          const data = JSON.parse(resText);
          if (data.status === 'success' || res.ok) {
            chunkSuccess = true;
            totalSaved += chunkItems.length;
            break;
          } else {
            lastErrMessage = data.message || `Lỗi Apps Script: ${resText.slice(0, 80)}`;
          }
        } catch {
          if (res.ok) {
            chunkSuccess = true;
            totalSaved += chunkItems.length;
            break;
          } else {
            lastErrMessage = `HTTP ${res.status}: ${resText.slice(0, 80)}`;
          }
        }
      } catch (err) {
        lastErrMessage = err.message;
      }

      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    if (!chunkSuccess) {
      return {
        success: false,
        message: `Lỗi khi lưu đợt ${c + 1}/${chunks.length}: ${lastErrMessage}`
      };
    }

    if (c < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  return {
    success: true,
    message: `Đã lưu thành công ${totalSaved} dòng (${groups.length} phiếu/trang) vào Google Sheet!`
  };
}

async function baseSendTelegram(method, body) {
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.ok && body && body.parse_mode && data.description && data.description.includes("can't parse entities")) {
      console.warn(`[sendTelegram] Lỗi Markdown (${data.description}), Akko tự động chuyển sang gửi văn bản thuần...`);
      const fallbackBody = { ...body };
      delete fallbackBody.parse_mode;
      const fallbackRes = await fetch(`${TELEGRAM_API}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody)
      });
      return await fallbackRes.json();
    }
    if (!data.ok) {
      console.error(`[sendTelegram error] ${method}:`, data);
    }
    return data;
  } catch (err) {
    console.error(`[sendTelegram network error] ${method}:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function sendTelegram(method, body) {
  return baseSendTelegram(method, body);
}

function buildSummaryText(soPhieu, items, model, sheetStatusText, historyId) {
  let summaryText = `📋 *BÁO CÁO PHIẾU XUẤT KHO CHO SENPAI NÈ!* 🌸✨\n`;
  summaryText += `• *Số phiếu:* \`${soPhieu || 'Không rõ'}\`\n`;
  summaryText += `• *Số mặt hàng:* ` + items.length + ` dòng\n`;
  summaryText += `• *Phép thuật AI:* \`${model}\`\n`;
  if (sheetStatusText) summaryText += `• *Google Sheet:* ` + sheetStatusText + `\n`;
  summaryText += '\n📝 *Danh sách chi tiết Akko đọc được đây ạ:*\n';

  items.forEach((it, idx) => {
    let line = `${idx + 1}. *${sanitizeForMd(it.ten) || '---'}*`;
    if (it.soOSPO) line += ` | PO: ${sanitizeForMd(it.soOSPO)}`;
    const qty = it.soLuongChungTu || it.soLuongThucNhap;
    if (qty) line += ` | SL: ${qty}`;
    const dvt = it.donViTinh || 'pcs';
    line += ` ${sanitizeForMd(dvt)}`;
    if (it.soPallet) line += ` | Pallet: ${sanitizeForMd(it.soPallet)}`;
    if (it.ghiChu) line += ` (${sanitizeForMd(it.ghiChu)})`;
    summaryText += line + '\n';
  });

  return summaryText;
}

async function processDocument(chatId, doc, existingWaitMsgId = null, originalUserMsgId = null, messageThreadId = null) {
  const sendTelegram = (method, body) => {
    const payload = { ...body };
    if (messageThreadId && !payload.message_thread_id && (method === 'sendMessage' || method === 'sendPhoto' || method === 'sendDocument')) {
      payload.message_thread_id = messageThreadId;
    }
    return baseSendTelegram(method, payload);
  };

  const cfg = getBotConfig();
  const info = getActiveProviderInfo(cfg);

  if (!info.key) {
    if (originalUserMsgId) await deleteTelegramMessage(chatId, originalUserMsgId);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `⚠️ Huhu Senpai ơi, Akko chưa có ${info.keyHint} để đọc tài liệu rùi! Senpai nạp key bằng lệnh \`/key <Key>\` hoặc kéo cấu hình bằng \`/sync <Mã>\` cho Akko với nha~ (｡•́︿•̀｡)`,
      parse_mode: 'Markdown'
    });
  }

  const fileName = (doc.file_name || '').toLowerCase();
  const mimeType = (doc.mime_type || '').toLowerCase();
  const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf');
  const isImage = mimeType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');

  if (!isPdf && !isImage) {
    if (originalUserMsgId) await deleteTelegramMessage(chatId, originalUserMsgId);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '⚠️ Ái chà chà! Senpai ơi, Akko chỉ nhận file ảnh (JPG, PNG, WebP) hoặc file tài liệu PDF (.pdf) thôi á! Gửi lại cho Akko nha~ (*/ω＼*)'
    });
  }

  let waitMsgId = existingWaitMsgId;
  const loadingText = isPdf
    ? `📥 Akko nhận được file PDF của Senpai rồi nè! Đang giải mã các trang bằng ${info.providerName}, đợi Akko xíu nha~ 🪄✨`
    : `📥 Akko nhận được ảnh của Senpai rồi nè! Đang phân tích bằng ${info.providerName}, Senpai đợi một xíu xiu nha~ 🪄✨`;

  if (waitMsgId) {
    await sendTelegram('editMessageText', {
      chat_id: chatId,
      message_id: waitMsgId,
      text: loadingText
    });
  } else {
    const waitMsg = await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: loadingText
    });
    waitMsgId = waitMsg.result?.message_id;
  }

  try {
    const fileInfo = await sendTelegram('getFile', { file_id: doc.file_id });
    const filePath = fileInfo.result?.file_path;
    if (!filePath) throw new Error('Không lấy được đường dẫn file từ Telegram');

    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isPdf) {
      const mupdf = await getMupdf();
      let pdfDoc;
      try {
        pdfDoc = mupdf.Document.openDocument(buffer, 'application/pdf');
      } catch (err) {
        throw new Error('Không thể đọc file PDF này (file có thể bị hỏng hoặc có mật khẩu)');
      }

      const totalPages = pdfDoc.countPages();
      if (totalPages === 0) throw new Error('File PDF không có trang nào');

      if (waitMsgId) {
        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: `📄 Oa! File PDF của Senpai có tận *${totalPages} trang* lận! Akko bắt đầu quét bằng phép thuật \`${info.model}\` (${info.providerName}) đây ạ~ ٩(◕‿◕｡)۶`,
          parse_mode: 'Markdown'
        });
      }

      const pageResults = [];

      for (let p = 0; p < totalPages; p++) {
        if (waitMsgId) {
          await sendTelegram('editMessageText', {
            chat_id: chatId,
            message_id: waitMsgId,
            text: `⏳ Akko đang chăm chỉ đọc trang *${p + 1}/${totalPages}* bằng mô hình \`${info.model}\` nè Senpai... 🌸`,
            parse_mode: 'Markdown'
          });
        }

        const page = pdfDoc.loadPage(p);
        const bounds = page.getBounds();
        const width = Math.max(1, bounds[2] - bounds[0]);
        const height = Math.max(1, bounds[3] - bounds[1]);
        const maxDim = Math.max(width, height);
        const scale = maxDim > 0 ? Math.min(2.0, 2000 / maxDim) : 1.5;

        const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB);
        const pngBuf = pixmap.asPNG();
        const pageBase64 = Buffer.from(pngBuf).toString('base64');

        try {
          const { ocrRaw: pageOcr } = await performOcr(cfg, pageBase64, 'image/png');
          const pageItems = parseOcrResultToItems(pageOcr, cfg.selectedColumns || DEFAULT_COLUMNS);
          const pageSoPhieu = (pageOcr.soPhieu || '').trim();

          pageResults.push({
            pageNum: p + 1,
            soPhieu: pageSoPhieu,
            items: pageItems
          });
        } catch (pageErr) {
          console.error(`[PDF] Lỗi đọc trang ${p + 1}:`, pageErr.message);
          const retryPageId = `retry_pdfpage_${Date.now()}_${p + 1}`;
          RETRY_TASKS.set(retryPageId, {
            type: 'pdf_page',
            chatId,
            pageBase64,
            pageNum: p + 1,
            messageThreadId
          });
          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: `⚠️ Huhu Senpai ơi, Trang *${p + 1}/${totalPages}* bị lỗi: ${pageErr.message}\nSenpai có thể bấm nút dưới để Akko thử quét lại riêng trang này nha!`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: `🔄 Akko Thử Quét Lại Trang ${p + 1}`, callback_data: retryPageId }]
              ]
            }
          });
        }
      }

      // Nhóm các trang theo số phiếu riêng biệt
      const groups = [];
      for (const res of pageResults) {
        const sPhieu = res.soPhieu;
        if (sPhieu && groups.length > 0 && groups[groups.length - 1].soPhieu === sPhieu) {
          const currentGroup = groups[groups.length - 1];
          currentGroup.pages.push(res.pageNum);
          res.items.forEach(it => {
            if (totalPages > 1 && !it.ghiChu) it.ghiChu = `Trang ${res.pageNum}`;
            currentGroup.items.push(it);
          });
        } else {
          const fallbackSoPhieu = sPhieu || (totalPages > 1 ? `Trang ${res.pageNum}` : '');
          const initialItems = res.items.map(it => {
            const clone = { ...it };
            if (totalPages > 1 && !clone.ghiChu) clone.ghiChu = `Trang ${res.pageNum}`;
            return clone;
          });
          groups.push({
            soPhieu: fallbackSoPhieu,
            rawSoPhieu: sPhieu,
            pages: [res.pageNum],
            items: initialItems
          });
        }
      }

      if (waitMsgId) {
        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: `📊 Yatta~! Akko đã đọc xong ${groups.length} phiếu từ ${totalPages} trang rồi nè! Đang nhanh chóng lưu vào Google Sheet cho Senpai nha... 🚀✨`
        });
      }

      // Xử lý gửi kết quả và đồng bộ từng phiếu riêng biệt
      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const grp = groups[gIdx];
        const historyId = `scan_pdf_${Date.now()}_${gIdx}`;

        saveBotHistoryItem(historyId, {
          soPhieu: grp.rawSoPhieu || grp.soPhieu,
          items: grp.items,
          model: `${info.model} (${info.providerName})`
        });

        let sheetStatusText = '';
        if (cfg.autoSyncSheet && cfg.googleSheetUrl) {
          const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, grp.rawSoPhieu || grp.soPhieu, grp.items);
          sheetStatusText = sheetResult.success ? '✅ Đã lưu vào Google Sheet' : ('❌ Lỗi Sheet: ' + sheetResult.message);
        }

        const pageRangeStr = grp.pages.length === 1 ? `Trang ${grp.pages[0]}` : `Trang ${grp.pages.join(', ')}`;
        let summaryText = `📄 *PHIẾU ${gIdx + 1}/${groups.length} CHO SENPAI* (${pageRangeStr})\n`;
        summaryText += `• *Số phiếu:* \`${grp.soPhieu || 'Không rõ'}\`\n`;
        summaryText += `• *Số mặt hàng:* ` + grp.items.length + ` dòng\n`;
        summaryText += `• *Phép thuật AI:* \`${info.model}\` (${info.providerName})\n`;
        if (sheetStatusText) summaryText += `• *Google Sheet:* ` + sheetStatusText + `\n`;
        summaryText += '\n📝 *Danh sách chi tiết Akko đọc được đây ạ:*\n';

        grp.items.slice(0, 25).forEach((it, idx) => {
          let line = `${idx + 1}. *${sanitizeForMd(it.ten) || '---'}*`;
          if (it.soOSPO) line += ` | PO: ${sanitizeForMd(it.soOSPO)}`;
          const qty = it.soLuongChungTu || it.soLuongThucNhap;
          if (qty) line += ` | SL: ${qty}`;
          const dvt = it.donViTinh || 'pcs';
          line += ` ${sanitizeForMd(dvt)}`;
          if (it.soPallet) line += ` | Pallet: ${sanitizeForMd(it.soPallet)}`;
          if (it.ghiChu) line += ` (${sanitizeForMd(it.ghiChu)})`;
          summaryText += line + '\n';
        });

        if (grp.items.length > 25) {
          summaryText += `\n_...và ${grp.items.length - 25} mặt hàng khác (Akko đã lưu đầy đủ vào Google Sheet cho Senpai rùi nha)_ 🌸`;
        }

        const replyMarkup = {
          inline_keyboard: [
            [
              { text: `🔄 Akko Ơi, Đồng Bộ Lại Phiếu Này Nha! (${grp.soPhieu || ('Phiếu ' + (gIdx + 1))})`, callback_data: `resync_${historyId}` }
            ]
          ]
        };

        if (gIdx === 0 && waitMsgId) {
          await sendTelegram('editMessageText', {
            chat_id: chatId,
            message_id: waitMsgId,
            text: summaryText,
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
          });
        } else {
          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: summaryText,
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
          });
        }
      }
    } else {
      // Document is an image file
      const base64Data = buffer.toString('base64');
      const imgMime = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

      if (waitMsgId) {
        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: `⏳ Akko đang quét bằng mô hình \`${info.model}\` (${info.providerName}) nè Senpai... 🌸`,
          parse_mode: 'Markdown'
        });
      }

      const { ocrRaw } = await performOcr(cfg, base64Data, imgMime);

      const items = parseOcrResultToItems(ocrRaw, cfg.selectedColumns || DEFAULT_COLUMNS);
      const soPhieu = ocrRaw.soPhieu || '';
      const historyId = 'scan_' + Date.now();

      saveBotHistoryItem(historyId, {
        soPhieu,
        items,
        model: `${info.model} (${info.providerName})`
      });

      let sheetStatusText = '';
      if (cfg.autoSyncSheet && cfg.googleSheetUrl) {
        if (waitMsgId) {
          await sendTelegram('editMessageText', {
            chat_id: chatId,
            message_id: waitMsgId,
            text: '📊 Trích xuất xong rùi nè! Akko đang cất dữ liệu vào Google Sheet cho Senpai nha... ✨'
          });
        }
        const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, soPhieu, items);
        sheetStatusText = sheetResult.success ? '✅ Đã lưu vào Google Sheet' : ('❌ Lỗi Sheet: ' + sheetResult.message);
      }

      const summaryText = buildSummaryText(soPhieu, items, `${info.model} (${info.providerName})`, sheetStatusText, historyId);
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '🔄 Akko Gửi Lại Lên Sheet Nha!', callback_data: `resync_${historyId}` }
          ]
        ]
      };

      if (waitMsgId) {
        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: summaryText,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        });
      } else {
        await sendTelegram('sendMessage', {
          chat_id: chatId,
          text: summaryText,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        });
      }
    }

    // Tự động xóa file PDF / Document gốc của người dùng sau khi xử lý xong
    if (originalUserMsgId) {
      await deleteTelegramMessage(chatId, originalUserMsgId);
    }
  } catch (e) {
    console.error('Lỗi quét tài liệu:', e);
    const retryId = 'retry_doc_' + Date.now();
    RETRY_TASKS.set(retryId, { type: 'document', doc, chatId, messageThreadId });

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🔄 Akko Thử Quét Lại Lần Nữa!', callback_data: retryId }
        ]
      ]
    };

    const errorMsg = '❌ Huhu có lỗi khi đọc tài liệu rùi Senpai ơi: ' + e.message + ' (｡•́︿•̀｡)';
    if (waitMsgId) {
      await sendTelegram('editMessageText', {
        chat_id: chatId,
        message_id: waitMsgId,
        text: errorMsg,
        reply_markup: replyMarkup
      });
    } else {
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: errorMsg,
        reply_markup: replyMarkup
      });
    }

    // Vẫn xóa file gốc sau khi báo lỗi
    if (originalUserMsgId) {
      await deleteTelegramMessage(chatId, originalUserMsgId);
    }
  }
}

async function processPhoto(chatId, bestPhoto, existingWaitMsgId = null, originalUserMsgId = null, messageThreadId = null) {
  const sendTelegram = (method, body) => {
    const payload = { ...body };
    if (messageThreadId && !payload.message_thread_id && (method === 'sendMessage' || method === 'sendPhoto' || method === 'sendDocument')) {
      payload.message_thread_id = messageThreadId;
    }
    return baseSendTelegram(method, payload);
  };

  const cfg = getBotConfig();
  const info = getActiveProviderInfo(cfg);

  if (!info.key) {
    if (originalUserMsgId) await deleteTelegramMessage(chatId, originalUserMsgId);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `⚠️ Huhu Senpai ơi, Akko chưa có ${info.keyHint} nè! Mau gõ \`/key <Key>\` hoặc \`/sync <Mã>\` để tiếp thêm năng lượng cho Akko nha~ (｡•́︿•̀｡)`,
      parse_mode: 'Markdown'
    });
  }

  let waitMsgId = existingWaitMsgId;
  const loadingText = `📥 Akko đã nhận được ảnh của Senpai! Đang dùng phép thuật ${info.providerName} để giải mã đây ạ... 🪄✨`;

  if (waitMsgId) {
    await sendTelegram('editMessageText', {
      chat_id: chatId,
      message_id: waitMsgId,
      text: loadingText
    });
  } else {
    const waitMsg = await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: loadingText
    });
    waitMsgId = waitMsg.result?.message_id;
  }

  try {
    const fileInfo = await sendTelegram('getFile', { file_id: bestPhoto.file_id });
    const filePath = fileInfo.result?.file_path;
    if (!filePath) throw new Error('Không lấy được đường dẫn file từ Telegram');

    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const imgRes = await fetch(fileUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = 'image/jpeg';

    if (waitMsgId) {
      await sendTelegram('editMessageText', {
        chat_id: chatId,
        message_id: waitMsgId,
        text: `⏳ Akko đang tập trung đọc phiếu bằng mô hình \`${info.model}\` (${info.providerName}) nè Senpai... 🌸`,
        parse_mode: 'Markdown'
      });
    }

    const { ocrRaw } = await performOcr(cfg, base64Data, mimeType);

    const items = parseOcrResultToItems(ocrRaw, cfg.selectedColumns || DEFAULT_COLUMNS);
    const soPhieu = ocrRaw.soPhieu || '';
    const historyId = 'scan_' + Date.now();

    // Lưu lại lịch sử để hỗ trợ nút bấm "Đồng bộ lại"
    saveBotHistoryItem(historyId, {
      soPhieu,
      items,
      model: `${info.model} (${info.providerName})`
    });

    let sheetStatusText = '';
    if (cfg.autoSyncSheet && cfg.googleSheetUrl) {
      if (waitMsgId) {
        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: '📊 Trích xuất xong rùi nè! Akko đang cất dữ liệu vào Google Sheet cho Senpai nha... ✨'
        });
      }
      const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, soPhieu, items);
      sheetStatusText = sheetResult.success ? '✅ Đã lưu vào Google Sheet' : ('❌ Lỗi Sheet: ' + sheetResult.message);
    }

    const summaryText = buildSummaryText(soPhieu, items, `${info.model} (${info.providerName})`, sheetStatusText, historyId);

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🔄 Akko Gửi Lại Lên Sheet Nha!', callback_data: `resync_${historyId}` }
        ]
      ]
    };

    if (waitMsgId) {
      await sendTelegram('editMessageText', {
        chat_id: chatId,
        message_id: waitMsgId,
        text: summaryText,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    } else {
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: summaryText,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      });
    }

    // Tự động xóa ảnh gốc của người dùng sau khi xử lý xong
    if (originalUserMsgId) {
      await deleteTelegramMessage(chatId, originalUserMsgId);
    }
  } catch (e) {
    console.error('Lỗi quét ảnh:', e);
    const retryId = 'retry_photo_' + Date.now();
    RETRY_TASKS.set(retryId, { type: 'photo', photo: bestPhoto, chatId, messageThreadId });

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🔄 Akko Thử Quét Lại Lần Nữa!', callback_data: retryId }
        ]
      ]
    };

    const errorMsg = '❌ Huhu có chút trục trặc khi đọc ảnh rồi Senpai ơi: ' + e.message + ' (｡•́︿•̀｡)';
    if (waitMsgId) {
      await sendTelegram('editMessageText', {
        chat_id: chatId,
        message_id: waitMsgId,
        text: errorMsg,
        reply_markup: replyMarkup
      });
    } else {
      await sendTelegram('sendMessage', {
        chat_id: chatId,
        text: errorMsg,
        reply_markup: replyMarkup
      });
    }

    // Vẫn xóa ảnh gốc sau khi báo lỗi
    if (originalUserMsgId) {
      await deleteTelegramMessage(chatId, originalUserMsgId);
    }
  }
}

async function handleCallbackQuery(cbq) {
  const data = cbq.data || '';
  const chatId = cbq.message?.chat?.id;
  const messageId = cbq.message?.message_id;
  const threadId = cbq.message?.message_thread_id;

  const sendTelegram = (method, body) => {
    const payload = { ...body };
    if (threadId && !payload.message_thread_id && (method === 'sendMessage' || method === 'sendPhoto' || method === 'sendDocument')) {
      payload.message_thread_id = threadId;
    }
    return baseSendTelegram(method, payload);
  };

  if (data.startsWith('retry_')) {
    const task = RETRY_TASKS.get(data);
    if (!task) {
      return sendTelegram('answerCallbackQuery', {
        callback_query_id: cbq.id,
        text: '⚠️ Ôi không! Tác vụ này đã hết hạn rồi Senpai ơi, gửi lại ảnh hoặc file mới cho Akko nha! (｡•́︿•̀｡)',
        show_alert: true
      });
    }

    await sendTelegram('answerCallbackQuery', {
      callback_query_id: cbq.id,
      text: '🪄 Dạ Senpai! Akko đang quét lại ngay đây ạ~'
    });

    const targetThread = task.messageThreadId || threadId;

    if (task.type === 'document') {
      await processDocument(task.chatId, task.doc, messageId, null, targetThread);
    } else if (task.type === 'photo') {
      await processPhoto(task.chatId, task.photo, messageId, null, targetThread);
    } else if (task.type === 'pdf_page') {
      const cfg = getBotConfig();
      const info = getActiveProviderInfo(cfg);
      const waitMsg = await sendTelegram('sendMessage', {
        chat_id: task.chatId,
        text: `⏳ Akko đang quét lại Trang ${task.pageNum} bằng mô hình \`${info.model}\` cho Senpai nè... 🌸`,
        parse_mode: 'Markdown',
        ...(targetThread ? { message_thread_id: targetThread } : {})
      });
      const waitId = waitMsg.result?.message_id;
      try {
        const { ocrRaw: pageOcr } = await performOcr(cfg, task.pageBase64, 'image/png');
        const pageItems = parseOcrResultToItems(pageOcr, cfg.selectedColumns || DEFAULT_COLUMNS);
        const pageSoPhieu = (pageOcr.soPhieu || '').trim();
        const historyId = `scan_page_${Date.now()}`;
        saveBotHistoryItem(historyId, {
          soPhieu: pageSoPhieu,
          items: pageItems,
          model: `${info.model} (${info.providerName})`
        });

        let sheetStatusText = '';
        if (cfg.autoSyncSheet && cfg.googleSheetUrl) {
          const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, pageSoPhieu, pageItems);
          sheetStatusText = sheetResult.success ? '✅ Đã lưu vào Google Sheet' : ('❌ Lỗi Sheet: ' + sheetResult.message);
        }

        const summaryText = buildSummaryText(pageSoPhieu, pageItems, `${info.model} (${info.providerName})`, sheetStatusText, historyId);
        const replyMarkup = {
          inline_keyboard: [
            [{ text: `🔄 Akko Gửi Lại Lên Sheet Nha!`, callback_data: `resync_${historyId}` }]
          ]
        };
        await sendTelegram('editMessageText', {
          chat_id: task.chatId,
          message_id: waitId,
          text: `📄 *KẾT QUẢ QUÉT LẠI TRANG ${task.pageNum} CHO SENPAI!* 🌸✨\n\n` + summaryText,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        });
      } catch (retryErr) {
        await sendTelegram('editMessageText', {
          chat_id: task.chatId,
          message_id: waitId,
          text: `❌ Huhu, quét lại Trang ${task.pageNum} vẫn gặp lỗi rùi Senpai: ${retryErr.message}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: `🔄 Thử Lại Trang ${task.pageNum} Lần Nữa`, callback_data: data }]
            ]
          }
        });
      }
    }
    return;
  }

  if (data.startsWith('resync_')) {
    const histId = data.replace('resync_', '');
    const hist = getBotHistory();
    const item = hist[histId];

    if (!item || !item.items || !item.items.length) {
      return sendTelegram('answerCallbackQuery', {
        callback_query_id: cbq.id,
        text: '⚠️ Huhu, Akko tìm trong trí nhớ không thấy phiếu này nữa rùi Senpai ơi!',
        show_alert: true
      });
    }

    const cfg = getBotConfig();
    if (!cfg.googleSheetUrl) {
      return sendTelegram('answerCallbackQuery', {
        callback_query_id: cbq.id,
        text: '❌ Senpai ơi, chưa có link Google Sheet kìa! Cài cho Akko bằng /sheet <link> nha~',
        show_alert: true
      });
    }

    await sendTelegram('answerCallbackQuery', {
      callback_query_id: cbq.id,
      text: '⏳ Đang đồng bộ lại lên Google Sheet cho Senpai đây ạ... 🌸'
    });

    const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, item.soPhieu, item.items);
    const sheetStatusText = sheetResult.success ? `✅ Akko đã đồng bộ lại thành công lên Google Sheet rồi nè! (${new Date().toLocaleTimeString('vi-VN')}) ✨` : (`❌ Lỗi: ` + sheetResult.message);

    const updatedText = buildSummaryText(item.soPhieu, item.items, item.model, sheetStatusText, histId);

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🔄 Akko Gửi Lại Lên Sheet Nha!', callback_data: `resync_${histId}` }
        ]
      ]
    };

    if (cfg.googleSheetUrl.includes('macros/s/')) {
      replyMarkup.inline_keyboard[0].push({
        text: '📊 Mở Bảng Sheet Của Senpai',
        url: 'https://docs.google.com/spreadsheets'
      });
    }

    await sendTelegram('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: updatedText,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup
    });
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const chatType = msg.chat?.type; // 'private' | 'group' | 'supergroup' | 'channel'
  const isGroup = chatType === 'group' || chatType === 'supergroup';
  const threadId = msg.message_thread_id; // integer hoặc undefined
  let cleanText = (msg.text || msg.caption || '').trim();

  // In log ra màn hình console để Senpai dễ dàng theo dõi trên Termux điện thoại
  const senderType = msg.from?.is_bot ? '🤖 BOT' : '👤 USER';
  const senderName = msg.from?.first_name || msg.chat?.title || 'Ẩn danh';
  const msgSummary = cleanText || (msg.photo ? '[Ảnh phiếu kho]' : (msg.document ? `[Tài liệu: ${msg.document.file_name || 'file'}]` : 'Khác'));
  console.log(`📩 [Tin nhắn mới] Chat: ${chatType} (${chatId}${threadId ? ` - Topic ${threadId}` : ''}) | Từ: ${senderName} (${senderType}) | Nội dung: "${msgSummary}"`);

  // Tự động định tuyến mọi phản hồi vào đúng Topic của Supergroup (nếu có)
  const sendTelegram = (method, body) => {
    const payload = { ...body };
    if (threadId && !payload.message_thread_id && (method === 'sendMessage' || method === 'sendPhoto' || method === 'sendDocument')) {
      payload.message_thread_id = threadId;
    }
    return baseSendTelegram(method, payload);
  };

  // Chuẩn hóa câu lệnh và nhận diện bot khi có nhiều bot cùng hoạt động trong group
  let isBotTagged = false;
  if (/@(AkkoCii_bot|akkocii_bot)/i.test(cleanText)) {
    isBotTagged = true;
    cleanText = cleanText.replace(/@(AkkoCii_bot|akkocii_bot)/gi, '').trim();
  } else if (cleanText.startsWith('/')) {
    const otherBotMatch = cleanText.match(/\/([a-zA-Z0-9_]+)@([a-zA-Z0-9_]+)/);
    if (otherBotMatch && otherBotMatch[2].toLowerCase() !== 'akkocii_bot') {
      // Lệnh dành riêng cho bot khác trong nhóm (ví dụ /login@VdacZaloBot), Akko tuyệt đối không can thiệp
      return;
    }
    cleanText = cleanText.replace(/@\w+/, '').trim();
  }

  const matchCommand = (cmdName) => {
    const lower = cleanText.toLowerCase();
    const aCmd = '/a' + cmdName.toLowerCase();
    const plainCmd = '/' + cmdName.toLowerCase();
    // Ưu tiên 1: Lệnh có tiền tố /a... (/astart, /astatus, /atopic...)
    if (lower.startsWith(aCmd + ' ') || lower === aCmd) return true;
    // Ưu tiên 2: Lệnh thường /... (/start, /status...) - Luôn hỗ trợ cả trong chat riêng lẫn trong nhóm (nếu không tag bot khác)
    if (lower.startsWith(plainCmd + ' ') || lower === plainCmd) return true;
    return false;
  };

  if (matchCommand('start') || matchCommand('help')) {
    const cfg = getBotConfig();
    const info = getActiveProviderInfo(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '👋 *Yahhoo~! Chào mừng Senpai đến với bé Akko!* 📦🪄✨\n\n' +
        'Em là *Akko* - phù thủy trợ lý AI chuyên quét và đọc phiếu xuất kho siêu tốc của Senpai đây ạ! (≧◡≦) ♡\n\n' +
        '📸 *Cách sai bảo Akko:*\n' +
        '• Senpai chỉ cần thả nhẹ ảnh hoặc file PDF phiếu kho vào đây (hoặc vào group/topic), Akko sẽ tự động đọc chuẩn từng chữ viết tay và bay đi lưu vào Google Sheet liền nha!\n' +
        '• Khi làm xong việc, Akko sẽ tự dọn dẹp ảnh/file gốc để căn phòng chat của Senpai luôn sạch sẽ ngăn nắp nha~ 🧹\n' +
        '• Nếu mạng giật lag rớt gói tin, Akko có sẵn nút 🔄 *Thử Quét Lại* để Senpai bấm cái là Akko làm lại liền!\n\n' +
        '🪄 *Phép thuật câu lệnh của Akko (thêm tiền tố `a` để không trùng bot khác):*\n' +
        '• `/atopic`: Khóa mục tiêu để Akko chỉ quét ảnh trong Topic này (dành cho Supergroup)\n' +
        '• `/atopic all`: Mở khóa để Akko quét ở tất cả các topic\n' +
        '• `/atopic status`: Xem topic hiện tại đang được gán quét phiếu\n' +
        '• `/aprovider <gemini|bai|kira|openrouter>`: Đổi phép thuật AI (hoặc gõ số 1-4 nè)\n' +
        '• `/amodel <Tên>`: Chọn mô hình AI mà Senpai thích\n' +
        '• `/akey <Key>`: Nạp API key cho Akko (tự nhận diện Google `AIzaSy...`, Kira `kira_...`, OpenRouter `sk-or-...`, B.AI)\n' +
        '• `/astatus`: Xem Akko đang có những gì trong balo\n' +
        '• `/async <Mã>`: Kéo toàn bộ phép thuật từ Web về (Ví dụ: `/async KHO-01`)\n' +
        '• `/asheet <Link>`: Cập nhật link Google Sheet của Senpai\n\n' +
        `🌸 *Hiện tại:* Phép thuật *${info.providerName}* | Mô hình \`${info.model}\``,
      parse_mode: 'Markdown'
    });
  }

  if (matchCommand('status')) {
    const cfg = getBotConfig();
    const info = getActiveProviderInfo(cfg);
    const allGeminiKeys = getGeminiKeys(cfg);
    let maskedGeminiKey = 'Chưa có';
    if (allGeminiKeys.length === 1) {
      maskedGeminiKey = allGeminiKeys[0].slice(0, 8) + '...' + allGeminiKeys[0].slice(-4);
    } else if (allGeminiKeys.length > 1) {
      const nextTurn = (botGeminiKeyIndex % allGeminiKeys.length) + 1;
      maskedGeminiKey = `Dàn ${allGeminiKeys.length} keys luân chuyển 🎯 (Lượt tới: #${nextTurn})`;
    }
    const maskedBaiKey = cfg.baiKey ? (cfg.baiKey.slice(0, 8) + '...' + cfg.baiKey.slice(-4)) : 'Chưa có';
    const maskedKiraKey = cfg.kiraKey ? (cfg.kiraKey.slice(0, 8) + '...' + cfg.kiraKey.slice(-4)) : 'Chưa có';
    const maskedOrKey = cfg.openRouterKey ? (cfg.openRouterKey.slice(0, 10) + '...' + cfg.openRouterKey.slice(-4)) : 'Chưa có';

    let topicStatusText = '';
    if (isGroup) {
      const cur = cfg.groupTopics && cfg.groupTopics[String(chatId)];
      if (cur && cur.topicId !== undefined) {
        topicStatusText = `🎯 *TOPIC QUÉT PHIẾU:* Đang khóa riêng Topic ID \`${cur.topicId}\` (Chỉ quét ảnh trong topic này)\n\n`;
      } else {
        topicStatusText = `🌐 *TOPIC QUÉT PHIẾU:* Mọi topic (Chưa khóa - Senpai gõ \`/atopic\` trong topic để khóa nha)\n\n`;
      }
    }

    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '⚙️ *BẢNG TRẠNG THÁI CỦA BÉ AKKO NÈ SENPAI:* 🌸✨\n\n' +
        `🤖 *AI ĐANG HOẠT ĐỘNG:*\n` +
        `• Phép thuật chính: *${info.providerName.toUpperCase()}* 🎯\n` +
        `• Mô hình đang chạy: \`${info.model}\` ✨\n\n` +
        topicStatusText +
        `📋 *DANH SÁCH MÔ HÌNH AKKO ĐANG CÓ:*\n` +
        `• Google Gemini: \`${cfg.geminiModel || 'gemini-3.6-flash'}\` (\`${maskedGeminiKey}\`)\n` +
        `• B.AI: \`${cfg.baiModel || 'DeepSeek-V4.1-Flash'}\` (\`${maskedBaiKey}\`)\n` +
        `• Kira AI: \`${cfg.kiraModel || 'qwen3.8-27b-free'}\` (\`${maskedKiraKey}\`)\n` +
        `• OpenRouter: \`${cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free'}\` (\`${maskedOrKey}\`)\n\n` +
        `📊 *GOOGLE SHEET:*\n` +
        `• Trạng thái: ${cfg.googleSheetUrl ? '✅ Đã kết nối sẵn sàng' : '❌ Chưa có link nè Senpai'}\n` +
        `• Tự động đẩy: *${cfg.autoSyncSheet ? 'BẬT' : 'TẮT'}*\n\n` +
        `☁️ *MÃ CLOUD SYNC:*\n` +
        `• Trạng thái: \`${maskSyncCode(cfg.cloudSyncCode)}\` 🔒\n\n` +
        '👉 Senpai gõ `/async <Mã>` để Akko cập nhật nhanh từ Web nha!\n' +
        '👉 Gõ `/aprovider <1-4>` để đổi nhà cung cấp AI cái rụp nè~',
      parse_mode: 'Markdown'
    });
  }

  // Lệnh quản lý và chỉ định Topic trong Supergroup (/atopic hoặc /topic)
  if (matchCommand('topic') || matchCommand('settopic')) {
    const args = cleanText.split(/\s+/);
    const subCmd = (args[1] || '').toLowerCase().trim();
    const cfg = getBotConfig();

    // Trường hợp 1: Nhắn tin riêng 1-1 với bot -> Hiện hướng dẫn chi tiết
    if (!isGroup) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '💬 *HƯỚNG DẪN CÀI ĐẶT TOPIC TRONG SUPERGROUP:* 🌸✨\n\n' +
          'Senpai muốn Akko chỉ nhận diện và quét ảnh trong 1 Topic nhất định của Supergroup đúng hông nè? Rất đơn giản ạ:\n\n' +
          '1️⃣ Thêm Akko (`@AkkoCii_bot`) vào Supergroup của công ty/kho hàng.\n' +
          '2️⃣ Mở đúng *Topic* mà Senpai muốn dùng để quét phiếu (Ví dụ topic: "Quét Phiếu" hoặc "Kho Nhận").\n' +
          '3️⃣ Gõ lệnh: `/atopic` ngay trong topic đó!\n\n' +
          '🪄 *Phép thuật sẽ kích hoạt:* Akko tự động ghi nhớ ID của Topic đó. Từ đó, Akko *chỉ quét ảnh/PDF* được gửi vào Topic này, các topic khác Akko sẽ giữ yên lặng tuyệt đối nha! (≧◡≦) ♡\n\n' +
          '• Trong nhóm gõ `/atopic all`: Cho phép Akko quét ở tất cả topic.\n' +
          '• Trong nhóm gõ `/atopic status`: Xem topic hiện tại đang khóa.',
        parse_mode: 'Markdown'
      });
    }

    // Trường hợp 2: Lệnh gõ trong Group / Supergroup
    if (!cfg.groupTopics) cfg.groupTopics = {};
    const groupKey = String(chatId);

    // /atopic all | /atopic reset | /atopic off -> Hủy khóa topic
    if (subCmd === 'all' || subCmd === 'reset' || subCmd === 'off' || subCmd === 'clear') {
      if (cfg.groupTopics[groupKey]) {
        delete cfg.groupTopics[groupKey];
        saveBotConfig(cfg);
      }
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '🔓 *ĐÃ MỞ KHÓA TOÀN BỘ TOPIC!* 🌸✨\n\n' +
          `Từ giờ trong nhóm *${msg.chat.title || 'này'}*, Akko sẽ nhận diện và quét ảnh/PDF ở *TẤT CẢ các topic* nha Senpai~ (≧◡≦) ♡`,
        parse_mode: 'Markdown'
      });
    }

    // /atopic status -> Xem trạng thái topic của nhóm
    if (subCmd === 'status' || subCmd === 'check') {
      const cur = cfg.groupTopics[groupKey];
      if (cur && cur.topicId !== undefined) {
        return sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `🎯 *TRẠNG THÁI TOPIC CỦA NHÓM:* 🌸✨\n\n` +
            `• Nhóm: *${msg.chat.title || 'Supergroup'}*\n` +
            `• Topic được chỉ định: \`${cur.topicId}\`\n` +
            `• Thiết lập bởi: *${cur.setBy || 'Senpai'}*\n` +
            `• Cập nhật lúc: \`${new Date(cur.updatedAt).toLocaleString('vi-VN')}\`\n\n` +
            `✅ Akko *chỉ quét ảnh/PDF* được gửi trong Topic này thôi nha!\n` +
            `👉 Gõ \`/atopic all\` để cho phép quét ở mọi topic trở lại.`,
          parse_mode: 'Markdown'
        });
      } else {
        return sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `🌐 *TRẠNG THÁI TOPIC CỦA NHÓM:* 🌸✨\n\n` +
            `• Nhóm: *${msg.chat.title || 'Supergroup'}*\n` +
            `• Hiện tại: *Chưa khóa topic nào* (Akko nhận diện ảnh ở tất cả các topic).\n\n` +
            `👉 Để khóa riêng một Topic, Senpai hãy vào đúng Topic đó rồi gõ lệnh \`/atopic\` nha!`,
          parse_mode: 'Markdown'
        });
      }
    }

    // /atopic <id> -> Cài đặt bằng ID thủ công
    if (subCmd && /^\d+$/.test(subCmd)) {
      const manualId = parseInt(subCmd, 10);
      cfg.groupTopics[groupKey] = {
        topicId: manualId,
        chatTitle: msg.chat.title || 'Supergroup',
        setBy: msg.from?.first_name || 'Senpai',
        updatedAt: new Date().toISOString()
      };
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🎯 *ĐÃ THIẾT LẬP TOPIC QUÉT PHIẾU!* 🌸✨\n\n` +
          `• Nhóm: *${msg.chat.title || 'Supergroup'}*\n` +
          `• Topic ID khóa: \`${manualId}\`\n\n` +
          `Từ giờ Akko chỉ quét ảnh/PDF được thả vào Topic ID \`${manualId}\` thôi nha! (≧◡≦) ♡`,
        parse_mode: 'Markdown'
      });
    }

    // /atopic (không tham số) -> Tự động bắt lấy message_thread_id của topic hiện tại!
    if (threadId) {
      cfg.groupTopics[groupKey] = {
        topicId: threadId,
        chatTitle: msg.chat.title || 'Supergroup',
        setBy: msg.from?.first_name || 'Senpai',
        updatedAt: new Date().toISOString()
      };
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🎯 *TUÂN LỆNH SENPAI! AKKO ĐÃ KHÓA MỤC TIÊU VÀO TOPIC NÀY!* 🌸✨\n\n` +
          `• Nhóm: *${msg.chat.title || 'Supergroup'}*\n` +
          `• Topic ID: \`${threadId}\`\n\n` +
          `Từ giờ, trong nhóm này:\n` +
          `✅ Akko *chỉ tự động quét ảnh & file PDF* khi được gửi trong *Topic này*!\n` +
          `🔇 Bỏ qua và giữ yên lặng khi có ảnh/file ở các topic khác để tránh làm phiền nhóm.\n\n` +
          `💡 _Mẹo: Gõ \`/atopic all\` nếu Senpai muốn Akko quét ở mọi topic trở lại nha!_`,
        parse_mode: 'Markdown'
      });
    } else {
      // Tin nhắn gửi ở Topic General hoặc nhóm thường chưa bật Topics
      const isForum = msg.chat?.is_forum;
      if (!isForum && chatType === 'group') {
        return sendTelegram('sendMessage', {
          chat_id: chatId,
          text: '📌 *Senpai ơi! Nhóm này là Nhóm Thường (chưa bật tính năng Chủ đề / Topics)!* 🌸✨\n\n' +
            '• Trong nhóm thường, Akko luôn *tự động quét 100% mọi ảnh và file PDF* được gửi lên nhóm theo đúng quy tắc ban đầu nha!\n' +
            '• Tính năng phân chia Topic chỉ áp dụng cho Supergroup đã bật tính năng "Chủ đề (Topics/Forum)" thôi ạ~ (≧◡≦) ♡',
          parse_mode: 'Markdown'
        });
      }

      const cur = cfg.groupTopics[groupKey];
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `📌 *Senpai ơi!* Tin nhắn này đang ở *Topic Chung (General)* hoặc nhóm chưa bật tính năng Topics (Chủ đề).\n\n` +
          `• Để Akko chỉ quét ở một Topic riêng (ví dụ: topic "Quét Phiếu"), Senpai hãy mở đúng Topic đó rồi gõ \`/atopic\` nha!\n` +
          `• Với nhóm thường không chia topic, Akko luôn quét mọi ảnh/PDF theo đúng quy tắc mặc định ban đầu!\n` +
          `• Trạng thái hiện tại: ${cur && cur.topicId !== undefined ? `Đang khóa ở Topic ID \`${cur.topicId}\`` : 'Đang quét ở tất cả topic'}`,
        parse_mode: 'Markdown'
      });
    }
  }

  if (matchCommand('sync')) {
    const args = cleanText.split(' ');
    const code = (args[1] || '').trim().toUpperCase();
    if (!code) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Senpai ơi, nhớ nhập mã đồng bộ nha! Ví dụ: `/async KHO-01` nè~ 🎀',
        parse_mode: 'Markdown'
      });
    }

    const cfg = getBotConfig();
    try {
      let cloudData = null;
      let matchedSource = '';

      // Danh sách các địa chỉ máy chủ thử đồng bộ theo thứ tự ưu tiên
      const endpoints = [];
      if (cfg.serverUrl) endpoints.push(`${cfg.serverUrl.replace(/\/+$/, '')}/api/sync`);
      if (process.env.WEB_APP_URL) endpoints.push(`${process.env.WEB_APP_URL.replace(/\/+$/, '')}/api/sync`);
      endpoints.push('https://scanzzz.vercel.app/api/sync');
      endpoints.push('http://localhost:3000/api/sync');
      endpoints.push('http://127.0.0.1:3000/api/sync');

      for (const ep of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(`${ep}?code=${encodeURIComponent(code)}`, {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const json = await res.json();
            if (json && json.data) {
              cloudData = json.data;
              matchedSource = ep;
              break;
            }
          }
        } catch (e) {}
      }

      if (!cloudData && fs.existsSync(SYNC_STORE)) {
        try {
          const store = JSON.parse(fs.readFileSync(SYNC_STORE, 'utf8'));
          if (store[code]) {
            cloudData = store[code];
            matchedSource = 'Bộ nhớ cục bộ (.data)';
          }
        } catch (e) {}
      }

      if (!cloudData) {
        return sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `❌ Huhu, Akko không tìm thấy dữ liệu cho mã 【${maskSyncCode(code)}】 trên Cloud (https://scanzzz.vercel.app) hoặc mã đã hết hạn rùi Senpai ơi! (｡•́︿•̀｡)\n\n` +
            `👉 *Senpai thử thế này xem sao nha:*\n` +
            `1. Mở Web (https://scanzzz.vercel.app hoặc localhost:3000), vào Cài đặt ⚙️ -> bấm *Lưu lên Cloud* với mã này.\n` +
            `2. Hoặc nếu chạy khác mạng, dùng lệnh \`/aserver <link_web>\` để chỉ đường cho Akko.\n` +
            `3. Hoặc gõ trực tiếp \`/akey <Key>\` để đưa key cho Akko giữ luôn nè!`,
          parse_mode: 'Markdown'
        });
      }

      // Cập nhật nhà cung cấp AI đồng bộ
      if (cloudData.aiProvider) {
        let p = String(cloudData.aiProvider).toLowerCase().trim();
        if (p === 'google' || p === 'gg') p = 'gemini';
        if (p === 'apx' || p === 'apinex') p = 'gemini';
        if (p === 'kiraai') p = 'kira';
        if (p === 'b.ai') p = 'bai';
        if (p === 'or') p = 'openrouter';
        cfg.aiProvider = p;
      }

      // Cập nhật model từng nhà cung cấp
      if (cloudData.openRouterModel) cfg.openRouterModel = String(cloudData.openRouterModel).trim();
      if (cloudData.kiraModel) cfg.kiraModel = String(cloudData.kiraModel).trim();
      if (cloudData.baiModel) cfg.baiModel = String(cloudData.baiModel).trim();
      if (cloudData.geminiModel) {
        cfg.geminiModel = cloudData.geminiModel === 'gemini-2.5-flash' ? 'gemini-3.6-flash' : String(cloudData.geminiModel).trim();
      }

      // Cập nhật API Keys
      if (cloudData.apiKey !== undefined && cloudData.apiKey !== null) {
        const val = String(cloudData.apiKey).trim();
        if (val || !cfg.geminiKey) cfg.geminiKey = val;
      }
      if (Array.isArray(cloudData.backupKeys)) {
        cfg.geminiBackupKeys = cloudData.backupKeys.map(k => String(k).trim()).filter(Boolean);
      }
      if (cloudData.openRouterKey !== undefined && cloudData.openRouterKey !== null) {
        const val = String(cloudData.openRouterKey).trim();
        if (val || !cfg.openRouterKey) cfg.openRouterKey = val;
      }
      if (cloudData.kiraKey !== undefined && cloudData.kiraKey !== null) {
        const val = String(cloudData.kiraKey).trim();
        if (val || !cfg.kiraKey) cfg.kiraKey = val;
      }
      if (cloudData.baiKey !== undefined && cloudData.baiKey !== null) {
        const val = String(cloudData.baiKey).trim();
        if (val || !cfg.baiKey) cfg.baiKey = val;
      }

      // Cập nhật cấu hình Google Sheet & Cột
      if (cloudData.googleSheetUrl !== undefined && cloudData.googleSheetUrl !== null) {
        const val = String(cloudData.googleSheetUrl).trim();
        if (val || !cfg.googleSheetUrl) cfg.googleSheetUrl = val;
      }
      if (cloudData.autoSyncSheet !== undefined) {
        cfg.autoSyncSheet = Boolean(cloudData.autoSyncSheet);
      }
      if (Array.isArray(cloudData.selectedColumns) && cloudData.selectedColumns.length) {
        cfg.selectedColumns = cloudData.selectedColumns;
      }
      if (cloudData.fieldPrompts && typeof cloudData.fieldPrompts === 'object') {
        cfg.fieldPrompts = cloudData.fieldPrompts;
      }
      cfg.cloudSyncCode = code;

      saveBotConfig(cfg);
      const info = getActiveProviderInfo(cfg);
      const gKeys = getGeminiKeys(cfg);
      const geminiStatusStr = gKeys.length > 1
        ? `\`${cfg.geminiModel || 'gemini-3.6-flash'}\` (${gKeys.length} keys luân chuyển 🎯)`
        : `\`${cfg.geminiModel || 'gemini-3.6-flash'}\``;

      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🎉 *Yatta~! Akko đã đồng bộ thành công từ Cloud* 【${maskSyncCode(code)}】 *rồi nè Senpai ơi!* ٩(◕‿◕｡)۶\n\n` +
          `• Nguồn máy chủ: \`${matchedSource}\`\n` +
          `• Nhà cung cấp đang chọn: *${info.providerName.toUpperCase()}* 🎯\n` +
          `• Mô hình AI đang chạy: \`${info.model}\`\n` +
          `• Model Gemini: ${geminiStatusStr}\n` +
          `• Model B.AI: \`${cfg.baiModel || 'DeepSeek-V4.1-Flash'}\`\n` +
          `• Model Kira AI: \`${cfg.kiraModel || 'qwen3.8-27b-free'}\`\n` +
          `• Model OpenRouter: \`${cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free'}\`\n` +
          `• Google Sheet: ${cfg.googleSheetUrl ? '✅ Đã kết nối' : '❌ Chưa có'}\n` +
          `• Số cột trích xuất: ${cfg.selectedColumns ? cfg.selectedColumns.length : 0} cột\n\n` +
          `Senpai cứ thả ảnh hoặc PDF vào, việc còn lại để bé Akko lo nha! (≧◡≦) ♡`,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      return sendTelegram('sendMessage', { chat_id: chatId, text: '❌ Huhu có lỗi khi đồng bộ rùi Senpai ơi: ' + e.message });
    }
  }

  if (matchCommand('server')) {
    const args = cleanText.split(' ');
    const sUrl = (args[1] || '').trim();
    const cfg = getBotConfig();
    if (!sUrl) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🌐 Dạ Senpai! Máy chủ Web hiện tại của Akko là: \`${cfg.serverUrl || 'https://scanzzz.vercel.app'}\` nè~\n\n` +
          '• Đổi máy chủ: `/aserver <URL>`\n' +
          '• Ví dụ Cloud: `/aserver https://scanzzz.vercel.app`\n' +
          '• Hoặc mạng LAN (Termux chung Wifi máy tính): `/aserver http://192.168.1.x:3000`',
        parse_mode: 'Markdown'
      });
    }
    cfg.serverUrl = sUrl;
    saveBotConfig(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Tuân lệnh Senpai! Akko đã ghi nhớ máy chủ Web mới: \`${sUrl}\` rùi nè!\nGiờ Senpai có thể gõ \`/async <Mã>\` để kéo dữ liệu từ máy chủ này về nha~ ✨`,
      parse_mode: 'Markdown'
    });
  }

  if (matchCommand('provider')) {
    const args = cleanText.split(' ');
    const prov = (args[1] || '').trim().toLowerCase();
    const cfg = getBotConfig();

    if (prov === 'gemini' || prov === 'google' || prov === 'gg' || prov === '1') {
      cfg.aiProvider = 'gemini';
      saveBotConfig(cfg);
      const allGKeys = getGeminiKeys(cfg);
      const keyInfo = allGKeys.length > 1 ? ` • Dàn ${allGKeys.length} keys luân chuyển 🎯` : '';
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Dạ Senpai! Akko đã chuyển sang dùng sức mạnh của *Google Gemini* (Mô hình: \`${cfg.geminiModel || 'gemini-3.6-flash'}\`${keyInfo}) rồi nè! ⚡`,
        parse_mode: 'Markdown'
      });
    } else if (prov === 'bai' || prov === 'b.ai' || prov === '2') {
      cfg.aiProvider = 'bai';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Oki Senpai! Akko đã kết nối sang *B.AI* (Mô hình: \`${cfg.baiModel || 'DeepSeek-V4.1-Flash'}\`) rồi nè! 🔥`,
        parse_mode: 'Markdown'
      });
    } else if (prov === 'kira' || prov === 'kiraai' || prov === '3') {
      cfg.aiProvider = 'kira';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Oki Senpai! Akko đã kết nối sang *Kira AI* (Mô hình: \`${cfg.kiraModel || 'qwen3.8-27b-free'}\`) rồi nè! 🌟`,
        parse_mode: 'Markdown'
      });
    } else if (prov === 'openrouter' || prov === 'or' || prov === '4') {
      cfg.aiProvider = 'openrouter';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Rõ ạ! Akko đã chuyển sang mạng lưới *OpenRouter* (Mô hình: \`${cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free'}\`) nha Senpai! 🌐`,
        parse_mode: 'Markdown'
      });
    } else {
      const info = getActiveProviderInfo(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '💡 Senpai muốn Akko dùng AI nào nè? Gõ `/aprovider <gemini|bai|kira|openrouter>` (hoặc gõ số 1-4 nha):\n' +
          `• 1: Google Gemini (\`${cfg.geminiModel || 'gemini-3.6-flash'}\`)\n` +
          `• 2: B.AI (\`${cfg.baiModel || 'DeepSeek-V4.1-Flash'}\`)\n` +
          `• 3: Kira AI (\`${cfg.kiraModel || 'qwen3.8-27b-free'}\`)\n` +
          `• 4: OpenRouter (\`${cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free'}\`)\n\n` +
          `🎯 Hiện tại Akko đang dùng: *${info.providerName}* (\`${info.model}\`)`,
        parse_mode: 'Markdown'
      });
    }
  }

  if (matchCommand('model')) {
    const args = cleanText.split(' ');
    const modelName = args.slice(1).join(' ').trim();
    if (!modelName) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '💡 *Senpai ơi, đây là danh sách các mô hình AI xịn xò mới nhất Akko gợi ý nè:* 🌸\n\n' +
          '⚡ *Google Gemini trực tiếp (Mô hình chính & Pay-As-You-Go):*\n' +
          '• `/amodel gemini-3.6-flash` (MÔ HÌNH CHÍNH • Siêu nhanh & Chuẩn xác cho mọi key)\n' +
          '• `/amodel gemini-3.7-flash` (Tùy chọn • Pay-As-You-Go • Reasoning & Vision đỉnh cao)\n' +
          '• `/amodel gemini-3.8-flash` (Tùy chọn • Pay-As-You-Go • Siêu tốc độ)\n\n' +
          '🔥 *B.AI (b.ai):*\n' +
          '• `/amodel Qwen3.8-Flash` (Khuyên dùng #1 • Alibaba Vision cực chuẩn)\n' +
          '• `/amodel Qwen3.8-27B` (MỚI • Vision 27B siêu tốc 2.5s & chuẩn xác)\n' +
          '• `/amodel GLM-5.3-Flash` (Zhipu AI Siêu nhanh 2.9s)\n' +
          '• `/amodel DeepSeek-V4.1-Flash` (MoE 552B Siêu tốc)\n\n' +
          '🌟 *Kira AI (kiraai.vn - Đa dạng Vision):*\n' +
          '• `/amodel qwen3.8-flash-free` (Khuyên dùng • Cực nhanh 3-5s & Chuẩn xác)\n' +
          '• `/amodel qwen3.8-27b-free` (Vision đọc chữ viết tay rất tốt)\n' +
          '• `/amodel kira-3.5-flash-pdf` (MỚI • Chuyên dụng đọc PDF & phiếu kho)\n' +
          '• `/amodel kira-3.5-flash` (MỚI • Thế hệ 3.5 siêu tốc)\n' +
          '• `/amodel deepseek-v4-flash-vision-exp` (MỚI • Vision thử nghiệm)\n' +
          '• `/amodel glm-5.3-flash-free` (Đa phương thức & Tài liệu)\n' +
          '• `/amodel qwen3.8-max` (Đỉnh cao chữ viết tay)\n' +
          '• `/amodel kira-auto` (Tự động điều phối mô hình)\n\n' +
          '🌐 *OpenRouter (Tối ưu OCR Vision):*\n' +
          '• `/amodel nex-agi/nex-n2.5-pro:free` (Khuyên dùng - Rất nhanh & chuẩn)\n' +
          '• `/amodel nex-agi/nex-n2.5-mini:free` (Siêu nhẹ & tốc độ cao)\n' +
          '• `/amodel inclusionai/ling-3.0-flash-vl:free` (MỚI • Vision 3.0)\n' +
          '• `/amodel google/gemma-4-31b-it:free` (MỚI • Google Gemma 4 31B)\n' +
          '• `/amodel google/gemini-2.5-flash` (Google Gemini Vision siêu ổn định)\n' +
          '• `/amodel openai/gpt-4o-mini` (Bóc tách bảng chuẩn)\n' +
          '• `/amodel qwen/qwen2.5-vl-72b-instruct` (Đỉnh cao chữ viết tay châu Á)\n' +
          '• `/amodel openrouter/free` (MỚI • Auto Router)\n\n' +
          '_(Senpai có thể gõ `/amodel <mã>` để Akko kích hoạt bất kỳ mã model nào nha)_',
        parse_mode: 'Markdown'
      });
    }

    const cfg = getBotConfig();
    const lowerModel = modelName.toLowerCase();

    if (
      lowerModel === 'deepseek-v4.1-flash' ||
      lowerModel === 'glm-5.3-flash' ||
      lowerModel === 'qwen3.8-flash' ||
      lowerModel === 'qwen3.8-27b' ||
      lowerModel.startsWith('deepseek-v4.1')
    ) {
      cfg.aiProvider = 'bai';
      cfg.baiModel = lowerModel;
    } else if (
      modelName.startsWith('kira_') ||
      modelName.startsWith('kira-') ||
      modelName.startsWith('deepseek-v4-flash-vision') ||
      lowerModel.includes('-free') ||
      lowerModel.startsWith('qwen3.8') ||
      lowerModel.startsWith('qwen3.7') ||
      lowerModel.startsWith('glm-5.3') ||
      lowerModel.startsWith('mimo-') ||
      lowerModel.startsWith('hy3') ||
      lowerModel.startsWith('mercury-')
    ) {
      cfg.aiProvider = 'kira';
      cfg.kiraModel = modelName;
    } else if (
      lowerModel.startsWith('gemini') ||
      lowerModel.includes('gemini-3.7') ||
      lowerModel.includes('gemini-3.8') ||
      lowerModel.includes('gemini-3.6') ||
      lowerModel === 'gemini-1.5-flash'
    ) {
      cfg.aiProvider = 'gemini';
      cfg.geminiModel = modelName;
    } else if (modelName.includes('/') || modelName.includes(':free') || modelName.startsWith('openrouter')) {
      cfg.aiProvider = 'openrouter';
      cfg.openRouterModel = modelName;
    } else {
      if (cfg.aiProvider === 'gemini') {
        cfg.geminiModel = modelName;
      } else if (cfg.aiProvider === 'bai') {
        cfg.baiModel = modelName;
      } else if (cfg.aiProvider === 'kira') {
        cfg.kiraModel = modelName;
      } else {
        cfg.openRouterModel = modelName;
      }
    }

    saveBotConfig(cfg);
    const info = getActiveProviderInfo(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Tuân lệnh Senpai! Akko đã đổi mô hình AI sang: \`${modelName}\`\n• Nhà cung cấp kích hoạt: *${info.providerName}* (≧◡≦) ♡`,
      parse_mode: 'Markdown'
    });
  }

  if (matchCommand('key')) {
    const rawContent = cleanText.replace(/^\/a?key\s*/i, '').trim();
    if (!rawContent) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ *CÚ PHÁP NẠP API KEY CHO BÉ AKKO:* 🌸✨\n\n' +
          '• Cú pháp cơ bản: `/akey <API_Key>`\n' +
          '• Google Key: bắt đầu bằng `AIzaSy...` (Akko sẽ tự chuyển sang Google Gemini)\n' +
          '• Kira Key: bắt đầu bằng `kira_...` (Akko sẽ tự chuyển sang Kira AI)\n' +
          '• OpenRouter Key: bắt đầu bằng `sk-or-` (Akko sẽ tự chuyển sang OpenRouter)\n' +
          '• B.AI Key: khi đang chọn B.AI (`/aprovider bai`), dán key để Akko cất vào ví B.AI nha\n\n' +
          '🎯 *TÍNH NĂNG LUÂN CHUYỂN DÀN KEY GEMINI (ROUND-ROBIN):*\n' +
          '• Senpai có thể dán cùng lúc *nhiều key Google Gemini* (mỗi dòng 1 key hoặc cách nhau dấu phẩy/khoảng trắng).\n' +
          '• Ví dụ dán 5 key: `/akey AIzaSy... AIzaSy... AIzaSy...`\n' +
          '• Akko sẽ tự động nạp cả 5 key vào dàn luân chuyển, sau mỗi phiếu sẽ tự xoay sang key tiếp theo để không bị nghẽn hay dồn dập!',
        parse_mode: 'Markdown'
      });
    }

    const cfg = getBotConfig();

    // Tách các key nếu gửi danh sách nhiều key
    const tokens = rawContent.split(/[\r\n,;\s]+/).map(t => t.trim()).filter(Boolean);
    const geminiCandidates = tokens.filter(t => t.startsWith('AIzaSy'));

    // Trường hợp 1: Dán dàn nhiều key Google Gemini (Round-Robin)
    if (geminiCandidates.length > 1) {
      cfg.geminiKey = geminiCandidates[0];
      cfg.geminiBackupKeys = geminiCandidates.slice(1);
      cfg.aiProvider = 'gemini';
      saveBotConfig(cfg);
      botGeminiKeyIndex = 0;

      const maskedList = geminiCandidates.map((k, idx) => `  ${idx + 1}. \`${k.slice(0, 8)}...${k.slice(-4)}\``).join('\n');
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🎯 *YATTA~! AKKO ĐÃ NẠP DÀN ${geminiCandidates.length} GEMINI API KEY VÀO HỆ THỐNG LUÂN CHUYỂN!* 🌸✨\n\n` +
          `📋 *Danh sách ${geminiCandidates.length} keys trong dàn:*\n${maskedList}\n\n` +
          `🔄 *Cơ chế Round-Robin:* Mỗi khi quét xong 1 phiếu, Akko sẽ tự động đổi sang key kế tiếp để giảm yêu cầu dồn dập cho 1 key!\n` +
          `⚡ Provider đã chuyển sang *GOOGLE GEMINI* (Mô hình: \`${cfg.geminiModel || 'gemini-3.6-flash'}\`) nha Senpai! (≧◡≦) ♡`,
        parse_mode: 'Markdown'
      });
    }

    // Trường hợp 2: Thêm 1 key vào dàn hiện có: /akey add <key>
    if (tokens[0].toLowerCase() === 'add' && tokens[1]) {
      const addKey = tokens[1].trim();
      const masked = addKey.slice(0, 8) + '...' + addKey.slice(-4);
      if (addKey.startsWith('AIzaSy')) {
        const curKeys = getGeminiKeys(cfg);
        if (!curKeys.includes(addKey)) {
          if (!cfg.geminiKey) {
            cfg.geminiKey = addKey;
          } else {
            if (!Array.isArray(cfg.geminiBackupKeys)) cfg.geminiBackupKeys = [];
            cfg.geminiBackupKeys.push(addKey);
          }
          cfg.aiProvider = 'gemini';
          saveBotConfig(cfg);
        }
        const total = getGeminiKeys(cfg).length;
        return sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `✅ Đã thêm key \`${masked}\` vào dàn luân chuyển Gemini! Hiện tại dàn có *${total} keys* nha Senpai~ 🎯`,
          parse_mode: 'Markdown'
        });
      }
    }

    // Trường hợp 3: Nạp 1 key đơn lẻ
    const newKey = tokens[0];
    const masked = newKey.length > 12 ? (newKey.slice(0, 8) + '...' + newKey.slice(-4)) : '••••••••';

    if (newKey.startsWith('AIzaSy')) {
      cfg.geminiKey = newKey;
      cfg.aiProvider = 'gemini';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Yatta~! Akko đã cất Google Gemini API Key vào ví rùi nè: \`${masked}\`\n(Akko cũng tự động chuyển Provider sang *GOOGLE GEMINI* luôn rùi đó Senpai!) ✨\n\n💡 _Mẹo: Senpai có thể dán nhiều key cùng lúc để kích hoạt dàn xoay vòng Round-Robin nha!_`,
        parse_mode: 'Markdown'
      });
    } else if (newKey.startsWith('kira_') || newKey.startsWith('kira')) {
      cfg.kiraKey = newKey;
      cfg.aiProvider = 'kira';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Tuyệt vời! Akko đã nạp Kira AI API Key: \`${masked}\`\n(Đã tự động chuyển Provider sang *KIRA AI* nha Senpai!) 🌟`,
        parse_mode: 'Markdown'
      });
    } else if (newKey.startsWith('sk-or-')) {
      cfg.openRouterKey = newKey;
      cfg.aiProvider = 'openrouter';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Xong ngay! Akko đã nạp OpenRouter API Key: \`${masked}\`\n(Đã chuyển Provider sang *OPENROUTER* cho Senpai nè!) 🌐`,
        parse_mode: 'Markdown'
      });
    } else {
      if (cfg.aiProvider === 'gemini') {
        cfg.geminiKey = newKey;
      } else if (cfg.aiProvider === 'bai') {
        cfg.baiKey = newKey;
      } else if (cfg.aiProvider === 'kira') {
        cfg.kiraKey = newKey;
      } else {
        cfg.openRouterKey = newKey;
      }
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Akko đã cất API Key cho *${cfg.aiProvider.toUpperCase()}*: \`${masked}\` cẩn thận rồi nha Senpai! 🔒✨`,
        parse_mode: 'Markdown'
      });
    }
  }

  if (matchCommand('sheet')) {
    const args = cleanText.split(' ');
    const url = args.slice(1).join(' ').trim();
    if (!url) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Senpai gửi link Webhook Apps Script cho Akko theo mẫu này nha: `/asheet <Link>` 📊',
        parse_mode: 'Markdown'
      });
    }
    const cfg = getBotConfig();
    cfg.googleSheetUrl = url;
    saveBotConfig(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '✅ Yay~! Akko đã ghi nhớ link Google Sheet của Senpai rùi nè! Từ giờ phiếu quét xong Akko sẽ tự động phi thẳng vào Sheet nha! 📝✨'
    });
  }

  // Handle Document (PDF or Uncompressed Image)
  if (msg.document) {
    // Chỉ áp dụng khóa topic nếu đây là Supergroup có bật Topics (Forum); Group bình thường luôn giữ nguyên 100% quy tắc cũ
    const isForumGroup = chatType === 'supergroup' && (msg.chat?.is_forum || threadId !== undefined);
    if (isForumGroup) {
      const cfg = getBotConfig();
      const groupSetting = cfg.groupTopics && cfg.groupTopics[String(chatId)];
      if (groupSetting && groupSetting.topicId !== undefined && groupSetting.topicId !== null) {
        const targetTopicId = Number(groupSetting.topicId);
        const currentTopicId = Number(threadId || 0);
        if (currentTopicId !== targetTopicId) {
          console.log(`🔇 [Akko Bot] Bỏ qua tài liệu: Thread ID (${currentTopicId}) khác với Topic đã khóa (${targetTopicId}) trong nhóm "${msg.chat?.title || chatId}".`);
          return;
        }
      }
    }

    processDocument(chatId, msg.document, null, msg.message_id, threadId).catch(err => {
      console.error('Lỗi processDocument:', err);
    });
    return;
  }

  // Handle Photo
  if (msg.photo && msg.photo.length) {
    // Chỉ áp dụng khóa topic nếu đây là Supergroup có bật Topics (Forum); Group bình thường luôn giữ nguyên 100% quy tắc cũ
    const isForumGroup = chatType === 'supergroup' && (msg.chat?.is_forum || threadId !== undefined);
    if (isForumGroup) {
      const cfg = getBotConfig();
      const groupSetting = cfg.groupTopics && cfg.groupTopics[String(chatId)];
      if (groupSetting && groupSetting.topicId !== undefined && groupSetting.topicId !== null) {
        const targetTopicId = Number(groupSetting.topicId);
        const currentTopicId = Number(threadId || 0);
        if (currentTopicId !== targetTopicId) {
          console.log(`🔇 [Akko Bot] Bỏ qua ảnh: Thread ID (${currentTopicId}) khác với Topic đã khóa (${targetTopicId}) trong nhóm "${msg.chat?.title || chatId}".`);
          return;
        }
      }
    }

    const bestPhoto = msg.photo[msg.photo.length - 1];
    processPhoto(chatId, bestPhoto, null, msg.message_id, threadId).catch(err => {
      console.error('Lỗi processPhoto:', err);
    });
    return;
  }
}

// Long Polling Loop
let offset = 0;
let isFirstPoll = true;

async function pollUpdates() {
  // 1. Dọn dẹp webhook cũ nếu có để đảm bảo getUpdates luôn mở cổng nhận tin
  try {
    const delRes = await fetch(`${TELEGRAM_API}/deleteWebhook?drop_pending_updates=false`);
    const delData = await delRes.json().catch(() => ({}));
    if (delData.ok) {
      console.log('🔗 [Akko Bot] Đã sẵn sàng cổng nhận tin nhắn Telegram!');
    }
  } catch (e) {}

  console.log('🌸 [Akko Bot] Yahhoo~! Bé Akko (@AkkoCii_bot) đã thức dậy và đang lắng nghe lệnh từ Senpai rồi nè! 🪄✨');

  while (true) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout chống nghẽn socket
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=25`, {
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const code = data?.error_code || res.status;
        const desc = data?.description || res.statusText || 'Lỗi không xác định';
        if (code === 409) {
          console.error('⚠️ [CẢNH BÁO XUNG ĐỘT 409] Đang có một tiến trình Bot khác (trên máy tính hoặc cửa sổ khác) chạy cùng Token!');
          console.error('👉 Senpai hãy tắt bot ở thiết bị kia trước để bot trên điện thoại nhận được tin nhắn nha!');
        } else {
          console.warn(`⚠️ [Telegram API Lỗi ${code}]: ${desc}`);
        }
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      if (isFirstPoll) {
        console.log('⚡ [Akko Bot] Kết nối Telegram thành công! Đang chờ tin nhắn/ảnh từ Senpai...');
        isFirstPoll = false;
      }

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          const msg = update.message || update.channel_post;
          if (msg) {
            handleMessage(msg).catch(err => console.error('Lỗi xử lý tin nhắn:', err));
          } else if (update.callback_query) {
            handleCallbackQuery(update.callback_query).catch(err => console.error('Lỗi xử lý callback:', err));
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('⚠️ [Mạng chập chờn] Đang kết nối lại Telegram sau 3s...', err.message);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Khởi chạy ngay lập tức vòng lặp nhận tin nhắn (không bị nghẽn bởi bất kỳ tác vụ nào)
pollUpdates();

// Đồng bộ danh sách câu lệnh ngầm ở background (không chặn bot)
syncTelegramBotCommands().catch(() => {});