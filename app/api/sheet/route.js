import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { url, payload } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp link Webhook Google Apps Script.' },
        { status: 400 }
      );
    }

    url = url.trim();

    // 1. Check if user accidentally pasted the Spreadsheet URL instead of Web App deployment URL
    if (url.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json(
        {
          error:
            'Link bạn dán là link trang tính Google Sheet. Vui lòng dán link Webhook Google Apps Script (bắt đầu bằng https://script.google.com/... và kết thúc bằng /exec) theo hướng dẫn cài đặt.',
        },
        { status: 400 }
      );
    }

    if (!url.startsWith('https://script.google.com/') && !url.startsWith('https://script.googleusercontent.com/')) {
      return NextResponse.json(
        {
          error:
            'Link Webhook Google Apps Script không hợp lệ. Link phải bắt đầu bằng https://script.google.com/macros/s/.../exec',
        },
        { status: 400 }
      );
    }

    if (!payload || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json(
        { error: 'Không có dữ liệu dòng hàng nào để gửi sang Google Sheet.' },
        { status: 400 }
      );
    }

    // 2. Send server-side POST request to Google Apps Script Web App with auto-redirect and retry
    let responseText = '';
    let responseStatus = 200;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        responseStatus = response.status;
        responseText = await response.text();

        // Nếu Google trả về 502/503/429 tạm thời, thử lại
        if ([429, 502, 503, 504].includes(responseStatus) && attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }

        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    if (lastError) {
      console.error('Server Sheet Proxy Error after 3 attempts:', lastError);
      if (lastError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Quá thời gian kết nối (Timeout) tới Google Apps Script sau 45 giây. Vui lòng kiểm tra lại link Webhook.' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: `Lỗi kết nối máy chủ tới Google Sheet: ${lastError.message}` },
        { status: 500 }
      );
    }

    // 3. Detect Google Login / Permission issue
    if (responseText.includes('<!DOCTYPE html') || responseText.includes('<html') || responseText.includes('accounts.google.com')) {
      return NextResponse.json(
        {
          error:
            'Google Apps Script bị chặn quyền truy cập. Hãy vào Apps Script ➔ Triển khai lại ➔ Đặt mục "Người có quyền truy cập" thành "Bất kỳ ai (Anyone)".',
        },
        { status: 403 }
      );
    }

    // 4. Try parsing JSON returned from Google Apps Script
    try {
      const data = JSON.parse(responseText);
      if (data.status === 'error') {
        return NextResponse.json(
          { error: `Lỗi trong Google Sheet Apps Script: ${data.message || 'Lỗi không xác định'}` },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: data.message || `Đã đồng bộ thành công ${payload.items.length} dòng vào Google Sheet`,
        count: data.count || payload.items.length,
        time: data.time || new Date().toISOString(),
      });
    } catch {
      // If returned text without JSON but HTTP was 200
      if (responseStatus >= 200 && responseStatus < 300) {
        return NextResponse.json({
          success: true,
          message: `Đã gửi thành công ${payload.items.length} dòng sang Google Sheet`,
          count: payload.items.length,
          rawResponse: responseText.slice(0, 200),
        });
      }
      return NextResponse.json(
        { error: `Google Sheet phản hồi lỗi HTTP ${responseStatus}: ${responseText.slice(0, 150)}` },
        { status: responseStatus || 500 }
      );
    }
  } catch (error) {
    console.error('Server Sheet Proxy Fatal Error:', error);
    return NextResponse.json(
      { error: `Lỗi xử lý yêu cầu Google Sheet: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = (searchParams.get('url') || '').trim();

    if (!url) {
      return NextResponse.json({ error: 'Thiếu tham số url' }, { status: 400 });
    }

    if (url.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json(
        {
          error:
            'Link bạn dán là link trang tính Google Sheet. Vui lòng dán link Webhook Google Apps Script (bắt đầu bằng https://script.google.com/... và kết thúc bằng /exec).',
        },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const responseText = await response.text();

    if (responseText.includes('<!DOCTYPE html') || responseText.includes('accounts.google.com')) {
      return NextResponse.json(
        {
          error:
            'Google Apps Script bị chặn quyền truy cập. Hãy vào Apps Script ➔ Triển khai mới ➔ Chọn "Bất kỳ ai (Anyone)".',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: 'online',
      message: 'Kết nối Google Apps Script thành công!',
      raw: responseText.slice(0, 200),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Không thể kết nối tới Google Apps Script: ${error.message}` },
      { status: 500 }
    );
  }
}
