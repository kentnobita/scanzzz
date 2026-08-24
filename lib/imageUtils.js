export function processImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      resizeAndCompress(ev.target.result).then(resolve);
    };
    reader.readAsDataURL(file);
  });
}

export function resizeAndCompress(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 2000;
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        } else {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const jpegUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({
        base64: jpegUrl.split(',')[1],
        mimeType: 'image/jpeg',
        previewUrl: jpegUrl
      });
    };
    img.src = dataUrl;
  });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
