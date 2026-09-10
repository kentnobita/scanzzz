import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, key, payload } = body;

    const apiKey = key || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!apiKey) {
      return NextResponse.json({ error: { message: 'Chưa cung cấp APInex API Key' } }, { status: 400 });
    }

    if (action === 'test') {
      const res = await fetch('https://api.apinex.bond/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json({ error: { message: data.error?.message || `Lỗi APInex ${res.status}` } }, { status: res.status });
      }
      return NextResponse.json({ success: true, models: data.data || [] });
    }

    // Proxy Chat Completions
    const chatPayload = payload || body;
    const selectedModel = chatPayload.model || 'free/gemini-3.8-flash';

    const requestBody = {
      model: selectedModel,
      messages: chatPayload.messages,
      temperature: chatPayload.temperature ?? 0.1,
      max_tokens: chatPayload.max_tokens || 3000,
    };

    if (chatPayload.response_format && !selectedModel.includes('qwen')) {
      requestBody.response_format = chatPayload.response_format;
    }

    let res = await fetch('https://api.apinex.bond/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Auto-retry once on transient 502 or 504
    if (!res.ok && (res.status === 502 || res.status === 504)) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const retryRes = await fetch('https://api.apinex.bond/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        if (retryRes.ok) res = retryRes;
      } catch (retryErr) {}
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: { message: data.error?.message || `Lỗi APInex ${res.status}` } }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('APInex Proxy Error:', err);
    return NextResponse.json({ error: { message: err.message || 'Lỗi kết nối máy chủ APInex' } }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!key) {
    return NextResponse.json({ error: { message: 'Chưa cung cấp APInex API Key' } }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.apinex.bond/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key.trim()}`
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: { message: data.error?.message || `Lỗi APInex ${res.status}` } }, { status: res.status });
    }
    return NextResponse.json({ success: true, models: data.data || [] });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message || 'Lỗi kết nối máy chủ APInex' } }, { status: 500 });
  }
}
