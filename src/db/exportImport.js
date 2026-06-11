import { db } from './db.js';
import { blankPerson } from './repo.js';
import { buildGedcom } from '../lib/gedcom.js';

const blobToDataUrl = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

const dataUrlToBlob = async (url) => (await fetch(url)).blob();

// mode 'backup'  → everything, for your own safekeeping.
// mode 'share'   → strips the sensitive class (phone, private notes) so a
//                  forwarded file can't become a contact directory.
export async function exportData(mode) {
  const persons = await db.persons.toArray();
  const out = [];
  for (const p of persons) {
    const { photo, ...rest } = p;
    if (mode === 'share') {
      rest.phone = '';
      rest.privateNotes = '';
    }
    rest.photoDataUrl = photo ? await blobToDataUrl(photo) : null;
    out.push(rest);
  }
  return {
    app: 'kutumbakam',
    formatVersion: 1,
    mode,
    exportedAt: new Date().toISOString(),
    persons: out,
    unions: await db.unions.toArray(),
    childLinks: await db.childLinks.toArray(),
  };
}

export async function downloadExport(mode) {
  const data = await exportData(mode);
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kutumbakam-${mode}-${stamp}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return data.persons.length;
}

// GEDCOM 5.5.1 — the standard interchange format other family-tree tools
// read. Share-class rules apply: sensitive fields never leave (the builder
// itself doesn't know they exist).
export async function downloadGedcom() {
  const [persons, unions, childLinks] = await Promise.all([
    db.persons.toArray(),
    db.unions.toArray(),
    db.childLinks.toArray(),
  ]);
  const text = buildGedcom({ persons, unions, childLinks });
  const blob = new Blob([text], { type: 'text/plain' });
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kutumbakam-${stamp}.ged`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return persons.length;
}

// Reads a picked backup File and imports it, with failure messages a human
// can act on. iOS quirk this guards against: files still in iCloud arrive
// EMPTY from the picker.
export async function importFile(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    throw new Error('The file could not be read from storage. Try picking it again.');
  }
  if (!text || !text.trim()) {
    throw new Error(
      'The file arrived empty. If it lives in iCloud, open it once in the Files app so it downloads, then try importing again.',
    );
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('That file is not readable as a backup — it may be incomplete or not a Kutumbakam export.');
  }
  return importData(json);
}

// Replaces the whole database with the file's contents (v1 semantics —
// merging two trees is a later milestone).
export async function importData(json) {
  if (json?.app !== 'kutumbakam' || !Array.isArray(json.persons)) {
    throw new Error('Not a Kutumbakam export file');
  }
  const persons = [];
  for (const raw of json.persons) {
    const { photoDataUrl, ...rest } = raw;
    persons.push({
      ...blankPerson(),
      ...rest,
      photo: photoDataUrl ? await dataUrlToBlob(photoDataUrl) : null,
    });
  }
  await db.transaction('rw', db.persons, db.unions, db.childLinks, db.meta, async () => {
    await Promise.all([db.persons.clear(), db.unions.clear(), db.childLinks.clear()]);
    await db.persons.bulkAdd(persons);
    await db.unions.bulkAdd(json.unions || []);
    await db.childLinks.bulkAdd(json.childLinks || []);
    await db.meta.put({ key: 'demo', value: false });
  });
  return persons.length;
}

export async function wipeAll() {
  await db.transaction('rw', db.persons, db.unions, db.childLinks, db.meta, async () => {
    await Promise.all([db.persons.clear(), db.unions.clear(), db.childLinks.clear(), db.meta.clear()]);
  });
}

export const isDemoData = async () => (await db.meta.get('demo'))?.value === true;
