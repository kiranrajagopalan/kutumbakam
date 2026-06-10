import { useEffect, useState } from 'react';
import Sheet from './Sheet.jsx';
import { Label, YearField, Button } from './fields.jsx';
import { updateUnion } from '../db/repo.js';
import { toast } from '../lib/toast.js';

const STATUSES = [
  ['married', 'Married'],
  ['widowed', 'Widowed'],
  ['divorced', 'Divorced'],
];

// Edits the facts of a couple (not a person): marriage year and status.
export default function UnionSheet({ open, onClose, union, names }) {
  const [year, setYear] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (open && union) {
      setYear(union.marriageYear ?? null);
      setStatus(union.status || '');
    }
  }, [open, union]);

  if (!union) return null;

  async function save() {
    await updateUnion(union.id, { marriageYear: year, status });
    toast('Marriage updated');
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={names}>
      <div className="flex flex-col gap-4">
        <YearField label="Married in" year={year} onYear={setYear} />
        <div>
          <Label>Status</Label>
          <div className="flex gap-1 rounded-[13px] border border-line bg-card p-1">
            {STATUSES.map(([v, text]) => (
              <button
                key={v}
                type="button"
                aria-pressed={status === v}
                onClick={() => setStatus(status === v ? '' : v)}
                className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors ${
                  status === v ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={save} className="mt-1 w-full">
          Save
        </Button>
      </div>
    </Sheet>
  );
}
