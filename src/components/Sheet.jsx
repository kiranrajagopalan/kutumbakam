import { useEffect } from 'react';

export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="animate-fade-in absolute inset-0 bg-ink/35" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto max-w-[440px] rounded-t-[22px] bg-card shadow-sheet"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line" />
        <div className="max-h-[85dvh] overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
          {title && <h2 className="mb-4 font-display text-[20px] font-semibold">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}
