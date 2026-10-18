import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizeChatCompletionsUrl(urlStr) {
  let clean = (urlStr || '').trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (clean.endsWith('/chat/completions')) return clean;
  return `${clean}/chat/completions`;
}

function normalizeModelsUrl(urlStr) {
  let clean = (urlStr || '').trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (clean.endsWith('/chat/completions')) {
    clean = clean.replace(/\/chat\/completions$/, '');
  }
  return `${clean}/models`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, baseUrl, key, model, messages, temperature, max_tokens, response_format } = body;

    const rawBaseUrl = (baseUrl || '').trim();
    if (!rawBaseUrl) {
      return NextResponse.json({ error: { message: 'Chưa cấu hình Base URL cho nhà cung cấp AI' } }, { status: 400 });
    }

    const apiKey = (key || '').trim();
    const selectedModel = (model || '').trim();

    // Headers cơ bản cho request
    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // 1. Action: Test kết nối API Key & Base URL
    if (action === 'test') {
      const modelsEndpoint = normalizeModelsUrl(rawBaseUrl);
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 12000); // 12s timeout

      try {
        const res = await fetch(modelsEndpoint, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutTimer);

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const modelList = Array.isArray(data.data) ? data.data.map(m => m.id || m.name || m) : [];
          return NextResponse.json({
            success: true,
            message: `Kết nối thành công tới Base URL (${modelList.length > 0 ? `${modelList.length} mô hình` : 'OK'})`,
            models: modelList.slice(0, 30),
          });
        }
      } catch (err) {
        clearTimeout(timeoutTimer);
      }

      // Nếu GET /models không hỗ trợ (nhiều provider chặn endpoint /models), thử gọi 1 ping test chat completions
      if (selectedModel) {
        const chatEndpoint = normalizeChatCompletionsUrl(rawBaseUrl);
        const chatController = new AbortController();
        const chatTimer = setTimeout(() => chatController.abort(), 15000);
        try {
          const testRes = await fetch(chatEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: selectedModel,
              messages: [{ role: 'user', content: 'hi' }],
              max_tokens: 5,
            }),
            signal: chatController.signal,
          });
          clearTimeout(chatTimer);
          if (testRes.ok) {
            return NextResponse.json({
              success: true,
              message: `Kết nối & xác thực thành công mô hình [${selectedModel}]!`,
            });
          }
          const errData = await testRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: { message: errData.error?.message || `Lỗi từ máy chủ API: ${testRes.status}` } },
            { status: testRes.status }
          );
        } catch (chatErr) {
          clearTimeout(chatTimer);
          return NextResponse.json(
            { error: { message: `Không thể kết nối tới ${chatEndpoint}: ${chatErr.message}` } },
            { status: 502 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Base URL phản hồi tốt. Hãy nhập mã Model để hoàn tất cấu hình!',
      });
    }

    // 2. Chat Completions Proxy
    if (!selectedModel) {
      return NextResponse.json({ error: { message: 'Chưa cung cấp mã mô hình (Model ID)' } }, { status: 400 });
    }

    const chatEndpoint = normalizeChatCompletionsUrl(rawBaseUrl);
    const requestBody = {
      model: selectedModel,
      messages: messages || [],
      temperature: temperature ?? 0.1,
      max_tokens: max_tokens || 4000,
    };

    if (response_format) {
      requestBody.response_format = response_format;
    }

    const executeCall = async (bodyPayload) => {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 65000); // 65s timeout cho vision OCR
      try {
        const res = await fetch(chatEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutTimer);
        return res;
      } catch (err) {
        clearTimeout(timeoutTimer);
        throw err;
      }
    };

    let res = await executeCall(requestBody);

    // Xử lý tự động tương thích (Smart Fallback):
    // 1. Fallback nếu provider báo lỗi 400/422 khi có response_format (nhiều provider/model Vision không hỗ trợ json_object)
    if (!res.ok && (res.status === 400 || res.status === 422) && requestBody.response_format) {
      console.warn(`[Custom API] Provider trả về ${res.status}, tự động retry không gửi response_format...`);
      const fallbackBody = { ...requestBody };
      delete fallbackBody.response_format;
      res = await executeCall(fallbackBody);
    }

    // 2. Fallback nếu provider không chấp nhận role: "system" cùng với Vision payload
    if (!res.ok && (res.status === 400 || res.status === 422) && Array.isArray(requestBody.messages)) {
      const hasSystem = requestBody.messages.some(m => m.role === 'system');
      if (hasSystem) {
        console.warn(`[Custom API] Provider không hỗ trợ system message, tự động gộp vào user prompt...`);
        const sysMsg = requestBody.messages.find(m => m.role === 'system')?.content || '';
        const userMsgs = requestBody.messages.filter(m => m.role !== 'system');
        const modifiedUserMsgs = userMsgs.map(m => {
          if (m.role === 'user' && Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.map(c => {
                if (c.type === 'text') return { ...c, text: `${sysMsg}\n\n${c.text}` };
                return c;
              })
            };
          }
          return m;
        });
        const fallbackNoSys = { ...requestBody, messages: modifiedUserMsgs };
        delete fallbackNoSys.response_format;
        res = await executeCall(fallbackNoSys);
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMessage = errData.error?.message || errData.message || `Lỗi từ máy chủ Custom API (${res.status})`;
      return NextResponse.json(
        { error: { message: errMessage, details: errData } },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Custom API Proxy Error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Lỗi xử lý kết nối Custom API' } },
      { status: 500 }
    );
  }
}
