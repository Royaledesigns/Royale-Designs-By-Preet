'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', ...form }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p className="text-forest-dark bg-cream-dark/60 rounded-sm p-6 text-center">
        Thanks for reaching out — we&apos;ll get back to you as soon as we can.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-forest/80 mb-1.5">Message</label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-forest/20 rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </div>
      {status === 'error' && <p className="text-sm text-red-500">Something went wrong — please try again.</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="bg-forest text-cream px-8 py-3 uppercase text-sm tracking-widest hover:bg-forest-dark transition-colors disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
