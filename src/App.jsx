import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { countPersons } from './db/repo.js';
import { onToast } from './lib/toast.js';
import { useRoute } from './lib/router.js';
import { useIsDesktop } from './lib/useIsDesktop.js';
import Onboarding from './screens/Onboarding.jsx';
import PeopleList from './screens/PeopleList.jsx';
import PersonDetail from './screens/PersonDetail.jsx';
import PersonForm from './screens/PersonForm.jsx';
import Settings from './screens/Settings.jsx';
import TreeView from './screens/TreeView.jsx';
import Workspace from './screens/Workspace.jsx';

function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(
    () =>
      onToast((t) => {
        setToasts((cur) => [...cur, t]);
        setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 3200);
      }),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toast-in max-w-full truncate rounded-full px-4 py-2.5 text-[13.5px] font-medium shadow-pop ${
            t.kind === 'error' ? 'bg-accent-deep text-[#fff8f3]' : 'bg-ink text-paper'
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function UpdateBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(true);
    window.addEventListener('kutumbakam:sw-update', fn);
    return () => window.removeEventListener('kutumbakam:sw-update', fn);
  }, []);
  if (!show) return null;
  // A compact floating chip, not a full-width bar: a bar overlaying the top
  // of the screen swallowed clicks meant for the tree's pills underneath it.
  return (
    <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink py-1.5 pl-4 pr-1.5 text-paper shadow-pop">
      <span className="whitespace-nowrap text-[13px]">New version</span>
      <button
        type="button"
        onClick={() => window.__kutumbakamApplyUpdate?.()}
        className="rounded-full bg-paper px-3 py-1 text-[12.5px] font-semibold text-ink"
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setShow(false)}
        className="flex size-7 items-center justify-center rounded-full text-paper/70 transition-colors hover:text-paper"
      >
        ✕
      </button>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const count = useLiveQuery(() => countPersons(), []);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, route.id]);

  let screen = null;
  let full = false; // workspace and tree own the whole viewport — no column cap
  if (count === undefined) screen = null; // first IndexedDB read — avoid a flash
  else if (count === 0) screen = <Onboarding />;
  else if (isDesktop && (route.name === 'home' || route.name === 'person' || route.name === 'tree')) {
    screen = <Workspace route={route} />;
    full = true;
  } else if (route.name === 'person') screen = <PersonDetail id={route.id} key={route.id} />;
  else if (route.name === 'edit') screen = <PersonForm id={route.id} key={route.id} />;
  else if (route.name === 'settings') screen = <Settings />;
  else if (route.name === 'tree') {
    screen = <TreeView focusId={route.focusId} />;
    full = true;
  } else screen = <PeopleList />;

  return (
    <div className={full ? 'min-h-dvh' : 'mx-auto min-h-dvh w-full max-w-[440px] lg:max-w-[520px]'}>
      {screen}
      <ToastHost />
      <UpdateBanner />
    </div>
  );
}
