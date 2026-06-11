import Sheet from './Sheet.jsx';
import { Button } from './fields.jsx';

// In-app replacement for window.confirm — native dialogs are unreliable in
// installed PWAs and invisible to our design system.
export default function ConfirmSheet({ open, onClose, title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-[14.5px] leading-relaxed text-ink-soft">{message}</p>
      <div className="mt-5 flex flex-col gap-2 pb-2">
        <Button
          kind={danger ? 'danger' : 'primary'}
          className="w-full"
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
        <Button kind="ghost" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  );
}
