let pdfjsLoaded = false;

function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (pdfjsLoaded && window.pdfjsLib) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      pdfjsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Không thể tải PDF.js'));
    document.head.appendChild(script);
  });
}

export async function renderPdfToDataUrl(file) {
  await loadPDFJS();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 2.0;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    numPages: pdf.numPages
  };
}
