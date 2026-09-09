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
    const res = await fetch('https://kiraai.vn/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: chatPayload.model || 'qwen3.8-max',
        messages: chatPayload.messages,
        temperature: chatPayload.temperature ?? 0.1,
        response_format: chatPayload.response_format || { type: 'json_object' }
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: { message: data.error?.message || `Lỗi Kira AI ${res.status}` } }, { status: res.status });
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
