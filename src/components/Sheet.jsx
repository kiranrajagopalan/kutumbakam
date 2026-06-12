import { useEffect } from 'react';

// One overlay primitive, two grammars (paper & ink law): below lg it is a
// bottom sheet — content slides to the thumb; at lg+ it is a centered paper
// dialog laid over the page. Inspect-type surfaces (record panel, index)
// dock instead — this component is only for brief transactions.
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
    <div className="fixed inset-0 z-50 lg:flex lg:items-center lg:justify-center">
      <div className="animate-fade-in absolute inset-0 bg-ink/35" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto max-w-[440px] rounded-t-[22px] bg-card shadow-sheet lg:animate-dialog-in lg:relative lg:inset-auto lg:w-[480px] lg:max-w-[calc(100vw-48px)] lg:rounded-[22px] lg:shadow-pop"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line lg:hidden" />
        <div className="max-h-[85dvh] overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 lg:max-h-[78dvh] lg:px-6 lg:pb-6 lg:pt-5">
          {title && <h2 className="mb-4 font-display text-[20px] font-semibold">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}
