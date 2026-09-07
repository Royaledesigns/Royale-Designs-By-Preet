'use client';

import { useState } from 'react';
import siteConfig from './SiteConfig';

// wa.me wants a bare international number — strip the "+" and any spaces
// from the display-formatted phone in SiteConfig.
const WHATSAPP_NUMBER = siteConfig.phone.replace(/[^\d]/g, '');

const FIELDS = [
  { key: 'chest', label: 'Chest (in)', placeholder: 'e.g. 36' },
  { key: 'waist', label: 'Waist (in)', placeholder: 'e.g. 36' },
  { key: 'hip', label: 'Hip (in)', placeholder: 'e.g. 36' },
  { key: 'neckDepthFront', label: 'Neck Depth - Front (in)', placeholder: 'e.g. 6' },
  { key: 'neckDepthBack', label: 'Neck Depth - Back (in)', placeholder: 'e.g. 4' },
  { key: 'lengthTop', label: 'Length of Top (in)', placeholder: 'e.g. 36' },
  { key: 'lengthBottom', label: 'Length of Bottom (in)', placeholder: 'e.g. 36' },
  { key: 'height', label: 'Your Height (ft & in)', placeholder: "e.g. 5'4\"" },
];

const initialState = {
  name: '',
  email: '',
  chest: '',
  waist: '',
  hip: '',
  neckDepthFront: '',
  neckDepthBack: '',
  lengthTop: '',
  lengthBottom: '',
  height: '',
  notes: '',
};

export default function MeasurementForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle');

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildMessage() {
    return [
      `Chest: ${form.chest || '—'}"`,
      `Waist: ${form.waist || '—'}"`,
      `Hip: ${form.hip || '—'}"`,
      `Neck Depth - Front: ${form.neckDepthFront || '—'}"`,
      `Neck Depth - Back: ${form.neckDepthBack || '—'}"`,
      `Length of Top: ${form.lengthTop || '—'}"`,
      `Length of Bottom: ${form.lengthBottom || '—'}"`,
      `Height: ${form.height || '—'}`,
      '',
      form.notes ? `Notes: ${form.notes}` : 'Notes: —',
    ].join('\n');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    const message = buildMessage();

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

  function handleWhatsApp() {
    const intro = `Hi! I'd like to place a custom order. Here are my measurements:\n`;
    const who = `Name: ${form.name || '—'}\nEmail: ${form.email || '—'}\n\n`;
    const text = intro + who + buildMessage();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noreferrer');
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
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Name</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Email</label>
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
            <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">{f.label}</label>
            <input
              type="text"
              inputMode={f.key === 'height' ? 'text' : 'decimal'}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">
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

      <p className="text-xs text-forest/60 mt-6">
        Send your measurements however's easiest — by email or straight to us on WhatsApp.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex-1 sm:flex-none bg-gold text-forest-dark px-10 py-3 uppercase text-sm tracking-widest hover:opacity-90 disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Email My Measurements'}
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="flex-1 sm:flex-none border border-forest text-forest-dark px-10 py-3 uppercase text-sm tracking-widest hover:bg-forest hover:text-cream transition-colors"
        >
          Send via WhatsApp
        </button>
      </div>
    </form>
  );
}
