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
    const rawModel = (chatPayload.model || 'qwen3.8-flash').trim();
    const selectedModel = rawModel.replace(/-free$/i, '');

    const requestBody = {
      model: selectedModel,
      messages: chatPayload.messages,
      temperature: chatPayload.temperature ?? 0.1,
      max_tokens: chatPayload.max_tokens || 3000
    };

    console.log(`[Kira Route] Model: ${selectedModel}, max_tokens: ${requestBody.max_tokens}, messages count: ${chatPayload.messages?.length}`);
    const startTime = Date.now();

    if (chatPayload.response_format && selectedModel.startsWith('gpt-')) {
      requestBody.response_format = chatPayload.response_format;
    }

    let res = await fetch('https://kiraai.vn/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    let duration = Date.now() - startTime;
    console.log(`[Kira Route] Response status: ${res.status} in ${duration}ms`);

    // Tự động thử lại 1 lần nếu gặp lỗi mạng tạm thời 502 (Bad Gateway) hoặc 504 (Timeout)
    if (!res.ok && (res.status === 502 || res.status === 504)) {
      console.warn(`[Kira Route] Gặp mã ${res.status}, tự động thử lại sau 1.5 giây...`);
      await new Promise((r) => setTimeout(r, 1500));
      const retryStart = Date.now();
      try {
        const retryRes = await fetch('https://kiraai.vn/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        duration = Date.now() - startTime;
        console.log(`[Kira Route] Kết quả thử lại: ${retryRes.status} trong ${Date.now() - retryStart}ms (Tổng: ${duration}ms)`);
        if (retryRes.ok) {
          res = retryRes;
        }
      } catch (retryErr) {
        console.warn('[Kira Route] Lỗi khi thử lại:', retryErr.message);
      }
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let errMsg = `Lỗi Kira AI (${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) errMsg = errorJson.error.message;
      } catch (parseErr) {}
      if (res.status === 502) {
        errMsg = 'Máy chủ Kira AI báo lỗi 502 (Bad Gateway). Cụm xử lý của mô hình này đang quá tải hoặc tạm thời gián đoạn. Vui lòng thử lại sau 3 giây hoặc chọn qwen3.8-flash-free / gemini-3.8-flash.';
      } else if (res.status === 504) {
        errMsg = 'Máy chủ Kira AI phản hồi quá lâu (504 Gateway Timeout). Bạn hãy bấm Quét Lại hoặc chọn mô hình phản hồi nhanh hơn như qwen3.8-flash-free, gemini-3.8-flash.';
      }
      return NextResponse.json({ error: { message: errMsg } }, { status: res.status });
    }

    const data = await res.json();
    
    // For reasoning models (e.g. GLM, Qwen): if content is empty but reasoning_content has the output, fallback to it
    if (data.choices?.[0]?.message) {
      const msg = data.choices[0].message;
      if (!msg.content && msg.reasoning_content) {
        msg.content = msg.reasoning_content;
      }
    }

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
