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
      let modelList = [];

      // A. Cố gắng lấy danh sách model từ endpoint /models
      const endpointsToTry = [normalizeModelsUrl(rawBaseUrl)];
      const cleanBase = rawBaseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
      if (!cleanBase.endsWith('/v1')) {
        endpointsToTry.push(`${cleanBase}/v1/models`);
      }

      for (const endpoint of endpointsToTry) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(endpoint, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });
          clearTimeout(timer);

          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            let rawList = [];
            if (Array.isArray(data.data)) {
              rawList = data.data;
            } else if (Array.isArray(data.models)) {
              rawList = data.models;
            } else if (Array.isArray(data)) {
              rawList = data;
            }
            modelList = rawList
              .map((m) => (typeof m === 'string' ? m : m.id || m.name || m.model))
              .filter(Boolean);

            if (modelList.length > 0) {
              // Ưu tiên đưa các model Vision lên đầu danh sách
              const isVision = (name) => /vision|vl|qwen.*vl|llama.*vision|gpt-4|claude|gemini|pixtral/i.test(name);
              modelList.sort((a, b) => {
                const va = isVision(a) ? 1 : 0;
                const vb = isVision(b) ? 1 : 0;
                return vb - va;
              });
              break;
            }
          }
        } catch {
          // Tiếp tục thử endpoint kế tiếp
        }
      }

      // B. Nếu người dùng có nhập selectedModel, kiểm tra thực tế mô hình đó qua chat completions
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
              testedModel: selectedModel,
              models: modelList.slice(0, 80),
            });
          }

          const errData = await testRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Lỗi từ máy chủ API: ${testRes.status}`;

          // Nếu model nhập bị lỗi nhưng đã lấy được danh sách model hợp lệ từ nhà cung cấp
          return NextResponse.json(
            {
              error: { message: `Mô hình [${selectedModel}] không phản hồi (${errMsg}). Vui lòng chọn mô hình hợp lệ bên dưới!` },
              models: modelList.slice(0, 80),
            },
            { status: testRes.status >= 400 && testRes.status < 500 ? testRes.status : 400 }
          );
        } catch (chatErr) {
          clearTimeout(chatTimer);
          return NextResponse.json(
            {
              error: { message: `Không thể kết nối tới ${chatEndpoint}: ${chatErr.message}` },
              models: modelList.slice(0, 80),
            },
            { status: 502 }
          );
        }
      }

      // C. Trường hợp người dùng chưa nhập model, nhưng API trả về danh sách models
      if (modelList.length > 0) {
        const isVision = (name) => /vision|vl|qwen.*vl|llama.*vision|gpt-4|claude|gemini|pixtral/i.test(name);
        const suggestedModel = modelList.find(isVision) || modelList[0];
        return NextResponse.json({
          success: true,
          message: `Kết nối thành công! Đã tìm thấy ${modelList.length} mô hình khả dụng.`,
          testedModel: suggestedModel,
          models: modelList.slice(0, 80),
        });
      }

      // D. Fallback nếu không list được models và cũng chưa nhập model
      return NextResponse.json({
        success: true,
        message: 'Base URL phản hồi tốt. Hãy nhập mã Model để hoàn tất cấu hình!',
        models: [],
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
