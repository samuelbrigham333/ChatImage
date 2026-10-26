// AI assistance: Initial implementation developed with ChatGPT/Copilot and reviewed and adapted by the student.
const REQUEST_TIMEOUT_MS = 30000;
const MAX_ERROR_BODY_LENGTH = 300;

export function getBackendBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (!configuredUrl) {
    throw new Error('Set EXPO_PUBLIC_BACKEND_URL in your .env file and restart Expo.');
  }
  let parsed;
  try {
    parsed = new URL(configuredUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_BACKEND_URL must be a valid HTTP or HTTPS URL.');
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('EXPO_PUBLIC_BACKEND_URL must be an HTTP or HTTPS origin without credentials or a path.');
  }
  return configuredUrl.replace(/\/+$/, '');
}

export function resolveImageUrl(relativeOrAbsoluteUrl) {
  if (typeof relativeOrAbsoluteUrl !== 'string' || !relativeOrAbsoluteUrl.trim()) {
    throw new Error('The server returned an invalid photo URL.');
  }
  const base = new URL(`${getBackendBaseUrl()}/`);
  let resolved;
  try {
    resolved = new URL(relativeOrAbsoluteUrl, base);
  } catch {
    throw new Error('The server returned an invalid photo URL.');
  }
  if (
    !['http:', 'https:'].includes(resolved.protocol) ||
    resolved.origin !== base.origin ||
    !/^\/images\/[A-Za-z0-9_-]+\.(?:jpg|png|webp)$/i.test(resolved.pathname) ||
    resolved.search ||
    resolved.hash
  ) {
    throw new Error('The server returned an unsafe photo URL.');
  }
  return resolved.toString();
}

async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBackendBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      let detail = body.slice(0, MAX_ERROR_BODY_LENGTH);
      try {
        detail = JSON.parse(body).detail || detail;
      } catch {
        // Keep the bounded response text for non-JSON error pages.
      }
      throw new Error(`Server error ${response.status}: ${detail || response.statusText}`);
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('The server returned an invalid response.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Check the backend and try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Could not reach the backend. Check its URL and network connection.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadPhoto(uri) {
  if (typeof uri !== 'string' || !uri) throw new Error('No captured photo is available.');
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const fileTypes = {
    jpg: { name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' },
    jpeg: { name: `photo_${Date.now()}.jpg`, type: 'image/jpeg' },
    png: { name: `photo_${Date.now()}.png`, type: 'image/png' },
    webp: { name: `photo_${Date.now()}.webp`, type: 'image/webp' },
  };
  const file = fileTypes[extension] || fileTypes.jpg;
  const form = new FormData();
  form.append('file', { uri, name: file.name, type: file.type });
  const result = await requestJson('/upload-photo', { method: 'POST', body: form });
  if (!result || typeof result.url !== 'string' || typeof result.filename !== 'string') {
    throw new Error('The server returned incomplete photo metadata.');
  }
  return {
    filename: result.filename,
    url: resolveImageUrl(result.url),
    uploaded_at: result.uploaded_at,
  };
}

export async function getPhotos() {
  const result = await requestJson('/photos');
  if (!Array.isArray(result)) throw new Error('The server returned an invalid photo gallery.');
  return result.map((photo) => {
    if (!photo || typeof photo.filename !== 'string' || typeof photo.url !== 'string') {
      throw new Error('The server returned invalid photo metadata.');
    }
    return { ...photo, url: resolveImageUrl(photo.url) };
  });
}
