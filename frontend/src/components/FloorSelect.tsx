import { useEffect, useId, useRef, useState } from 'react';
import type { Floor } from './FloorMap';

/** iOS-style pull-down menu. A native <select> does not open inside the MAUI HybridWebView. */
export default function FloorSelect({ floors, value, onChange }: {
  floors: Floor[];
  value: Floor;
  onChange: (floor: Floor) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  function choose(floor: Floor) {
    onChange(floor);
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div className="floor-select" ref={root} onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); button.current?.focus(); }
    }}>
      <button ref={button} type="button" className="floor-select-button" aria-haspopup="listbox"
        aria-expanded={open} aria-controls={listId} aria-label={`Building floor: Floor ${value}`}
        onClick={() => setOpen(!open)}>
        Floor {value}
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
      </button>
      {open && <ul id={listId} role="listbox" className="floor-select-menu" aria-label="Building floor">
        {floors.map(floor => <li key={floor} role="option" aria-selected={floor === value}>
          <button type="button" onClick={() => choose(floor)}>
            Floor {floor}
            {floor === value && <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
          </button>
        </li>)}
      </ul>}
    </div>
  );
}
