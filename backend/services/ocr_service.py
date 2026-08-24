import json
import re
import httpx
from typing import List, Dict, Any, Optional
from config import settings

COLUMN_LABELS = {
    "ten": "Tên, nhãn hiệu, quy cách phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa",
    "soOSPO": "Số O.S/PO",
    "donViTinh": "Đơn vị tính",
    "soLuongChungTu": "Số lượng theo chứng từ",
    "soLuongThucNhap": "Số lượng thực nhập",
    "soPallet": "Số Pallet",
    "ghiChu": "Ghi chú",
}

DEFAULT_FIELD_PROMPTS = {
    "soPhieu": "Tìm số phiếu hoặc số chứng từ. Giữ nguyên tiền tố, dấu cách và toàn bộ chữ số như trên phiếu.",
    "ten": "Lấy mã hàng hoặc tên hàng hóa thực tế. Không gộp hai dòng hàng thành một giá trị.",
    "soOSPO": "Lấy đúng mã O.S/PO, đơn đặt hàng hoặc mã tham chiếu được in trên cùng dòng hàng.",
    "donViTinh": "Lấy đơn vị tính viết trên phiếu, ví dụ EA, PCS, KG, BOX. Không tự suy diễn.",
    "soLuongChungTu": "Chỉ lấy số lượng theo chứng từ. Chỉ trả về số, không thêm đơn vị tính.",
    "soLuongThucNhap": "Chỉ lấy số lượng thực nhập. Chỉ trả về số, không thêm đơn vị tính.",
    "soPallet": "Lấy số pallet hoặc mã pallet. Giữ số 0 ở đầu nếu có.",
    "ghiChu": "Lấy ghi chú cùng dòng hàng nếu có; nếu trống thì trả về chuỗi rỗng.",
}

def build_prompt(selected_columns: List[str], custom_prompts: Optional[Dict[str, str]] = None) -> str:
    prompts = {**DEFAULT_FIELD_PROMPTS, **(custom_prompts or {})}
    
    schema_fields = ',\n        '.join([f'"{col}": "giá trị"' for col in selected_columns])
    
    rules = []
    rules.append(f"- Số phiếu → trường soPhieu: {prompts.get('soPhieu', '')}")
    for col in selected_columns:
        label = COLUMN_LABELS.get(col, col)
        rule_desc = prompts.get(col, '')
        rules.append(f"- {label} → trường {col}: {rule_desc}")
    
    rules_text = '\n'.join(rules)

    return f"""Bạn là hệ thống OCR chuyên đọc phiếu nhập kho / xuất kho Việt Nam. Hãy đọc chính xác phần đầu phiếu và bảng hàng hóa.

Trích xuất số phiếu và các cột được chọn theo hướng dẫn riêng sau:
{rules_text}

Chỉ lấy dòng hàng hóa có dữ liệu thực tế, bỏ qua dòng trống và dòng tổng cộng. Nếu một trường không đọc được, ghi "???". Không tự suy diễn dữ liệu không xuất hiện trên phiếu.

Trả về đúng JSON thuần theo cấu trúc:
{{
  "soPhieu": "số phiếu",
  "items": [
    {{
      {schema_fields}
    }}
  ]
}}
Không trả markdown hoặc giải thích."""

async def process_ocr_with_gemini(
    image_base64: str,
    mime_type: str = "image/jpeg",
    selected_columns: Optional[List[str]] = None,
    custom_prompts: Optional[Dict[str, str]] = None,
    api_key_override: Optional[str] = None,
) -> Dict[str, Any]:
    """Calls Google Gemini Vision API to extract structured invoice data."""
    api_key = api_key_override or settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("Chưa cấu hình GEMINI_API_KEY trên server hoặc request.")

    columns = selected_columns or list(COLUMN_LABELS.keys())
    prompt_text = build_prompt(columns, custom_prompts)

    request_payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_base64,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            url,
            headers={"Content-Type": "application/json"},
            json=request_payload,
        )

    if response.status_code != 200:
        error_detail = response.text
        try:
            err_json = response.json()
            error_detail = err_json.get("error", {}).get("message", response.text)
        except Exception:
            pass
        raise RuntimeError(f"Gemini API Lỗi ({response.status_code}): {error_detail}")

    data = response.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Không nhận được phản hồi từ Gemini API.")

    parts = candidates[0].get("content", {}).get("parts", [])
    if not parts:
        raise RuntimeError("Phản hồi rỗng từ Gemini API.")

    raw_text = parts[0].get("text", "").strip()

    # Parse JSON
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            parsed = json.loads(json_match.group(0))
        else:
            parsed = {"soPhieu": "", "items": [{"ten": raw_text}]}

    # Normalize items
    raw_items = parsed.get("items", [])
    normalized_items = []
    for item in raw_items:
        row = {}
        for col in columns:
            row[col] = str(item.get(col, "") or "")
        normalized_items.append(row)

    return {
        "soPhieu": str(parsed.get("soPhieu", "") or ""),
        "items": normalized_items,
        "raw_text": raw_text,
    }
