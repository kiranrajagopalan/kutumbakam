import { useState } from 'react';
import { TextField, YearField, Toggle, GenderSeg, Button } from './fields.jsx';
import { toast } from '../lib/toast.js';

// The fast path: a name is enough. Everything else is optional and can be
// filled in later from the person's page.
export default function QuickPersonForm({ presetGender = '', submitLabel = 'Add', onSubmit }) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState(presetGender);
  const [birthYear, setBirthYear] = useState(null);
  const [birthApprox, setBirthApprox] = useState(false);
  const [isAlive, setIsAlive] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast('A name or nickname is all we need', 'error');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        nickname: nickname.trim(),
        gender,
        birthYear,
        birthApprox,
        isAlive,
        deathYear: null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField label="Name" value={name} onChange={setName} placeholder="Their name" autoFocus />
      <TextField
        label="Known as (optional)"
        value={nickname}
        onChange={setNickname}
        placeholder="What the family calls them"
      />
      <GenderSeg value={gender} onChange={setGender} />
      <YearField
        label="Born (optional)"
        year={birthYear}
        approx={birthApprox}
        onYear={setBirthYear}
        onApprox={setBirthApprox}
      />
      <Toggle
        label="Living"
        caption="Turn off for someone who has passed"
        checked={isAlive}
        onChange={setIsAlive}
      />
      <Button onClick={submit} disabled={busy} className="mt-1 w-full">
        {submitLabel}
      </Button>
      <p className="text-center text-[12px] text-ink-faint">
        Photos, places and stories can be added any time from their page.
      </p>
    </div>
  );
}
