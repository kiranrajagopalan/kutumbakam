import { useEffect, useState } from 'react';

// Hash routing so Android's back button works inside the installed PWA.
//   #/            people list
//   #/p/:id       person detail
//   #/p/:id/edit  edit person
//   #/settings    settings
export const nav = (to) => {
  location.hash = to.startsWith('/') ? to : `/${to}`;
};

export const back = () => {
  if (history.length > 1) history.back();
  else nav('/');
};

export function useRoute() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const fn = () => setHash(location.hash);
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'p' && parts[1]) {
    return parts[2] === 'edit' ? { name: 'edit', id: parts[1] } : { name: 'person', id: parts[1] };
  }
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'tree') return { name: 'tree', focusId: parts[1] || null };
  return { name: 'home' };
}
