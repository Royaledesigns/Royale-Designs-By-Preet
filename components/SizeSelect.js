'use client';

import { useEffect, useRef, useState } from 'react';

// A custom-styled stand-in for a native <select> — needed because iOS
// Safari's (and some Android browsers') built-in picker UI ignores inline
// color/style set on <option> entirely, so the ready-to-ship / low-stock /
// custom-order colour-coding on the size dropdown would only ever show up
// on desktop. This draws its own dropdown instead, so the colours (and the
// greyed-out look for out-of-stock sizes) look the same on every device.
export default function SizeSelect({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={selected?.style}
        className="w-full flex items-center justify-between border border-forest/20 rounded-sm px-3 py-2.5 bg-white text-left focus:outline-none focus:ring-1 focus:ring-gold"
      >
        <span>{selected?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 ml-2 text-forest/50 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-forest/20 rounded-sm shadow-lg max-h-72 overflow-y-auto py-1"
        >
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                disabled={o.disabled}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={o.style}
                className={`w-full text-left px-3 py-2.5 ${
                  o.disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-cream-dark'
                } ${o.value === value ? 'bg-cream-dark' : ''}`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
