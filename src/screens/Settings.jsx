import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Mark from '../components/Mark.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';
import { ChevronLeft } from '../components/icons.jsx';
import { countPersons } from '../db/repo.js';
import { downloadExport, importFile, wipeAll, isDemoData } from '../db/exportImport.js';
import { loadDemo } from '../db/seed.js';
import { toast } from '../lib/toast.js';
import { nav, back } from '../lib/router.js';

function Card({ label, children }) {
  return (
    <section className="mt-6">
      <span className="label-caps mb-1.5 block px-1.5">{label}</span>
      <div className="rounded-card border border-line bg-card p-1.5">{children}</div>
    </section>
  );
}

function Row({ title, caption, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[13px] px-3 py-3 text-left transition-colors hover:bg-accent-soft/35"
    >
      <span className={`block text-[15px] font-medium ${danger ? 'text-accent-deep' : ''}`}>{title}</span>
      {caption && <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{caption}</span>}
    </button>
  );
}

export default function Settings() {
  const count = useLiveQuery(() => countPersons(), []) ?? 0;
  const demo = useLiveQuery(() => isDemoData(), []) ?? false;
  const fileRef = useRef(null);
  const [confirm, setConfirm] = useState(null);
  const [importError, setImportError] = useState(null);

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
    <div className="px-4 pb-16 pt-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="-ml-1.5 flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
        >
          <ChevronLeft />
        </button>
        <h1 className="font-display text-[20px] font-semibold">Settings</h1>
      </div>

      <Card label="Your data">
        <Row
          title="Export a backup"
          caption="Everything, including phone numbers and private notes. Keep it somewhere safe."
          onClick={async () => {
            const n = await downloadExport('backup');
            toast(`Backup saved — ${n} people`);
          }}
        />
        <Row
          title="Export a shareable copy"
          caption="For sending to family. Phone numbers and private notes are left out."
          onClick={async () => {
            const n = await downloadExport('share');
            toast(`Shareable copy saved — ${n} people, contact info left out`);
          }}
        />
        <Row
          title="Import a backup"
          caption="Replaces everything currently in the tree."
          onClick={() => {
            setImportError(null);
            if (count > 0) {
              setConfirm({
                title: 'Replace the current tree?',
                message: `Importing replaces the ${count} people currently in the tree with the file's contents. Export a backup first if you haven't.`,
                confirmLabel: 'Choose file & replace',
                danger: true,
                action: () => fileRef.current?.click(),
              });
            } else {
              fileRef.current?.click();
            }
          }}
        />
        {importError && (
          <div className="mx-1.5 mb-1.5 flex items-start gap-2 rounded-[13px] border border-[#d9b6ae] bg-accent-soft/50 px-3 py-2.5">
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
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImportFile} />
      </Card>

      <Card label="Demo">
        <Row
          title={demo ? 'Demo family is loaded' : 'Load the demo family'}
          caption="A fictional 22-person family showing remarriage, adoption and an in-family marriage."
          onClick={() => {
            const run = async () => {
              const n = await loadDemo();
              toast(`Demo family loaded — ${n} people`);
              nav('/');
            };
            if (count > 0 && !demo) {
              setConfirm({
                title: 'Replace with the demo?',
                message: `This replaces the ${count} people currently in the tree with the fictional demo family.`,
                confirmLabel: 'Load demo',
                danger: true,
                action: run,
              });
            } else {
              run();
            }
          }}
        />
      </Card>

      <Card label="Danger">
        <Row
          danger
          title="Erase everything"
          caption="Removes every person from this device. Export a backup first."
          onClick={() =>
            setConfirm({
              title: 'Erase everything?',
              message: 'Every person on this device will be removed. This cannot be undone — export a backup first if in doubt.',
              confirmLabel: 'Erase everything',
              danger: true,
              action: async () => {
                await wipeAll();
                toast('All data erased');
              },
            })
          }
        />
      </Card>

      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <Mark className="size-9" />
        <p className="font-display text-[16px] font-semibold">Kutumbakam</p>
        <p className="tnum text-[12.5px] text-ink-faint">
          v{__APP_VERSION__} · {__BUILD_SHA__} · local-first — your family stays on your device
        </p>
        <p className="mt-3 max-w-[32ch] text-[12.5px] leading-relaxed text-ink-faint">
          Coming next: “how are we related” · Tulu kinship terms · careful sharing
        </p>
      </div>

      <ConfirmSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={() => confirm?.action()}
      />
    </div>
  );
}
