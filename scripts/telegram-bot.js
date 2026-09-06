const fs = require('fs');
const path = require('path');

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
  soOSPO: 'Chỉ lấy số, không lấy thêm bất kỳ chữ hay ký tự nào. Tự động điều chỉnh theo định dạng 5 chữ số (xxxxx): nếu trên phiếu ghi dạng TiềnTố-HậuTố (ví dụ: 8-999 -> 80999, 8-99 -> 80099, 8-9 -> 80009, 8-1999 -> 81999, 8-x999 -> 8x999) thì phần sau dấu gạch nối luôn được bù số 0 ở đầu thành 4 chữ số ghép với số đầu.',
  donViTinh: 'Lấy đơn vị tính viết trên phiếu (ví dụ: EA, PCS, KG, BOX, CÁI, THÙNG, BỘ, CUỘN, CÂY). Không tự suy diễn.',
  soLuongChungTu: 'Chỉ lấy số lượng theo chứng từ (chỉ trả về số thuần). Nếu có chữ viết tay sửa đổi/ghi đè lên số in, ưu tiên lấy số viết tay mới nhất.',
  soLuongThucNhap: 'Chỉ lấy số lượng thực nhập/thực xuất (chỉ trả về số thuần). Đọc kỹ các con số viết tay bằng bút bi/bút mực.',
  soPallet: 'Lấy số pallet hoặc mã pallet viết tay/in sẵn. Giữ nguyên số 0 ở đầu nếu có.',
  ghiChu: 'Lấy ghi chú viết tay hoặc in cùng dòng hàng nếu có; nếu trống thì trả về chuỗi rỗng.',
};

function getBotConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}

  let defaultSync = {};
  try {
    if (fs.existsSync(SYNC_STORE)) {
      const store = JSON.parse(fs.readFileSync(SYNC_STORE, 'utf8'));
      if (store['VIP888']) defaultSync = store['VIP888'];
    }
  } catch (e) {}

  return {
    aiProvider: defaultSync.aiProvider || 'openrouter',
    openRouterKey: defaultSync.openRouterKey || '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',
    openRouterModel: defaultSync.openRouterModel || 'minimax/minimax-m3:free',
    geminiKey: defaultSync.apiKey || '',
    googleSheetUrl: defaultSync.googleSheetUrl || 'https://script.google.com/macros/s/AKfycbxvSkHl-Ebg-VDX88B-iF0BhiH6ujtJ9ZKk-MroWOlU2ky4K4IBG40zyt2qsMfBa0gE/exec',
    autoSyncSheet: true,
    cloudSyncCode: defaultSync.code || 'VIP888',
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
  const matchWithSep = str.match(/(\d+)\s*[-/._\s]\s*(\d+)/);
  if (matchWithSep) {
    return `${matchWithSep[1]}${matchWithSep[2].padStart(4, '0')}`;
  }
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

async function scanWithOpenRouter(base64Data, mimeType, key, model, selectedColumns, fieldPrompts) {
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

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key.trim(),
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://scanzzz.vercel.app',
      'X-Title': 'Scan Pro Max Telegram Bot'
    },
    body: JSON.stringify({
      model: model || 'minimax/minimax-m3:free',
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
    throw new Error(err.error?.message || ('OpenRouter Error: ' + res.status));
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Không nhận được dữ liệu từ OpenRouter');

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
    throw new Error('Dữ liệu AI trả về không đúng định dạng JSON');
  }
}

async function syncToGoogleSheet(sheetUrl, soPhieu, items) {
  if (!sheetUrl || !sheetUrl.startsWith('https://script.google.com/')) {
    return { success: false, message: 'Chưa cấu hình Link Google Sheet Webhook' };
  }
  const payload = {
    soPhieu: soPhieu || '',
    pageNum: 1,
    items: items.map(item => ({ ...item, soPhieu: item.soPhieu || soPhieu || '' }))
  };

  const res = await fetch(sheetUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const resText = await res.text();
  try {
    const data = JSON.parse(resText);
    return { success: data.status === 'success' || res.ok, message: data.message || 'Đã ghi thành công' };
  } catch {
    return { success: res.ok, message: res.ok ? 'Đã ghi vào Google Sheet' : resText.slice(0, 100) };
  }
}

async function sendTelegram(method, body) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

function buildSummaryText(soPhieu, items, model, sheetStatusText, historyId) {
  let summaryText = `📋 *KẾT QUẢ QUÉT PHIẾU*\n`;
  summaryText += `• *Số phiếu:* ` + (soPhieu || 'Không rõ') + `\n`;
  summaryText += `• *Số mặt hàng:* ` + items.length + ` dòng\n`;
  summaryText += `• *Mô hình:* ` + model + `\n`;
  if (sheetStatusText) summaryText += `• *Google Sheet:* ` + sheetStatusText + `\n`;
  summaryText += '\n📝 *Danh sách chi tiết:*\n';

  items.forEach((it, idx) => {
    let line = `${idx + 1}. *${it.ten || '---'}*`;
    if (it.soOSPO) line += ` | PO: ${it.soOSPO}`;
    const qty = it.soLuongChungTu || it.soLuongThucNhap;
    if (qty) line += ` | SL: ${qty}`;
    if (it.donViTinh) line += ` ${it.donViTinh}`;
    if (it.soPallet) line += ` | Pallet: ${it.soPallet}`;
    if (it.ghiChu) line += ` (${it.ghiChu})`;
    summaryText += line + '\n';
  });

  return summaryText;
}

async function handleCallbackQuery(cbq) {
  const data = cbq.data || '';
  const chatId = cbq.message?.chat?.id;
  const messageId = cbq.message?.message_id;

  if (data.startsWith('resync_')) {
    const histId = data.replace('resync_', '');
    const hist = getBotHistory();
    const item = hist[histId];

    if (!item || !item.items || !item.items.length) {
      return sendTelegram('answerCallbackQuery', {
        callback_query_id: cbq.id,
        text: '⚠️ Không tìm thấy dữ liệu phiếu này trong bộ nhớ bot để đồng bộ lại!',
        show_alert: true
      });
    }

    const cfg = getBotConfig();
    if (!cfg.googleSheetUrl) {
      return sendTelegram('answerCallbackQuery', {
        callback_query_id: cbq.id,
        text: '❌ Chưa cài đặt link Google Sheet! Hãy gửi lệnh /sheet <link>',
        show_alert: true
      });
    }

    await sendTelegram('answerCallbackQuery', {
      callback_query_id: cbq.id,
      text: '⏳ Đang đồng bộ lại sang Google Sheet...'
    });

    const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, item.soPhieu, item.items);
    const sheetStatusText = sheetResult.success ? `✅ Đã đồng bộ lại thành công (${new Date().toLocaleTimeString('vi-VN')})` : (`❌ Lỗi: ` + sheetResult.message);

    const updatedText = buildSummaryText(item.soPhieu, item.items, item.model, sheetStatusText, histId);

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🔄 Đồng Bộ Lại Google Sheet', callback_data: `resync_${histId}` }
        ]
      ]
    };

    if (cfg.googleSheetUrl.includes('macros/s/')) {
      replyMarkup.inline_keyboard[0].push({
        text: '📊 Mở Google Sheet',
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
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '👋 Chào mừng bạn đến với *Scan Phiếu Kho AI Bot*! 📦🤖\n\n' +
        '📸 *Cách dùng:*\n' +
        '• Gửi ảnh hoặc file PDF phiếu kho trực tiếp vào đây (hoặc vào group), bot sẽ tự động đọc (hỗ trợ cả PDF nhiều trang) và đồng bộ vào Google Sheet!\n' +
        '• Sau khi quét xong, bot có nút *[🔄 Đồng Bộ Lại]* bên dưới mỗi phiếu để bấm đẩy lại bất cứ lúc nào!\n\n' +
        '⚙️ *Các lệnh quản lý:*\n' +
        '• `/status`: Xem cấu hình AI & Google Sheet hiện tại\n' +
        '• `/sync <Mã>`: Kéo cấu hình từ Web về (Ví dụ: `/sync VIP888`)\n' +
        '• `/model <Tên>`: Đổi mô hình AI (Ví dụ: `/model minimax/minimax-m3:free`)\n' +
        '• `/sheet <Link>`: Cập nhật link Webhook Google Sheet\n\n' +
        `Mô hình hiện tại: *${cfg.openRouterModel}*`,
      parse_mode: 'Markdown'
    });
  }

  if (cleanText.startsWith('/status')) {
    const cfg = getBotConfig();
    const maskedKey = cfg.openRouterKey ? (cfg.openRouterKey.slice(0, 10) + '...' + cfg.openRouterKey.slice(-4)) : 'Chưa có';
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '⚙️ *CẤU HÌNH BOT HIỆN TẠI:*\n\n' +
        `• Nhà cung cấp: *${cfg.aiProvider.toUpperCase()}*\n` +
        `• Mô hình AI: *${cfg.openRouterModel}*\n` +
        `• OpenRouter Key: \`${maskedKey}\`\n` +
        `• Google Sheet: ${cfg.googleSheetUrl ? '✅ Đã kết nối' : '❌ Chưa có'}\n` +
        `• Tự động đẩy Sheet: *${cfg.autoSyncSheet ? 'BẬT' : 'TẮT'}*\n` +
        `• Mã Cloud Sync: *${cfg.cloudSyncCode || 'Chưa liên kết'}*\n\n` +
        '👉 Gõ `/sync <Mã>` để cập nhật nhanh từ Web.',
      parse_mode: 'Markdown'
    });
  }

  if (cleanText.startsWith('/sync')) {
    const args = cleanText.split(' ');
    const code = (args[1] || '').trim().toUpperCase();
    if (!code) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Vui lòng nhập mã đồng bộ! Ví dụ: `/sync VIP888`',
        parse_mode: 'Markdown'
      });
    }

    try {
      let cloudData = null;
      try {
        const res = await fetch(`http://localhost:3000/api/sync?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const json = await res.json();
          cloudData = json.data;
        }
      } catch (e) {}

      if (!cloudData && fs.existsSync(SYNC_STORE)) {
        const store = JSON.parse(fs.readFileSync(SYNC_STORE, 'utf8'));
        if (store[code]) cloudData = store[code];
      }

      if (!cloudData) {
        return sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `❌ Không tìm thấy dữ liệu cho mã đồng bộ [${code}] trên server!`
        });
      }

      const cfg = getBotConfig();
      if (cloudData.openRouterKey) cfg.openRouterKey = cloudData.openRouterKey;
      if (cloudData.openRouterModel) cfg.openRouterModel = cloudData.openRouterModel;
      if (cloudData.googleSheetUrl) cfg.googleSheetUrl = cloudData.googleSheetUrl;
      if (cloudData.aiProvider) cfg.aiProvider = cloudData.aiProvider;
      if (cloudData.apiKey) cfg.geminiKey = cloudData.apiKey;
      if (cloudData.selectedColumns && cloudData.selectedColumns.length) cfg.selectedColumns = cloudData.selectedColumns;
      if (cloudData.fieldPrompts) cfg.fieldPrompts = cloudData.fieldPrompts;
      cfg.cloudSyncCode = code;

      saveBotConfig(cfg);
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: `🎉 *Đã đồng bộ thành công từ Cloud [${code}]!*\n\n` +
          `• Mô hình AI: *${cfg.openRouterModel}*\n` +
          `• Google Sheet: ${cfg.googleSheetUrl ? '✅ Đã kết nối' : 'Chưa có'}\n` +
          `• Số cột trích xuất: ${cfg.selectedColumns.length} cột`,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      return sendTelegram('sendMessage', { chat_id: chatId, text: '❌ Lỗi đồng bộ: ' + e.message });
    }
  }

  if (cleanText.startsWith('/model')) {
    const args = cleanText.split(' ');
    const modelName = args.slice(1).join(' ').trim();
    if (!modelName) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '💡 Các mô hình gợi ý:\n' +
          '• `/model minimax/minimax-m3:free` (Miễn phí 100%)\n' +
          '• `/model google/gemini-2.5-flash` (Nhanh & chuẩn)\n' +
          '• `/model qwen/qwen2.5-vl-72b-instruct` (Chữ viết tay)',
        parse_mode: 'Markdown'
      });
    }
    const cfg = getBotConfig();
    cfg.openRouterModel = modelName;
    saveBotConfig(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Đã đổi mô hình AI sang: *${modelName}*`,
      parse_mode: 'Markdown'
    });
  }

  if (cleanText.startsWith('/key')) {
    const args = cleanText.split(' ');
    const newKey = (args[1] || '').trim();
    if (!newKey || !newKey.startsWith('sk-or-')) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Cú pháp: `/key <OpenRouter_API_Key>`\n(Key OpenRouter thường bắt đầu bằng `sk-or-v1-`...)',
        parse_mode: 'Markdown'
      });
    }
    const cfg = getBotConfig();
    cfg.openRouterKey = newKey;
    saveBotConfig(cfg);
    const masked = newKey.slice(0, 10) + '...' + newKey.slice(-4);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Đã cập nhật OpenRouter API Key thành công: \`${masked}\``,
      parse_mode: 'Markdown'
    });
  }

  if (cleanText.startsWith('/sheet')) {
    const args = cleanText.split(' ');
    const url = args.slice(1).join(' ').trim();
    if (!url) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Cú pháp: `/sheet <Link Webhook Apps Script>`',
        parse_mode: 'Markdown'
      });
    }
    const cfg = getBotConfig();
    cfg.googleSheetUrl = url;
    saveBotConfig(cfg);
    return sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '✅ Đã cập nhật link Google Sheet thành công!'
    });
  }

  // Handle Document (PDF or Uncompressed Image)
  if (msg.document) {
    const cfg = getBotConfig();
    if (!cfg.openRouterKey) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Chưa có OpenRouter API Key! Hãy gõ `/sync VIP888` để đồng bộ cấu hình từ web.'
      });
    }

    const doc = msg.document;
    const fileName = (doc.file_name || '').toLowerCase();
    const mimeType = (doc.mime_type || '').toLowerCase();
    const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf');
    const isImage = mimeType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp');

    if (!isPdf && !isImage) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Bot chỉ hỗ trợ nhận file ảnh (JPG, PNG, WebP) hoặc file tài liệu PDF (.pdf).'
      });
    }

    const waitMsg = await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: isPdf ? '📥 Đang nhận file PDF và phân tích các trang bằng AI...' : '📥 Đang nhận file ảnh và phân tích phiếu kho bằng AI...'
    });
    const waitMsgId = waitMsg.result?.message_id;

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
            text: `📄 File PDF có *${totalPages} trang*. Bắt đầu quét bằng mô hình *${cfg.openRouterModel}*...`,
            parse_mode: 'Markdown'
          });
        }

        const pageResults = [];

        for (let p = 0; p < totalPages; p++) {
          if (waitMsgId) {
            await sendTelegram('editMessageText', {
              chat_id: chatId,
              message_id: waitMsgId,
              text: `⏳ Đang quét trang *${p + 1}/${totalPages}* bằng mô hình *${cfg.openRouterModel}*...`,
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

          const pageOcr = await scanWithOpenRouter(
            pageBase64,
            'image/png',
            cfg.openRouterKey,
            cfg.openRouterModel,
            cfg.selectedColumns || DEFAULT_COLUMNS,
            cfg.fieldPrompts || DEFAULT_FIELD_PROMPTS
          );

          const pageItems = parseOcrResultToItems(pageOcr, cfg.selectedColumns || DEFAULT_COLUMNS);
          const pageSoPhieu = (pageOcr.soPhieu || '').trim();

          pageResults.push({
            pageNum: p + 1,
            soPhieu: pageSoPhieu,
            items: pageItems
          });
        }

        // Nhóm các trang theo số phiếu riêng biệt
        const groups = [];
        for (const res of pageResults) {
          const sPhieu = res.soPhieu;
          // Nếu có số phiếu xác định và trùng với nhóm trước đó thì gộp vào nhóm đó
          if (sPhieu && groups.length > 0 && groups[groups.length - 1].soPhieu === sPhieu) {
            const currentGroup = groups[groups.length - 1];
            currentGroup.pages.push(res.pageNum);
            res.items.forEach(it => {
              if (totalPages > 1 && !it.ghiChu) it.ghiChu = `Trang ${res.pageNum}`;
              currentGroup.items.push(it);
            });
          } else {
            // Nhóm phiếu mới (khác số phiếu hoặc không rõ số phiếu)
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
            text: `📊 Đã trích xuất xong ${groups.length} phiếu từ ${totalPages} trang! Đang xử lý đồng bộ Google Sheet...`
          });
        }

        // Xử lý gửi kết quả và đồng bộ từng phiếu riêng biệt
        for (let gIdx = 0; gIdx < groups.length; gIdx++) {
          const grp = groups[gIdx];
          const historyId = `scan_pdf_${Date.now()}_${gIdx}`;

          saveBotHistoryItem(historyId, {
            soPhieu: grp.rawSoPhieu || grp.soPhieu,
            items: grp.items,
            model: cfg.openRouterModel
          });

          let sheetStatusText = '';
          if (cfg.autoSyncSheet && cfg.googleSheetUrl) {
            const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, grp.rawSoPhieu || grp.soPhieu, grp.items);
            sheetStatusText = sheetResult.success ? '✅ Đã lưu vào Google Sheet' : ('❌ Lỗi Sheet: ' + sheetResult.message);
          }

          const pageRangeStr = grp.pages.length === 1 ? `Trang ${grp.pages[0]}` : `Trang ${grp.pages.join(', ')}`;
          let summaryText = `📄 *PHIẾU ${gIdx + 1}/${groups.length}* (${pageRangeStr})\n`;
          summaryText += `• *Số phiếu:* ` + (grp.soPhieu || 'Không rõ') + `\n`;
          summaryText += `• *Số mặt hàng:* ` + grp.items.length + ` dòng\n`;
          summaryText += `• *Mô hình:* ` + cfg.openRouterModel + `\n`;
          if (sheetStatusText) summaryText += `• *Google Sheet:* ` + sheetStatusText + `\n`;
          summaryText += '\n📝 *Danh sách chi tiết:*\n';

          grp.items.slice(0, 25).forEach((it, idx) => {
            let line = `${idx + 1}. *${it.ten || '---'}*`;
            if (it.soOSPO) line += ` | PO: ${it.soOSPO}`;
            const qty = it.soLuongChungTu || it.soLuongThucNhap;
            if (qty) line += ` | SL: ${qty}`;
            if (it.donViTinh) line += ` ${it.donViTinh}`;
            if (it.soPallet) line += ` | Pallet: ${it.soPallet}`;
            if (it.ghiChu) line += ` (${it.ghiChu})`;
            summaryText += line + '\n';
          });

          if (grp.items.length > 25) {
            summaryText += `\n_...và ${grp.items.length - 25} mặt hàng khác (đã lưu đầy đủ vào Google Sheet)_`;
          }

          const replyMarkup = {
            inline_keyboard: [
              [
                { text: `🔄 Đồng Bộ Lại Phiếu Này (${grp.soPhieu || ('Phiếu ' + (gIdx + 1))})`, callback_data: `resync_${historyId}` }
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
            text: `⏳ Đang quét bằng mô hình *${cfg.openRouterModel}*...`,
            parse_mode: 'Markdown'
          });
        }

        const ocrRaw = await scanWithOpenRouter(
          base64Data, 
          imgMime, 
          cfg.openRouterKey, 
          cfg.openRouterModel, 
          cfg.selectedColumns || DEFAULT_COLUMNS, 
          cfg.fieldPrompts || DEFAULT_FIELD_PROMPTS
        );

        const items = parseOcrResultToItems(ocrRaw, cfg.selectedColumns || DEFAULT_COLUMNS);
        const soPhieu = ocrRaw.soPhieu || '';
        const historyId = 'scan_' + Date.now();

        saveBotHistoryItem(historyId, {
          soPhieu,
          items,
          model: cfg.openRouterModel
        });

        let sheetStatusText = '';
        if (cfg.autoSyncSheet && cfg.googleSheetUrl) {
          if (waitMsgId) {
            await sendTelegram('editMessageText', {
              chat_id: chatId,
              message_id: waitMsgId,
              text: '📊 Đã trích xuất xong! Đang đẩy vào Google Sheet...'
            });
          }
          const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, soPhieu, items);
          sheetStatusText = sheetResult.success ? '✅ Đã lưu vào Google Sheet' : ('❌ Lỗi Sheet: ' + sheetResult.message);
        }

        const summaryText = buildSummaryText(soPhieu, items, cfg.openRouterModel, sheetStatusText, historyId);
        const replyMarkup = {
          inline_keyboard: [
            [
              { text: '🔄 Đồng Bộ Lại Google Sheet', callback_data: `resync_${historyId}` }
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
    } catch (e) {
      console.error('Lỗi quét tài liệu:', e);
      if (waitMsgId) {
        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: '❌ Lỗi khi đọc tài liệu: ' + e.message
        });
      }
    }
  }

  // Handle Photo
  if (msg.photo && msg.photo.length) {
    const cfg = getBotConfig();
    if (!cfg.openRouterKey) {
      return sendTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Chưa có OpenRouter API Key! Hãy gõ `/sync VIP888` để đồng bộ cấu hình từ web.'
      });
    }

    const waitMsg = await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: '📥 Đang nhận ảnh và phân tích phiếu kho bằng AI...'
    });
    const waitMsgId = waitMsg.result?.message_id;

    try {
      const photos = msg.photo;
      const bestPhoto = photos[photos.length - 1];
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
          text: `⏳ Đang quét bằng mô hình *${cfg.openRouterModel}*...`,
          parse_mode: 'Markdown'
        });
      }

      const ocrRaw = await scanWithOpenRouter(
        base64Data, 
        mimeType, 
        cfg.openRouterKey, 
        cfg.openRouterModel, 
        cfg.selectedColumns || DEFAULT_COLUMNS, 
        cfg.fieldPrompts || DEFAULT_FIELD_PROMPTS
      );

      const items = parseOcrResultToItems(ocrRaw, cfg.selectedColumns || DEFAULT_COLUMNS);
      const soPhieu = ocrRaw.soPhieu || '';
      const historyId = 'scan_' + Date.now();

      // Lưu lại lịch sử để hỗ trợ nút bấm "Đồng bộ lại"
      saveBotHistoryItem(historyId, {
        soPhieu,
        items,
        model: cfg.openRouterModel
      });

      let sheetStatusText = '';
      if (cfg.autoSyncSheet && cfg.googleSheetUrl) {
        if (waitMsgId) {
          await sendTelegram('editMessageText', {
            chat_id: chatId,
            message_id: waitMsgId,
            text: '📊 Đã trích xuất xong! Đang đẩy vào Google Sheet...'
          });
        }
        const sheetResult = await syncToGoogleSheet(cfg.googleSheetUrl, soPhieu, items);
        sheetStatusText = sheetResult.success ? '✅ Đã lưu vào Google Sheet' : ('❌ Lỗi Sheet: ' + sheetResult.message);
      }

      const summaryText = buildSummaryText(soPhieu, items, cfg.openRouterModel, sheetStatusText, historyId);

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '🔄 Đồng Bộ Lại Google Sheet', callback_data: `resync_${historyId}` }
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
    } catch (e) {
      console.error('Lỗi quét ảnh:', e);
      if (waitMsgId) {
        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsgId,
          text: '❌ Lỗi khi đọc phiếu: ' + e.message
        });
      }
    }
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

console.log('🤖 Telegram Bot AkkoCii (@AkkoCii_bot) đang hoạt động trên localhost (kèm nút Đồng Bộ Lại)!');
pollUpdates();