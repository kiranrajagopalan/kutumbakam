import { useRef, useState } from 'react';
import Mark from '../components/Mark.jsx';
import { TextField, GenderSeg, Button } from '../components/fields.jsx';
import { createPerson } from '../db/repo.js';
import { loadDemo } from '../db/seed.js';
import { importFile } from '../db/exportImport.js';
import { toast } from '../lib/toast.js';
import { nav } from '../lib/router.js';

export default function Onboarding() {
  const [mode, setMode] = useState('menu');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [importError, setImportError] = useState(null);
  const fileRef = useRef(null);

  async function startSelf() {
    if (!name.trim()) {
      toast('Tell us your name to begin', 'error');
      return;
    }
    const p = await createPerson({ name: name.trim(), gender, isSelf: true });
    nav(`/p/${p.id}`);
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    try {
      const n = await importFile(file);
      toast(`Imported ${n} people`);
      nav('/');
    } catch (err) {
      setImportError(err.message);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-7 py-12">
      <Mark className="size-14" />
      <h1 className="mt-6 font-display text-[36px] font-semibold leading-[1.1]">Kutumbakam</h1>
      <p className="mt-3 max-w-[34ch] text-[15.5px] leading-relaxed text-ink-soft">
        A private place to remember who you all are — and how everyone is connected.
      </p>

      {mode === 'menu' ? (
        <div className="mt-9 flex flex-col gap-2.5">
          <Button onClick={() => setMode('self')} className="w-full">
            Start with yourself
          </Button>
          <Button
            kind="secondary"
            className="w-full"
            onClick={async () => {
              const n = await loadDemo();
              toast(`Demo family loaded — ${n} people`);
              nav('/');
            }}
          >
            Explore a demo family
          </Button>
          <Button kind="ghost" className="w-full" onClick={() => fileRef.current?.click()}>
            Import a backup
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
          {importError && (
            <div className="flex items-start gap-2 rounded-[13px] border border-[#d9b6ae] bg-accent-soft/50 px-3 py-2.5">
              <p className="flex-1 text-[13px] leading-snug text-accent-deep">
                <span className="font-semibold">Import failed.</span> {importError}
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setImportError(null)}
                className="text-[13px] font-semibold text-accent-deep/70"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-9 flex flex-col gap-4">
          <TextField label="Your name" value={name} onChange={setName} placeholder="As the family knows you" autoFocus />
          <GenderSeg value={gender} onChange={setGender} />
          <Button onClick={startSelf} className="w-full">
            Begin the tree
          </Button>
          <button
            type="button"
            onClick={() => setMode('menu')}
            className="text-center text-[13.5px] font-medium text-ink-soft"
          >
            ← Back
          </button>
        </div>
      )}

      <p className="mt-12 text-[12.5px] leading-relaxed text-ink-faint">
        Everything stays on this device. No account, no cloud, no tracking.
      </p>
    </div>
  );
}
