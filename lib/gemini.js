export async function scanWithGemini(apiKey, imageBase64, imageMimeType) {
  const prompt = `Bạn là hệ thống OCR chuyên đọc phiếu xuất kho / phiếu giao hàng Việt Nam.

Hãy đọc kỹ ảnh phiếu này và trích xuất dữ liệu sau:
1. Số phiếu (thường ghi là "Số XKP", "Số:", "No.", hoặc số phiếu ở đầu phiếu)
2. Danh sách hàng hóa trong bảng, mỗi dòng gồm:
   - Tên, nhãn hiệu / mã sản phẩm (cột B hoặc cột tên hàng)
   - Số lượng (cột số lượng yêu cầu, thường là cột cuối)

Trả về JSON theo format:
{
  "soPhieu": "số phiếu",
  "items": [
    {"ten": "tên/mã sản phẩm", "soLuong": "số lượng"}
  ]
}

Lưu ý:
- Chỉ lấy các dòng có dữ liệu thực tế, bỏ qua dòng trống
- Đọc chính xác cả chữ viết tay
- Nếu không đọc được trường nào, ghi "???"
- Chỉ trả JSON thuần, không markdown, không giải thích`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: imageMimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json'
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
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { soPhieu: '', items: [{ ten: text, soLuong: '???' }] };
  }
}
