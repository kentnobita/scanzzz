export async function scanWithGemini(apiKey, imageBase64, imageMimeType) {
  const prompt = `OCR phiếu kho Việt Nam (đọc cả chữ in & viết tay).
Quy tắc: Ô nào không có dữ liệu để chuỗi rỗng "" (tuyệt đối không chèn ???). Bỏ dòng tổng cộng.
Trả về đúng JSON thuần với mảng "rows" dạng [tên hàng, số lượng]:
{"soPhieu":"số phiếu","rows":[["tên hàng","số lượng"]]}`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: imageMimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 16384,
      topP: 0.95,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 400) throw new Error('API key không hợp lệ hoặc request lỗi');
    if (response.status === 403) throw new Error('API key không có quyền truy cập.');
    if (response.status === 429) throw new Error('Đã vượt giới hạn API. Thử lại sau.');
    throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Không nhận được kết quả từ Gemini');

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.rows)) {
      parsed.items = parsed.rows.map(r => ({ ten: r[0] || '', soLuong: r[1] || '' }));
    }
    return parsed;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.rows)) {
          parsed.items = parsed.rows.map(r => ({ ten: r[0] || '', soLuong: r[1] || '' }));
        }
        return parsed;
      } catch {}
    }
    return { soPhieu: '', items: [{ ten: text, soLuong: '' }] };
  }
}
