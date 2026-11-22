import { useState } from 'react';

/** Button-based chooser also works in the MAUI HybridWebView. */
export default function RoomSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return <div className="atlas-choice" onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
      {label}: {options.find(option => option.id === value)?.label ?? 'Select'} ▾
    </button>
    {open && <div className="atlas-options" role="group" aria-label={label}>
      {options.map(option => <button type="button" key={option.id} aria-pressed={value === option.id}
        onClick={() => { onChange(option.id); setOpen(false); }}>{option.label}</button>)}
    </div>}
  </div>;
}
