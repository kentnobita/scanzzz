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
    let selectedModel = chatPayload.model || 'gemini-3.6-flash';

    // Check if request contains image
    const hasImage = chatPayload.messages?.some(m =>
      Array.isArray(m.content) && m.content.some(c => c.type === 'image_url' || c.image_url)
    );

    // Kira AI only supports Vision (reading images) on Gemini models
    // Non-Gemini models (qwen, gpt, minimax, deepseek, kira-auto) trigger 502 Bad Gateway on Kira
    if (hasImage && !selectedModel.startsWith('gemini-')) {
      console.log(`[Kira AI Proxy] Model ${selectedModel} does not support Vision on Kira AI, auto-switching to gemini-3.6-flash`);
      selectedModel = 'gemini-3.6-flash';
    }

    const sendChatRequest = async (modelToUse) => {
      return await fetch('https://kiraai.vn/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: chatPayload.messages,
          temperature: chatPayload.temperature ?? 0.1,
          response_format: chatPayload.response_format || { type: 'json_object' }
        })
      });
    };

    let res = await sendChatRequest(selectedModel);

    // If 502 Bad Gateway occurs and image was sent with a different model, retry with gemini-3.6-flash
    if (res.status === 502 && hasImage && selectedModel !== 'gemini-3.6-flash') {
      console.warn(`[Kira AI Proxy] Received 502 with ${selectedModel}, retrying with gemini-3.6-flash...`);
      res = await sendChatRequest('gemini-3.6-flash');
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let errMsg = `Lỗi Kira AI (${res.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) errMsg = errorJson.error.message;
      } catch {
        if (res.status === 502) {
          errMsg = 'Máy chủ Kira AI báo lỗi 502 (Bad Gateway). Nguyên nhân: Trên Kira AI, chỉ các mô hình Gemini (gemini-3.6-flash, gemini-3.8-flash) mới hỗ trợ đọc ảnh, hoặc ảnh có dung lượng vượt giới hạn của Kira AI. Vui lòng thử chọn gemini-3.6-flash hoặc chụp lại ảnh rõ nét.';
        } else if (res.status === 504) {
          errMsg = 'Máy chủ Kira AI phản hồi quá lâu (504 Gateway Timeout). Vui lòng thử lại sau.';
        }
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
