import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Avatar from '../components/Avatar.jsx';
import { ChevronLeft, Camera } from '../components/icons.jsx';
import {
  TextField,
  TextArea,
  YearField,
  NumberField,
  Toggle,
  GenderSeg,
  Button,
} from '../components/fields.jsx';
import { getPerson, updatePerson, deletePerson } from '../db/repo.js';
import { fileToPhotoBlob } from '../lib/photos.js';
import { toast } from '../lib/toast.js';
import { nav, back } from '../lib/router.js';

function Group({ label, children }) {
  return (
    <section className="mt-7">
      <span className="label-caps mb-2.5 block px-1">{label}</span>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export default function PersonForm({ id }) {
  const person = useLiveQuery(() => getPerson(id), [id]);
  const [form, setForm] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (person && !form) setForm({ ...person });
  }, [person, form]);

  if (!person || !form) return null;
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await fileToPhotoBlob(file);
      setForm((f) => ({ ...f, photo: blob }));
      setPhotoPreview(URL.createObjectURL(blob));
    } catch {
      toast('That image could not be read', 'error');
    }
    e.target.value = '';
  }

  async function save() {
    if (!form.name.trim()) {
      toast('Name cannot be empty', 'error');
      return;
    }
    const { id: _id, createdAt: _c, updatedAt: _u, ...patch } = form;
    patch.name = patch.name.trim();
    await updatePerson(id, patch);
    toast('Saved');
    nav(`/p/${id}`);
  }

  async function remove() {
    const ok = window.confirm(
      `Remove ${person.name} from the tree?\n\nTheir connections to parents, partners and children will also be removed. This cannot be undone.`,
    );
    if (!ok) return;
    await deletePerson(id);
    toast(`${person.name} removed`);
    nav('/');
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="-ml-1.5 flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-accent-soft/40"
        >
          <ChevronLeft />
        </button>
        <h1 className="truncate font-display text-[20px] font-semibold">Edit {person.name}</h1>
      </div>

      <div className="mt-5 flex items-center gap-5 px-1">
        {photoPreview ? (
          <img src={photoPreview} alt="" className="size-24 shrink-0 rounded-full object-cover" />
        ) : (
          <Avatar person={{ ...person, photo: form.photo }} size="xl" showSelf={false} />
        )}
        <div className="flex flex-col items-start gap-1.5">
          <Button kind="secondary" className="px-4 py-2 text-[13.5px]" onClick={() => fileRef.current?.click()}>
            <span className="flex items-center gap-1.5">
              <Camera className="size-4" />
              {form.photo ? 'Replace photo' : 'Add photo'}
            </span>
          </Button>
          {form.photo && (
            <Button
              kind="ghost"
              className="px-4 py-2 text-[13.5px]"
              onClick={() => {
                setForm((f) => ({ ...f, photo: null }));
                setPhotoPreview(null);
              }}
            >
              Remove photo
            </Button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
      </div>

      <Group label="Essentials">
        <TextField label="Name" value={form.name} onChange={set('name')} />
        <TextField
          label="Known as"
          value={form.nickname}
          onChange={set('nickname')}
          placeholder="What the family calls them"
        />
        <GenderSeg value={form.gender} onChange={set('gender')} />
        <Toggle
          label="Living"
          caption="Turn off for someone who has passed"
          checked={form.isAlive}
          onChange={set('isAlive')}
        />
      </Group>

      <Group label="Dates">
        <YearField
          label="Born"
          year={form.birthYear}
          approx={form.birthApprox}
          onYear={set('birthYear')}
          onApprox={set('birthApprox')}
        />
        {!form.isAlive && (
          <YearField
            label="Passed"
            year={form.deathYear}
            approx={form.deathApprox}
            onYear={set('deathYear')}
            onApprox={set('deathApprox')}
          />
        )}
        <NumberField
          label="Birth order"
          value={form.birthOrder}
          onChange={set('birthOrder')}
          placeholder="–"
          hint="Position among siblings, 1 = eldest. Matters for kinship terms like elder/younger uncle."
        />
      </Group>

      <Group label="Roots & places">
        <TextField label="Native place" value={form.nativePlace} onChange={set('nativePlace')} placeholder="Ooru / native town" />
        <TextField label="Family house" value={form.familyHouse} onChange={set('familyHouse')} placeholder="House or family name, if used" />
        <TextField label="Lives in" value={form.currentCity} onChange={set('currentCity')} placeholder="Current city" />
      </Group>

      <Group label="Contact">
        <TextField
          label="Phone"
          value={form.phone}
          onChange={set('phone')}
          inputMode="tel"
          placeholder="+91…"
          hint="Stays on this device. Never included in a shareable export."
        />
      </Group>

      <Group label="Stories">
        <TextField label="Occupation" value={form.occupation} onChange={set('occupation')} />
        <TextArea
          label="Notes"
          value={form.notes}
          onChange={set('notes')}
          placeholder="How you know them, stories, anything worth remembering…"
        />
        <TextArea
          label="Private note"
          value={form.privateNotes}
          onChange={set('privateNotes')}
          placeholder="For your eyes only"
          hint="Never leaves this device — left out of every shared export."
        />
      </Group>

      <div className="mt-10">
        <Button kind="danger" className="w-full" onClick={remove}>
          Remove {person.name} from the tree…
        </Button>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-paper/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
        <Button onClick={save} className="w-full">
          Save
        </Button>
      </div>
    </div>
  );
}
