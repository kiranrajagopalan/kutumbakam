import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

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
