import { useEffect, useState } from 'react';

// The one responsive fork (paper & ink desktop grammar): ≥1024px gets the
// desk layout — workspace panes and centered dialogs; below it the touch
// layout — pages and bottom sheets. iPad portrait deliberately stays touch.
const QUERY = '(min-width: 1024px)';

export function useIsDesktop() {
  const [is, setIs] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const fn = () => setIs(mq.matches);
    mq.addEventListener('change', fn);
    // Some embedded/emulated viewports resize without firing matchMedia
    // change events — the resize fallback keeps the fork honest there.
    window.addEventListener('resize', fn);
    return () => {
      mq.removeEventListener('change', fn);
      window.removeEventListener('resize', fn);
    };
  }, []);
  return is;
}
