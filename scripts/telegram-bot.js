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
  donViTinh: 'Lấy đơn vị tính viết trên phiếu (ví dụ: EA, PCS, KG, BOX, CÁI, THÙNG, BỘ, CUỘN, CÂY). Không tự suy diễn.',
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


function getBotConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (!parsed.openRouterModel) parsed.openRouterModel = 'nex-agi/nex-n2.5-pro:free';
      if (!parsed.apinexModel) parsed.apinexModel = 'free/gemini-3.8-flash';
      if (!parsed.kiraModel) parsed.kiraModel = 'qwen3.8-27b-free';
      if (!parsed.geminiModel) parsed.geminiModel = 'gemini-3.6-flash';
      if (!parsed.aiProvider) parsed.aiProvider = 'gemini';
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

  return {
    aiProvider: defaultSync.aiProvider || process.env.AI_PROVIDER || 'gemini',
    geminiKey: defaultSync.apiKey || process.env.GEMINI_API_KEY || '',
    geminiModel: defaultSync.geminiModel || process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    openRouterKey: defaultSync.openRouterKey || process.env.OPENROUTER_API_KEY || '',
    openRouterModel: defaultSync.openRouterModel || process.env.OPENROUTER_MODEL || 'nex-agi/nex-n2.5-pro:free',
    apinexKey: defaultSync.apinexKey || process.env.APINEX_API_KEY || '',
    apinexModel: defaultSync.apinexModel || process.env.APINEX_MODEL || 'free/gemini-3.8-flash',
    kiraKey: defaultSync.kiraKey || process.env.KIRA_API_KEY || '',
    kiraModel: defaultSync.kiraModel || process.env.KIRA_MODEL || 'qwen3.8-27b-free',
    googleSheetUrl: defaultSync.googleSheetUrl || process.env.GOOGLE_SHEET_URL || 'https://script.google.com/macros/s/AKfycbxvSkHl-Ebg-VDX88B-iF0BhiH6ujtJ9ZKk-MroWOlU2ky4K4IBG40zyt2qsMfBa0gE/exec',
    autoSyncSheet: defaultSync.autoSyncSheet !== undefined ? !!defaultSync.autoSyncSheet : true,
    cloudSyncCode: defaultSync.code || '',
    selectedColumns: defaultSync.selectedColumns && defaultSync.selectedColumns.length ? defaultSync.selectedColumns : DEFAULT_COLUMNS,
    fieldPrompts: defaultSync.fieldPrompts || DEFAULT_FIELD_PROMPTS
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
      let val = item?.[k] ?? '';
      if (k === 'soOSPO') val = formatOSPO(val);
      out[k] = typeof val === 'string' ? val.trim() : String(val || '');
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
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const toFormatted = (parsed) => {
    if (Array.isArray(parsed.rows) && !Array.isArray(parsed.items)) {
      parsed.items = parsed.rows
        .filter((r) => Array.isArray(r) || (typeof r === 'object' && r !== null))
        .map((row) => {
          if (typeof row === 'object' && !Array.isArray(row)) return row;
          const obj = {};
          selectedColumns.forEach((colKey, idx) => { obj[colKey] = row[idx] ?? ''; });
          return obj;
        });
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
  if (spMatch) detectedSoPhieu = spMatch[1].trim();

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
  return { soPhieu: detectedSoPhieu, items: [{ ten: text }] };
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

async function scanWithApinex(base64Data, mimeType, key, model, selectedColumns, fieldPrompts) {
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

  const res = await fetch('https://api.apinex.bond/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key.trim(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'free/gemini-3.8-flash',
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
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || ('APInex Error: ' + res.status));
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Không nhận được dữ liệu từ APInex');

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
    throw new Error('Dữ liệu APInex trả về không đúng định dạng JSON');
  }
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
    return {
      provider: 'gemini',
      providerName: 'Google Gemini',
      model: cfg.geminiModel || 'gemini-3.6-flash',
      key: cfg.geminiKey,
      keyHint: 'Google Gemini API Key (`AIzaSy...`)'
    };
  } else if (provider === 'apinex') {
    return {
      provider: 'apinex',
      providerName: 'APInex (Free 1M)',
      model: cfg.apinexModel || 'free/gemini-3.8-flash',
      key: cfg.apinexKey,
      keyHint: 'APInex API Key (`sk-apx...`)'
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
        errMsg = `Mô hình Free [${effectiveModel}] đang tạm thời quá tải hoặc ảnh gửi quá nhanh (502 Bad Gateway). Vui lòng bấm [Thử lại 🔄] sau vài giây hoặc đổi mô hình /model qwen3.8-27b-free.`;
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
    if (!cfg.geminiKey) {
      throw new Error('Chưa có Google Gemini API Key! Gõ /key AIzaSy... hoặc đồng bộ /sync <Mã>');
    }
    const model = cfg.geminiModel || 'gemini-3.6-flash';
    const ocrRaw = await scanWithGemini(base64Data, mimeType, cfg.geminiKey, selectedColumns, fieldPrompts, model);
    return { ocrRaw, modelUsed: `Gemini (${model})` };
  } else if (provider === 'apinex') {
    if (!cfg.apinexKey) {
      throw new Error('Chưa có APInex API Key! Gõ /key sk-apx... hoặc đồng bộ /sync <Mã>');
    }
    const model = cfg.apinexModel || 'free/gemini-3.8-flash';
    const ocrRaw = await scanWithApinex(base64Data, mimeType, cfg.apinexKey, model, selectedColumns, fieldPrompts);
    return { ocrRaw, modelUsed: `APInex (${model})` };
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

async function sendTelegram(method, body) {
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
    if (it.donViTinh) line += ` ${sanitizeForMd(it.donViTinh)}`;
    if (it.soPallet) line += ` | Pallet: ${sanitizeForMd(it.soPallet)}`;
    if (it.ghiChu) line += ` (${sanitizeForMd(it.ghiChu)})`;
    summaryText += line + '\n';
  });

  return summaryText;
}

async function processDocument(chatId, doc, existingWaitMsgId = null, originalUserMsgId = null) {
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
            pageNum: p + 1
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
          if (it.donViTinh) line += ` ${sanitizeForMd(it.donViTinh)}`;
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
    RETRY_TASKS.set(retryId, { type: 'document', doc, chatId });

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

async function processPhoto(chatId, bestPhoto, existingWaitMsgId = null, originalUserMsgId = null) {
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
    RETRY_TASKS.set(retryId, { type: 'photo', photo: bestPhoto, chatId });

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

    if (task.type === 'document') {
      await processDocument(task.chatId, task.doc, messageId, null);
    } else if (task.type === 'photo') {
      await processPhoto(task.chatId, task.photo, messageId, null);
    } else if (task.type === 'pdf_page') {
      const cfg = getBotConfig();
      const info = getActiveProviderInfo(cfg);
      const waitMsg = await sendTelegram('sendMessage', {
        chat_id: task.chatId,
        text: `⏳ Akko đang quét lại Trang ${task.pageNum} bằng mô hình \`${info.model}\` cho Senpai nè... 🌸`,
        parse_mode: 'Markdown'
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
  let cleanText = (msg.text || '').trim();
  // Hỗ trợ lệnh trong nhóm (ví dụ /status@AkkoCii_bot -> /status)
  if (cleanText.startsWith('/')) {
    cleanText = cleanText.replace(/@\w+/, '');
  }

  if (cleanText.startsWith('/start') || cleanText.startsWith('/help')) {
    const cfg = getBotConfig();
    const info = getActiveProviderInfo(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '👋 *Yahhoo~! Chào mừng Senpai đến với bé Akko!* 📦🪄✨\n\n' +
        'Em là *Akko* - phù thủy trợ lý AI chuyên quét và đọc phiếu xuất kho siêu tốc của Senpai đây ạ! (≧◡≦) ♡\n\n' +
        '📸 *Cách sai bảo Akko:*\n' +
        '• Senpai chỉ cần thả nhẹ ảnh hoặc file PDF phiếu kho vào đây (hoặc vào group), Akko sẽ tự động đọc chuẩn từng chữ viết tay và bay đi lưu vào Google Sheet liền nha!\n' +
        '• Khi làm xong việc, Akko sẽ tự dọn dẹp ảnh/file gốc để căn phòng chat của Senpai luôn sạch sẽ ngăn nắp nha~ 🧹\n' +
        '• Nếu mạng giật lag rớt gói tin, Akko có sẵn nút 🔄 *Thử Quét Lại* để Senpai bấm cái là Akko làm lại liền!\n\n' +
        '🪄 *Phép thuật quản lý của Akko:*\n' +
        '• `/provider <gemini|apinex|kira|openrouter>`: Đổi phép thuật AI (hoặc gõ số 1-4 nè)\n' +
        '• `/model <Tên>`: Chọn mô hình AI mà Senpai thích\n' +
        '• `/key <Key>`: Nạp API key cho Akko (tự nhận diện Google `AIzaSy...`, APInex `sk-apx...`, Kira `kira_...`, OpenRouter `sk-or-...`)\n' +
        '• `/status`: Xem Akko đang có những gì trong balo\n' +
        '• `/sync <Mã>`: Kéo toàn bộ phép thuật từ Web về (Ví dụ: `/sync KHO-01`)\n' +
        '• `/sheet <Link>`: Cập nhật link Google Sheet của Senpai\n\n' +
        `🌸 *Hiện tại:* Phép thuật *${info.providerName}* | Mô hình \`${info.model}\``,
      parse_mode: 'Markdown'
    });
  }

  if (cleanText.startsWith('/status')) {
    const cfg = getBotConfig();
    const info = getActiveProviderInfo(cfg);
    const maskedGeminiKey = cfg.geminiKey ? (cfg.geminiKey.slice(0, 8) + '...' + cfg.geminiKey.slice(-4)) : 'Chưa có';
    const maskedApxKey = cfg.apinexKey ? (cfg.apinexKey.slice(0, 10) + '...' + cfg.apinexKey.slice(-4)) : 'Chưa có';
    const maskedKiraKey = cfg.kiraKey ? (cfg.kiraKey.slice(0, 8) + '...' + cfg.kiraKey.slice(-4)) : 'Chưa có';
    const maskedOrKey = cfg.openRouterKey ? (cfg.openRouterKey.slice(0, 10) + '...' + cfg.openRouterKey.slice(-4)) : 'Chưa có';

    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '⚙️ *BẢNG TRẠNG THÁI CỦA BÉ AKKO NÈ SENPAI:* 🌸✨\n\n' +
        `🤖 *AI ĐANG HOẠT ĐỘNG:*\n` +
        `• Phép thuật chính: *${info.providerName.toUpperCase()}* 🎯\n` +
        `• Mô hình đang chạy: \`${info.model}\` ✨\n\n` +
        `📋 *DANH SÁCH MÔ HÌNH AKKO ĐANG CÓ:*\n` +
        `• Google Gemini: \`${cfg.geminiModel || 'gemini-3.6-flash'}\` (\`${maskedGeminiKey}\`)\n` +
        `• APInex: \`${cfg.apinexModel || 'free/gemini-3.8-flash'}\` (\`${maskedApxKey}\`)\n` +
        `• Kira AI: \`${cfg.kiraModel || 'qwen3.8-27b-free'}\` (\`${maskedKiraKey}\`)\n` +
        `• OpenRouter: \`${cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free'}\` (\`${maskedOrKey}\`)\n\n` +
        `📊 *GOOGLE SHEET:*\n` +
        `• Trạng thái: ${cfg.googleSheetUrl ? '✅ Đã kết nối sẵn sàng' : '❌ Chưa có link nè Senpai'}\n` +
        `• Tự động đẩy: *${cfg.autoSyncSheet ? 'BẬT' : 'TẮT'}*\n\n` +
        `☁️ *MÃ CLOUD SYNC:*\n` +
        `• Trạng thái: \`${maskSyncCode(cfg.cloudSyncCode)}\` 🔒\n\n` +
        '👉 Senpai gõ `/sync <Mã>` để Akko cập nhật nhanh từ Web nha!\n' +
        '👉 Gõ `/provider <1-4>` để đổi nhà cung cấp AI cái rụp nè~',
      parse_mode: 'Markdown'
    });
  }

  if (cleanText.startsWith('/sync')) {
    const args = cleanText.split(' ');
    const code = (args[1] || '').trim().toUpperCase();
    if (!code) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Senpai ơi, nhớ nhập mã đồng bộ nha! Ví dụ: `/sync KHO-01` nè~ 🎀',
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
            `2. Hoặc nếu chạy khác mạng, dùng lệnh \`/server <link_web>\` để chỉ đường cho Akko.\n` +
            `3. Hoặc gõ trực tiếp \`/key <Key>\` để đưa key cho Akko giữ luôn nè!`,
          parse_mode: 'Markdown'
        });
      }

      // Cập nhật nhà cung cấp AI đồng bộ
      if (cloudData.aiProvider) {
        let p = String(cloudData.aiProvider).toLowerCase().trim();
        if (p === 'google' || p === 'gg') p = 'gemini';
        if (p === 'apx') p = 'apinex';
        if (p === 'kiraai') p = 'kira';
        if (p === 'or') p = 'openrouter';
        cfg.aiProvider = p;
      }

      // Cập nhật model từng nhà cung cấp
      if (cloudData.openRouterModel) cfg.openRouterModel = String(cloudData.openRouterModel).trim();
      if (cloudData.apinexModel) cfg.apinexModel = String(cloudData.apinexModel).trim();
      if (cloudData.kiraModel) cfg.kiraModel = String(cloudData.kiraModel).trim();
      if (cloudData.geminiModel) cfg.geminiModel = String(cloudData.geminiModel).trim();

      // Cập nhật API Keys
      if (cloudData.apiKey !== undefined && cloudData.apiKey !== null) {
        const val = String(cloudData.apiKey).trim();
        if (val || !cfg.geminiKey) cfg.geminiKey = val;
      }
      if (cloudData.openRouterKey !== undefined && cloudData.openRouterKey !== null) {
        const val = String(cloudData.openRouterKey).trim();
        if (val || !cfg.openRouterKey) cfg.openRouterKey = val;
      }
      if (cloudData.apinexKey !== undefined && cloudData.apinexKey !== null) {
        const val = String(cloudData.apinexKey).trim();
        if (val || !cfg.apinexKey) cfg.apinexKey = val;
      }
      if (cloudData.kiraKey !== undefined && cloudData.kiraKey !== null) {
        const val = String(cloudData.kiraKey).trim();
        if (val || !cfg.kiraKey) cfg.kiraKey = val;
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
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🎉 *Yatta~! Akko đã đồng bộ thành công từ Cloud* 【${maskSyncCode(code)}】 *rồi nè Senpai ơi!* ٩(◕‿◕｡)۶\n\n` +
          `• Nguồn máy chủ: \`${matchedSource}\`\n` +
          `• Nhà cung cấp đang chọn: *${info.providerName.toUpperCase()}* 🎯\n` +
          `• Mô hình AI đang chạy: \`${info.model}\`\n` +
          `• Model APInex: \`${cfg.apinexModel || 'free/gemini-3.8-flash'}\`\n` +
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

  if (cleanText.startsWith('/server')) {
    const args = cleanText.split(' ');
    const sUrl = (args[1] || '').trim();
    const cfg = getBotConfig();
    if (!sUrl) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🌐 Dạ Senpai! Máy chủ Web hiện tại của Akko là: \`${cfg.serverUrl || 'https://scanzzz.vercel.app'}\` nè~\n\n` +
          '• Đổi máy chủ: `/server <URL>`\n' +
          '• Ví dụ Cloud: `/server https://scanzzz.vercel.app`\n' +
          '• Hoặc mạng LAN (Termux chung Wifi máy tính): `/server http://192.168.1.x:3000`',
        parse_mode: 'Markdown'
      });
    }
    cfg.serverUrl = sUrl;
    saveBotConfig(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Tuân lệnh Senpai! Akko đã ghi nhớ máy chủ Web mới: \`${sUrl}\` rùi nè!\nGiờ Senpai có thể gõ \`/sync <Mã>\` để kéo dữ liệu từ máy chủ này về nha~ ✨`,
      parse_mode: 'Markdown'
    });
  }

  if (cleanText.startsWith('/provider')) {
    const args = cleanText.split(' ');
    const prov = (args[1] || '').trim().toLowerCase();
    const cfg = getBotConfig();

    if (prov === 'gemini' || prov === 'google' || prov === 'gg' || prov === '1') {
      cfg.aiProvider = 'gemini';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Dạ Senpai! Akko đã chuyển sang dùng sức mạnh của *Google Gemini* (Mô hình: \`${cfg.geminiModel || 'gemini-3.6-flash'}\`) rồi nè! ⚡`,
        parse_mode: 'Markdown'
      });
    } else if (prov === 'apinex' || prov === 'apx' || prov === '2') {
      cfg.aiProvider = 'apinex';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Tuân lệnh! Akko đã chuyển sang nhà cung cấp *APInex* (Mô hình: \`${cfg.apinexModel || 'free/gemini-3.8-flash'}\`) nha Senpai! 🔥`,
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
        text: '💡 Senpai muốn Akko dùng AI nào nè? Gõ `/provider <gemini|apinex|kira|openrouter>` (hoặc gõ số 1-4 nha):\n' +
          `• 1: Google Gemini (\`${cfg.geminiModel || 'gemini-3.6-flash'}\`)\n` +
          `• 2: APInex (\`${cfg.apinexModel || 'free/gemini-3.8-flash'}\`)\n` +
          `• 3: Kira AI (\`${cfg.kiraModel || 'qwen3.8-27b-free'}\`)\n` +
          `• 4: OpenRouter (\`${cfg.openRouterModel || 'nex-agi/nex-n2.5-pro:free'}\`)\n\n` +
          `🎯 Hiện tại Akko đang dùng: *${info.providerName}* (\`${info.model}\`)`,
        parse_mode: 'Markdown'
      });
    }
  }

  if (cleanText.startsWith('/model')) {
    const args = cleanText.split(' ');
    const modelName = args.slice(1).join(' ').trim();
    if (!modelName) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '💡 *Senpai ơi, đây là danh sách các mô hình AI xịn xò Akko gợi ý nè:* 🌸\n\n' +
          '⚡ *Google Gemini trực tiếp:*\n' +
          '• `/model gemini-3.6-flash` (Mô hình chính - Siêu nhanh & chuẩn)\n\n' +
          '🌟 *Kira AI (kiraai.vn - Free 100M tokens/ngày):*\n' +
          '• `/model qwen3.8-27b-free` (Khuyên dùng - Vision đọc phiếu rất tốt)\n' +
          '• `/model qwen3.8-flash-free` (Nhanh & nhẹ)\n' +
          '• `/model glm-5.3-flash-free` (Đa phương thức)\n' +
          '• `/model mimo-v2.5-free`\n' +
          '• `/model hy3-free`\n' +
          '• `/model kira-auto`\n' +
          '• `/model qwen3.8-max`\n\n' +
          '🔥 *APInex (Free 1M Token):*\n' +
          '• `/model free/gemini-3.8-flash` (Khuyên dùng - Cực nhanh)\n' +
          '• `/model free/qwen-3.8-max` (Đỉnh cao chữ viết tay tiếng Việt)\n' +
          '• `/model free/gpt-5.6-luna` (Ổn định, bóc tách cấu trúc cột)\n' +
          '• `/model free/muse-spark-1.3` (Nhẹ nhàng, tiết kiệm)\n\n' +
          '🌐 *OpenRouter (Miễn phí & Tối ưu OCR):*\n' +
          '• `/model nex-agi/nex-n2.5-pro:free` (Khuyên dùng - Rất nhanh & chuẩn)\n' +
          '• `/model nex-agi/nex-n2.5-mini:free` (Siêu nhẹ & tốc độ cao)\n' +
          '• `/model minimax/minimax-m3:free`\n' +
          '• `/model google/gemini-2.5-flash`\n' +
          '• `/model qwen/qwen2.5-vl-72b-instruct`\n\n' +
          '_(Senpai có thể gõ `/model <mã>` để dạy Akko dùng mã model tùy ý nha)_',
        parse_mode: 'Markdown'
      });
    }

    const cfg = getBotConfig();
    const lowerModel = modelName.toLowerCase();

    if (lowerModel.startsWith('gemini') || lowerModel.includes('gemini-3.6') || lowerModel === 'gemini-1.5-flash') {
      cfg.aiProvider = 'gemini';
      cfg.geminiModel = modelName;
    } else if (modelName.startsWith('free/')) {
      cfg.aiProvider = 'apinex';
      cfg.apinexModel = modelName;
    } else if (
      modelName.startsWith('kira_') ||
      modelName.startsWith('kira-') ||
      lowerModel.includes('-free') ||
      lowerModel.startsWith('qwen3.8') ||
      lowerModel.startsWith('glm-5.3') ||
      lowerModel.startsWith('mimo-') ||
      lowerModel.startsWith('hy3-')
    ) {
      cfg.aiProvider = 'kira';
      cfg.kiraModel = modelName;
    } else if (modelName.includes('/') || modelName.includes(':free')) {
      cfg.aiProvider = 'openrouter';
      cfg.openRouterModel = modelName;
    } else {
      if (cfg.aiProvider === 'gemini') {
        cfg.geminiModel = modelName;
      } else if (cfg.aiProvider === 'apinex') {
        cfg.apinexModel = modelName;
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

  if (cleanText.startsWith('/key')) {
    const args = cleanText.split(' ');
    const newKey = (args[1] || '').trim();
    if (!newKey) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Senpai gửi chìa khóa API key cho Akko theo cú pháp này nha:\n`/key <API_Key>`\n' +
          '• Google Key: bắt đầu bằng `AIzaSy...` (Akko sẽ tự chuyển sang Google Gemini)\n' +
          '• APInex Key: bắt đầu bằng `sk-apx...` (Akko sẽ tự chuyển sang APInex)\n' +
          '• Kira Key: bắt đầu bằng `kira_...` (Akko sẽ tự chuyển sang Kira AI)\n' +
          '• OpenRouter Key: bắt đầu bằng `sk-or-` (Akko sẽ tự chuyển sang OpenRouter)',
        parse_mode: 'Markdown'
      });
    }

    const cfg = getBotConfig();
    const masked = newKey.slice(0, 10) + '...' + newKey.slice(-4);

    if (newKey.startsWith('AIzaSy')) {
      cfg.geminiKey = newKey;
      cfg.aiProvider = 'gemini';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Yatta~! Akko đã cất Google Gemini API Key vào ví rùi nè: \`${masked}\`\n(Akko cũng tự động chuyển Provider sang *GOOGLE GEMINI* luôn rùi đó Senpai!) ✨`,
        parse_mode: 'Markdown'
      });
    } else if (newKey.startsWith('sk-apx')) {
      cfg.apinexKey = newKey;
      cfg.aiProvider = 'apinex';
      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Yay~! Akko đã lưu APInex API Key: \`${masked}\`\n(Đã tự động chuyển Provider sang *APINEX* cho Senpai nè!) 🔥`,
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
      } else if (cfg.aiProvider === 'apinex') {
        cfg.apinexKey = newKey;
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

  if (cleanText.startsWith('/sheet')) {
    const args = cleanText.split(' ');
    const url = args.slice(1).join(' ').trim();
    if (!url) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Senpai gửi link Webhook Apps Script cho Akko theo mẫu này nha: `/sheet <Link>` 📊',
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
    processDocument(chatId, msg.document, null, msg.message_id).catch(err => {
      console.error('Lỗi processDocument:', err);
    });
    return;
  }

  // Handle Photo
  if (msg.photo && msg.photo.length) {
    const bestPhoto = msg.photo[msg.photo.length - 1];
    processPhoto(chatId, bestPhoto, null, msg.message_id).catch(err => {
      console.error('Lỗi processPhoto:', err);
    });
    return;
  }
}

// Long Polling Loop
let offset = 0;
async function pollUpdates() {
  while (true) {
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=25`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message) {
            handleMessage(update.message).catch(err => console.error('Handle message error:', err));
          } else if (update.callback_query) {
            handleCallbackQuery(update.callback_query).catch(err => console.error('Handle callback error:', err));
          }
        }
      }
    } catch (err) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

console.log('🌸 [Akko Bot] Yahhoo~! Bé Akko (@AkkoCii_bot) đã thức dậy và sẵn sàng nhận lệnh từ Senpai rồi nè! 🪄✨');
pollUpdates();