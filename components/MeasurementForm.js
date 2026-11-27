'use client';

import { useState } from 'react';
import { logContactEvent } from '@/lib/track-event';
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

const CONTACT_CHANNELS = ['WhatsApp Order', 'Instagram', 'Walk-in', 'Other'];

const initialState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  channel: '',
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
  // Reference photo (e.g. a screenshot of an outfit to recreate) is
  // uploaded as soon as it's picked — by the time someone hits either
  // submit button, photoUrl is already sitting there ready to include.
  const [photoName, setPhotoName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoStatus, setPhotoStatus] = useState('idle'); // idle | uploading | done | error
  const [photoError, setPhotoError] = useState('');

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setPhotoName(file.name);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl('');
    setPhotoError('');
    setPhotoStatus('uploading');

    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/custom-order-photo', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setPhotoUrl(data.url);
      setPhotoStatus('done');
    } catch (err) {
      setPhotoStatus('error');
      setPhotoError(err.message || "Couldn't upload that photo — please try again.");
    }
  }

  function removePhoto() {
    setPhotoName('');
    setPhotoPreview('');
    setPhotoUrl('');
    setPhotoStatus('idle');
    setPhotoError('');
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
      photoUrl ? `Reference Photo: ${photoUrl}` : null,
    ]
      .filter((line) => line !== null)
      .join('\n');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    const message = buildMessage();

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'measurements',
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          // Which Type this lands in the Orders sheet as — WhatsApp Order /
          // Instagram / Walk-in / Other — falls back to a generic label
          // below if left blank so nothing is ever lost over a skipped field.
          channel: form.channel,
          message,
        }),
      });
      if (!res.ok) throw new Error();
      // No client-side logging call needed here — the /api/contact route
      // itself now writes a "Measurements Form" row to your Google Sheet
      // for every submission (see app/api/contact/route.js).
      setStatus('success');
      setForm(initialState);
      removePhoto();
    } catch {
      setStatus('error');
    }
  }

  function handleWhatsApp() {
    const intro = `Hi! I'd like to place a custom order. Here are my measurements:\n`;
    const who = `Name: ${form.name || '—'}\nEmail: ${form.email || '—'}\nPhone: ${form.phone || '—'}\nDelivery Address: ${form.address || '—'}\n\n`;
    const text = intro + who + buildMessage();
    logContactEvent('WhatsApp Click', { location: 'custom_tailoring', context: 'measurements' });
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
        <div>
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Phone / WhatsApp Number</label>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">How did you reach us?</label>
          <select
            value={form.channel}
            onChange={(e) => update('channel', e.target.value)}
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="">Select one</option>
            {CONTACT_CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">
            Delivery Address (for shipping your order)
          </label>
          <textarea
            required
            rows={2}
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Street address, city, state/region, postcode, country"
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
          Notes (colour, fabric, occasion, anything else)
        </label>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      <div className="mt-4">
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">
          Reference photo (optional) — a screenshot of an outfit you&apos;d like recreated
        </label>
        {!photoName ? (
          <label className="flex items-center justify-center border border-dashed border-forest/30 rounded-sm px-3 py-4 bg-white cursor-pointer hover:border-gold text-sm text-forest/70">
            <span>Tap to choose a photo</span>
            <input type="file" accept="image/*,.heic,.heif" onChange={handlePhotoChange} className="hidden" />
          </label>
        ) : (
          <div className="flex items-center gap-3 border border-forest/20 rounded-sm px-3 py-2 bg-white">
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Selected reference" className="w-12 h-12 object-cover rounded-sm flex-none" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-forest-dark truncate">{photoName}</p>
              <p className="text-xs text-forest/60">
                {photoStatus === 'uploading' && 'Uploading…'}
                {photoStatus === 'done' && 'Attached'}
                {photoStatus === 'error' && (photoError || 'Upload failed')}
              </p>
            </div>
            <button
              type="button"
              onClick={removePhoto}
              className="text-xs uppercase tracking-wide text-forest/60 hover:text-red-500 flex-none"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {status === 'error' && <p className="text-sm text-red-500 mt-3">Something went wrong — please try again.</p>}

      <p className="text-xs text-forest/60 mt-6">
        Send your measurements however's easiest — by email or straight to us on WhatsApp.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <button
          type="submit"
          disabled={status === 'sending' || photoStatus === 'uploading'}
          className="flex-1 sm:flex-none bg-gold text-forest-dark px-10 py-3 uppercase text-sm tracking-widest hover:opacity-90 disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Email My Measurements'}
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          disabled={photoStatus === 'uploading'}
          className="flex-1 sm:flex-none border border-forest text-forest-dark px-10 py-3 uppercase text-sm tracking-widest hover:bg-forest hover:text-cream transition-colors disabled:opacity-60"
        >
          Send via WhatsApp
        </button>
      </div>
    </form>
  );
}
