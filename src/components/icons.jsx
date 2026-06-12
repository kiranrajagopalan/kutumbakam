const I = ({ children, className = 'size-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

export const ChevronLeft = (p) => <I {...p}><path d="M15 18l-6-6 6-6" /></I>;
export const Plus = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const Gear = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1.02-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.56 1.02H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03z" />
  </I>
);
export const Lock = (p) => (
  <I {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </I>
);
export const Camera = (p) => (
  <I {...p}>
    <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h1.6l1.2-1.8c.2-.3.5-.5.9-.5h4.6c.4 0 .7.2.9.5L16.4 6H18a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5z" />
    <circle cx="12" cy="12.5" r="3.2" />
  </I>
);
export const Pencil = (p) => <I {...p}><path d="M17 3a2.8 2.8 0 1 1 4 4L8 20l-5 1 1-5z" /></I>;
export const TreeGlyph = (p) => (
  <I {...p}>
    <circle cx="7" cy="5.5" r="2.4" />
    <circle cx="17" cy="5.5" r="2.4" />
    <circle cx="12" cy="18.5" r="2.4" />
    <path d="M7 8v3.5h10V8M12 11.5V16" />
  </I>
);
export const ListGlyph = (p) => (
  <I {...p}>
    <path d="M8.5 6h11M8.5 12h11M8.5 18h11" />
    <circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
  </I>
);
export const FitGlyph = (p) => (
  <I {...p}>
    <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5V9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15M15 20h3.5a1.5 1.5 0 0 0 1.5-1.5V15" />
  </I>
);
// The "find me" mark — same visual language as the dashed self-ring on the tree.
export const LocateGlyph = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7.5" strokeDasharray="2.6 3.4" />
    <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
  </I>
);
export const PanelGlyph = (p) => (
  <I {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <path d="M9.5 5v14" />
  </I>
);
