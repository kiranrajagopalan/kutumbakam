export function Label({ children }) {
  return <span className="label-caps mb-1.5 block">{children}</span>;
}

// 16px minimum on every input: iOS Safari auto-zooms the page on focusing
// anything smaller, and the zoom sticks — breaking layout and SVG text.
const inputCls =
  'w-full rounded-[13px] border border-line bg-card px-3.5 py-2.5 text-[16px] placeholder:text-ink-faint focus:border-accent focus:outline-none';

export function TextField({ label, value, onChange, placeholder, autoFocus, inputMode, hint }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      {hint && <span className="mt-1 block text-[12px] leading-snug text-ink-faint">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, value, onChange, placeholder, rows = 3, hint }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-none`}
      />
      {hint && <span className="mt-1 block text-[12px] leading-snug text-ink-faint">{hint}</span>}
    </label>
  );
}

export function YearField({ label, year, approx, onYear, onApprox }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={year ?? ''}
          placeholder="YYYY"
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
            onYear(v ? Number(v) : null);
          }}
          className={`${inputCls} tnum w-28`}
        />
        {onApprox && (
          <button
            type="button"
            onClick={() => onApprox(!approx)}
            aria-pressed={approx}
            className={`rounded-full border px-3 py-2 text-[13px] font-medium transition-colors ${
              approx
                ? 'border-accent bg-accent-soft text-accent-deep'
                : 'border-line bg-card text-ink-soft'
            }`}
          >
            circa
          </button>
        )}
      </div>
    </div>
  );
}

export function NumberField({ label, value, onChange, placeholder, hint }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <input
        type="text"
        inputMode="numeric"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 2);
          onChange(v ? Number(v) : null);
        }}
        className={`${inputCls} tnum w-24`}
      />
      {hint && <span className="mt-1 block text-[12px] text-ink-faint">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, caption, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-[13px] border border-line bg-card px-3.5 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium">{label}</span>
        {caption && <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{caption}</span>}
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-leaf' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

export function GenderSeg({ value, onChange }) {
  const opt = (v, text) => (
    <button
      type="button"
      onClick={() => onChange(value === v ? '' : v)}
      aria-pressed={value === v}
      className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors ${
        value === v ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper'
      }`}
    >
      {text}
    </button>
  );
  return (
    <div>
      <Label>Gender</Label>
      <div className="flex gap-1 rounded-[13px] border border-line bg-card p-1">
        {opt('female', 'Female')}
        {opt('male', 'Male')}
      </div>
    </div>
  );
}

const BUTTON_KINDS = {
  primary: 'bg-accent text-[#fff8f3] shadow-pop active:bg-accent-deep',
  secondary: 'border border-line bg-card active:bg-accent-soft/50',
  ghost: 'text-accent-deep active:bg-accent-soft/40',
  danger: 'border border-[#d9b6ae] bg-card text-accent-deep active:bg-accent-soft/60',
};

export function Button({ kind = 'primary', className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full px-5 py-3 text-[15px] font-semibold transition-colors disabled:opacity-40 ${BUTTON_KINDS[kind]} ${className}`}
    />
  );
}
