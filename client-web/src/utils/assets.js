const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

function createPlaceholder(text) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#dbeafe"/>
          <stop offset="100%" stop-color="#fde68a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="34" fill="#1f2937">${text || 'Ganzhou Travel'}</text>
    </svg>`
  )}`;
}

export function resolveAssetUrl(path, fallbackText = 'Ganzhou Travel') {
  if (!path) {
    return createPlaceholder(fallbackText);
  }

  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  return `${apiBase}${path}`;
}

export function applyImageFallback(event, text = 'Ganzhou Travel') {
  event.target.src = createPlaceholder(text);
}
