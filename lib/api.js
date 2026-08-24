/**
 * API Client kết nối Next.js Frontend với FastAPI Backend trên Koyeb
 */

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAuthHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Kiểm tra trạng thái máy chủ Backend
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Gửi ảnh/PDF quét OCR qua Backend FastAPI
 */
export async function scanSlipBackend({
  imageBase64,
  mimeType = 'image/jpeg',
  selectedColumns,
  customFieldPrompts,
  saveToDb = true,
  uploadToR2 = true,
  token = null,
}) {
  const res = await fetch(`${BACKEND_URL}/api/scan`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      image_base64: imageBase64,
      mime_type: mimeType,
      selected_columns: selectedColumns,
      custom_field_prompts: customFieldPrompts,
      save_to_db: saveToDb,
      upload_to_r2: uploadToR2,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Lỗi Backend (${res.status})`);
  }

  return await res.json();
}

/**
 * Lấy danh sách lịch sử phiếu từ Neon DB qua Backend
 */
export async function fetchSlipsBackend(token = null) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/slips`, {
      method: 'GET',
      headers: getAuthHeaders(token),
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch (e) {
    console.warn('[API] Warning fetching slips from backend:', e);
    return [];
  }
}

/**
 * Lưu hoặc cập nhật phiếu trong Neon DB
 */
export async function saveSlipBackend(payload, token = null) {
  const res = await fetch(`${BACKEND_URL}/api/slips`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Lỗi lưu phiếu (${res.status})`);
  }

  return await res.json();
}

/**
 * Cập nhật phiếu đã có trong Neon DB
 */
export async function updateSlipBackend(slipId, payload, token = null) {
  const res = await fetch(`${BACKEND_URL}/api/slips/${slipId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Lỗi cập nhật phiếu (${res.status})`);
  }

  return await res.json();
}

/**
 * Xóa phiếu trong Neon DB
 */
export async function deleteSlipBackend(slipId, token = null) {
  const res = await fetch(`${BACKEND_URL}/api/slips/${slipId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Lỗi xóa phiếu (${res.status})`);
  }

  return true;
}
