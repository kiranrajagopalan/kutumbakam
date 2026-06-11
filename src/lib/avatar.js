// Deterministic initials avatars — muted archival tones, AA-contrast pairs.
// Gender is deliberately not colour-coded.
const TONES = [
  { bg: '#e9dfd2', fg: '#5c4a33' }, // sand
  { bg: '#dde4d9', fg: '#44563c' }, // sage
  { bg: '#e6dbe0', fg: '#5d3f51' }, // rosewood
  { bg: '#d9e2e6', fg: '#35525e' }, // slate
  { bg: '#ece1cf', fg: '#6b5524' }, // turmeric
  { bg: '#e3dde9', fg: '#4d4463' }, // iris
  { bg: '#e7ddd3', fg: '#6e4430' }, // clay
  { bg: '#d8e4df', fg: '#33584c' }, // pine
  { bg: '#ece0d8', fg: '#7c3325' }, // henna
  { bg: '#e0e0d6', fg: '#4f5343' }, // olive
];

export function toneFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

// Blend two hex colors. Used by the tree to render "dimmed" nodes as solid
// pre-blended colors instead of opacity — translucent fills let connector
// lines show through the avatar circle.
export function mixHex(a, b, t) {
  if (t <= 0) return a;
  const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16));
  const pb = b.match(/\w\w/g).map((x) => parseInt(x, 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export function initialsOf(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '·';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
