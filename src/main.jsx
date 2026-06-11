import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// DEV-only: ?testimport=1 loads /public/test-backup.json into the database —
// lets us reproduce user-reported bugs in other local browsers (Safari)
// where we can't inject data programmatically. ?diag=1 additionally walks the
// rendered tree's SVG text glyphs and POSTs measurements to the dev server
// (/tmp/kutu-diag.log) so WebKit rendering can be debugged without screen
// access. Never part of a build.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('testimport')) {
  try {
    const { importData } = await import('./db/exportImport.js');
    const json = await (await fetch('/test-backup.json')).json();
    await importData(json);
    console.log('[dev] test backup imported');
  } catch (e) {
    console.warn('[dev] test import failed', e);
  }
}
if (import.meta.env.DEV && new URLSearchParams(location.search).has('diag')) {
  const snapshot = (label) => {
    const nodes = [...document.querySelectorAll('[data-pid]')].map((g) => {
      const texts = [...g.querySelectorAll('text')].map((t) => {
        let bbox = null;
        try {
          const b = t.getBBox();
          bbox = { w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 };
        } catch {
          bbox = 'getBBox threw';
        }
        const cs = getComputedStyle(t);
        return {
          content: t.textContent,
          bbox,
          fill: t.getAttribute('fill'),
          font: cs.fontFamily.split(',')[0],
          size: cs.fontSize,
        };
      });
      return { pid: g.getAttribute('data-pid').slice(0, 8), texts };
    });
    return {
      label,
      ua: navigator.userAgent.slice(0, 80),
      fontsStatus: document.fonts.status,
      loadedFonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
      nodeCount: nodes.length,
      nodes,
    };
  };
  const post = (data) =>
    fetch('/__diag', { method: 'POST', body: JSON.stringify(data) }).catch(() => {});
  setTimeout(() => {
    location.hash = '/tree';
    // unfold all in-law capsules so every node is measurable
    setTimeout(() => {
      const pill = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('In-laws'));
      if (pill && pill.textContent.includes('folded')) pill.click();
    }, 1500);
    setTimeout(() => post(snapshot('t+3s')), 3000);
    setTimeout(() => post(snapshot('t+8s')), 8000);
  }, 500);
}

const updateSW = registerSW({
  onNeedRefresh() {
    // App.jsx listens for this and shows the "New version — Reload" banner.
    window.__kutumbakamApplyUpdate = () => updateSW(true);
    window.dispatchEvent(new Event('kutumbakam:sw-update'));
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
