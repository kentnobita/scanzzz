import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, key, payload } = body;

    const apiKey = key || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!apiKey) {
      return NextResponse.json({ error: { message: 'Chưa cung cấp B.AI API Key' } }, { status: 400 });
    }

    // Action test kết nối API Key
    if (action === 'test') {
      const res = await fetch('https://api.b.ai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json({ error: { message: data.error?.message || `Lỗi B.AI ${res.status}` } }, { status: res.status });
      }
      return NextResponse.json({ success: true, models: data.data || [] });
    }

    // Proxy Chat Completions
    const chatPayload = payload || body;
    const rawModel = chatPayload.model || 'qwen3.8-flash';
    const selectedModel = String(rawModel).toLowerCase().trim();

    const requestBody = {
      model: selectedModel,
      messages: chatPayload.messages,
      temperature: chatPayload.temperature ?? 0.1,
      max_tokens: chatPayload.max_tokens || 6000,
    };

    if (chatPayload.response_format) {
      requestBody.response_format = chatPayload.response_format;
    } else {
      requestBody.response_format = { type: 'json_object' };
    }

    const executeCall = async (modelToUse) => {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 55000); // 55s timeout chống treo
      try {
        const bodyToSend = { ...requestBody, model: modelToUse };
        return await fetch('https://api.b.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyToSend),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutTimer);
      }
    };

    let res = null;
    let lastError = null;

    // Retry tối đa 2 lần với các mã lỗi quá tải/tạm thời
    const retryableStatuses = [429, 500, 502, 503, 504];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await executeCall(selectedModel);
        if (res.ok || !retryableStatuses.includes(res.status)) {
          break; // Thành công hoặc lỗi do client (400, 401...) không cần retry
        }
        console.warn(`[B.AI Proxy] Model ${selectedModel} báo lỗi ${res.status} (lần ${attempt + 1}), đang thử lại...`);
      } catch (callErr) {
        lastError = callErr;
        console.warn(`[B.AI Proxy] Lỗi kết nối lần ${attempt + 1}:`, callErr.message);
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1500));
      }
    }

    // Tự động Fallback sang model dự phòng nếu model chính bị 502/504 hoặc Timeout
    if ((!res || !res.ok) && (selectedModel === 'qwen3.8-flash' || selectedModel === 'deepseek-v4.1-flash')) {
      const fallbackModel = selectedModel === 'qwen3.8-flash' ? 'qwen3.8-27b' : 'qwen3.8-flash';
      console.log(`[B.AI Proxy] Tự động kích hoạt mô hình dự phòng: ${fallbackModel}...`);
      try {
        const fallbackRes = await executeCall(fallbackModel);
        if (fallbackRes.ok) {
          res = fallbackRes;
        }
      } catch (fbErr) {
        console.warn(`[B.AI Proxy] Fallback ${fallbackModel} không thành công:`, fbErr.message);
      }
    }

    if (!res) {
      throw lastError || new Error('Không thể kết nối đến máy chủ B.AI sau các lần thử lại');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      let errMsg = data.error?.message || `Lỗi B.AI ${res.status}`;
      if (res.status === 400 && errMsg.includes('multimodal file timed out')) {
        errMsg = 'Máy chủ B.AI bị quá tải khi tải ảnh (timed out). Vui lòng thử lại lần nữa.';
      }
      return NextResponse.json({ error: { message: errMsg } }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('B.AI Proxy Error:', err);
    const isTimeout = err.name === 'AbortError';
    return NextResponse.json({
      error: {
        message: isTimeout ? 'Yêu cầu tới B.AI bị quá thời gian chờ (55s). Vui lòng thử lại.' : (err.message || 'Lỗi kết nối máy chủ B.AI')
      }
    }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!key) {
    return NextResponse.json({ error: { message: 'Chưa cung cấp B.AI API Key' } }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.b.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key.trim()}`
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: { message: data.error?.message || `Lỗi B.AI ${res.status}` } }, { status: res.status });
    }
    return NextResponse.json({ success: true, models: data.data || [] });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message || 'Lỗi kết nối máy chủ B.AI' } }, { status: 500 });
  }
}
