// Photos are stored as small webp Blobs inside IndexedDB so the whole tree
// stays portable in a single export file.

async function decodeToBitmap(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Fallback path for formats createImageBitmap can't take directly.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }
}

export async function fileToPhotoBlob(file, max = 640) {
  const src = await decodeToBitmap(file);
  const w0 = src.width || src.naturalWidth;
  const h0 = src.height || src.naturalHeight;
  const scale = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(src, 0, 0, w, h);
  if (src.close) src.close();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.82));
  return blob || file;
}

// Object-URL cache keyed by id+updatedAt so edits bust stale URLs without
// leaking a new URL per render.
const urlCache = new Map();

export function photoUrlFor(person) {
  if (!person?.photo) return null;
  const key = `${person.id}:${person.updatedAt}`;
  if (!urlCache.has(key)) urlCache.set(key, URL.createObjectURL(person.photo));
  return urlCache.get(key);
}
