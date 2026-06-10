// Tiny module-level toast bus — avoids threading context through every screen.
const listeners = new Set();

export function toast(msg, kind = 'info') {
  for (const l of listeners) l({ id: `${Date.now()}-${Math.random()}`, msg, kind });
}

export function onToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
