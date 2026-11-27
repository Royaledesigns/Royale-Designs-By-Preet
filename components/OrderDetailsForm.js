'use client';

import { useState } from 'react';
import { logContactEvent } from '@/lib/track-event';
import siteConfig from './SiteConfig';
import { CONTACT_CHANNELS } from '@/lib/order-channels';

// wa.me wants a bare international number — strip the "+" and any spaces
// from the display-formatted phone in SiteConfig.
const WHATSAPP_NUMBER = siteConfig.phone.replace(/[^\d]/g, '');

const initialState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  item: '',
  notes: '',
  channel: '',
};

// For customers who've already agreed on an order with you over Instagram
// or WhatsApp DMs and just need to hand over delivery details — a lighter
// version of MeasurementForm with no measurement fields, since sizing for
// a ready-made piece is usually already settled in the chat.
export default function OrderDetailsForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle');

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildSummary() {
    return [`Order: ${form.item || '—'}`, form.notes ? `Notes: ${form.notes}` : null]
      .filter((line) => line !== null)
      .join('\n');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order-details',
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          item: form.item,
          notes: form.notes,
          // Which Type this lands in the Orders sheet as — WhatsApp Order /
          // Instagram / Walk-in / Other — falls back to a generic label in
          // the API route if left blank so nothing is ever lost.
          channel: form.channel,
        }),
      });
      if (!res.ok) throw new Error();
      // No client-side logging call needed here — the /api/contact route
      // itself writes the row to your Google Sheet for every submission
      // (see app/api/contact/route.js).
      setStatus('success');
      setForm(initialState);
    } catch {
      setStatus('error');
    }
  }

  function handleWhatsApp() {
    const intro = "Hi! Just confirming my order details:\n";
    const who = `Name: ${form.name || '—'}\nPhone: ${form.phone || '—'}\nDelivery Address: ${form.address || '—'}\n\n`;
    const text = intro + who + buildSummary();
    logContactEvent('WhatsApp Click', { location: 'order_details', context: 'order_confirmation' });
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noreferrer');
  }

  if (status === 'success') {
    return (
      <p className="bg-cream-dark/60 rounded-sm p-6 text-center text-forest-dark">
        Thanks — we&apos;ve got your details and will get your order packed and shipped out.
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
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Email (optional)</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
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
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">What did you order?</label>
          <textarea
            required
            rows={2}
            value={form.item}
            onChange={(e) => update('item', e.target.value)}
            placeholder="e.g. Royal Blue Embroidered Suit, size M"
            className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">
          Anything else? (colour, size changes, special requests)
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>

      {status === 'error' && <p className="text-sm text-red-500 mt-3">Something went wrong — please try again.</p>}

      <p className="text-xs text-forest/60 mt-6">
        Send it however&apos;s easiest — by email or straight to us on WhatsApp.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="flex-1 sm:flex-none bg-gold text-forest-dark px-10 py-3 uppercase text-sm tracking-widest hover:opacity-90 disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Confirm My Order'}
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
