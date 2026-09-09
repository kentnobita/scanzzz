import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, key, payload } = body;

    const apiKey = key || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!apiKey) {
      return NextResponse.json({ error: { message: 'Chưa cung cấp Kira AI API Key' } }, { status: 400 });
    }

    if (action === 'test') {
      try {
        const res = await fetch('https://kiraai.vn/api/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`
          }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // If models endpoint isn't supported or returns error, try a lightweight chat completion test
          const chatRes = await fetch('https://kiraai.vn/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: body.model || 'qwen3.8-max',
              messages: [{ role: 'user', content: 'hi' }],
              max_tokens: 5
            })
          });
          const chatData = await chatRes.json().catch(() => ({}));
          if (!chatRes.ok) {
            return NextResponse.json({ error: { message: chatData.error?.message || data.error?.message || `Lỗi Kira AI ${res.status}` } }, { status: chatRes.status });
          }
          return NextResponse.json({ success: true, message: 'Kết nối Kira AI thành công!' });
        }
        return NextResponse.json({ success: true, models: data.data || [] });
      } catch (e) {
        return NextResponse.json({ error: { message: 'Không thể kết nối đến máy chủ Kira AI: ' + e.message } }, { status: 500 });
      }
    }

    // Proxy Chat Completions
    const chatPayload = payload || body;
    const selectedModel = chatPayload.model || 'qwen3.8-27b-free';

    // Free models on Kira AI have strict parameter rules:
    // 1. max_tokens must be <= 650 to prevent upstream 502 Bad Gateway
    // 2. response_format { type: 'json_object' } can cause 500/502 on some free models (like Qwen free)
    const isFreeModel = selectedModel.includes('-free') || selectedModel.startsWith('kira-');
    
    const requestBody = {
      model: selectedModel,
      messages: chatPayload.messages,
      temperature: chatPayload.temperature ?? 0.1
    };

    if (isFreeModel) {
      requestBody.max_tokens = Math.min(chatPayload.max_tokens || 650, 650);
      // Only include response_format for non-free or when explicitly supported
      if (chatPayload.response_format && !selectedModel.includes('qwen')) {
        requestBody.response_format = chatPayload.response_format;
      }
    } else {
      if (chatPayload.max_tokens) requestBody.max_tokens = chatPayload.max_tokens;
      if (chatPayload.response_format) requestBody.response_format = chatPayload.response_format;
    }

    const res = await fetch('https://kiraai.vn/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let errMsg = `Lỗi Kira AI (${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) errMsg = errorJson.error.message;
      } catch (parseErr) {}
      if (res.status === 502) {
        errMsg = 'Máy chủ Kira AI báo lỗi 502 (Bad Gateway). Mô hình Free đang tạm thời quá tải hoặc ảnh vượt dung lượng cho phép. Hãy thử lại sau 3-5 giây hoặc chọn mô hình Free khác như qwen3.8-27b-free, qwen3.8-flash-free.';
      } else if (res.status === 504) {
        errMsg = 'Máy chủ Kira AI phản hồi quá lâu (504 Gateway Timeout). Vui lòng thử lại sau ít giây.';
      }
      return NextResponse.json({ error: { message: errMsg } }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Kira AI Proxy Error:', err);
    return NextResponse.json({ error: { message: err.message || 'Lỗi kết nối máy chủ Kira AI' } }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!key) {
    return NextResponse.json({ error: { message: 'Chưa cung cấp Kira AI API Key' } }, { status: 400 });
  }

  try {
    const res = await fetch('https://kiraai.vn/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key.trim()}`
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: { message: data.error?.message || `Lỗi Kira AI ${res.status}` } }, { status: res.status });
    }
    return NextResponse.json({ success: true, models: data.data || [] });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message || 'Lỗi kết nối máy chủ Kira AI' } }, { status: 500 });
  }
}
