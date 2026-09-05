'use client';

import { useState } from 'react';

const FIELDS = [
  { key: 'chest', label: 'Chest (in)' },
  { key: 'waist', label: 'Waist (in)' },
  { key: 'hip', label: 'Hip (in)' },
  { key: 'armhole', label: 'Armhole (in)' },
  { key: 'fullLength', label: 'Full Length (in)' },
];

const initialState = {
  name: '',
  email: '',
  chest: '',
  waist: '',
  hip: '',
  armhole: '',
  fullLength: '',
  notes: '',
};

export default function MeasurementForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle');

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    const message = [
      `Chest: ${form.chest || '—'}"`,
      `Waist: ${form.waist || '—'}"`,
      `Hip: ${form.hip || '—'}"`,
      `Armhole: ${form.armhole || '—'}"`,
      `Full Length: ${form.fullLength || '—'}"`,
      '',
      form.notes ? `Notes: ${form.notes}` : 'Notes: —',
    ].join('\n');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'measurements', name: form.name, email: form.email, message }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setForm(initialState);
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p className="bg-cream-dark/60 rounded-sm p-6 text-center text-forest-dark">
        Thanks — we&apos;ve got your measurements and will be in touch to confirm your order.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-forest/60 mb-1.5">Name</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-forest/60 mb-1.5">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>

        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs uppercase tracking-wide text-forest/60 mb-1.5">{f.label}</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 36"
              value={form[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-xs uppercase tracking-wide text-forest/60 mb-1.5">
          Notes (colour, occasion, reference photo link, anything else)
        </label>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      {status === 'error' && <p className="text-sm text-red-500 mt-3">Something went wrong — please try again.</p>}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-6 w-full sm:w-auto bg-gold text-forest-dark px-10 py-3 uppercase text-sm tracking-widest hover:opacity-90 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send My Measurements'}
      </button>
    </form>
  );
}
