'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Downloads the current list as a CSV — the simplest way to get these
// emails into Mailchimp, Klaviyo, or wherever you send campaigns from,
// without needing a direct integration.
function downloadCsv(subscribers) {
  const rows = [['Email', 'Name', 'Joined'], ...subscribers.map((s) => [s.email, s.name || '', formatDate(s.createdAt)])];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `royale-designs-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/subscribers')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSubscribers(data.subscribers || []);
      })
      .catch((err) => setError(err.message || 'Could not load subscribers.'));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-3xl text-forest-dark">Subscribers</h1>
        <Link href="/admin/products" className="text-xs uppercase tracking-widest text-forest/80 hover:text-gold">
          ← Products
        </Link>
      </div>
      <p className="text-sm text-forest/80 mb-6">
        Everyone who signed up for updates via the newsletter form — people who haven&apos;t necessarily
        ordered yet. (Customers who&apos;ve placed an order are recorded automatically in your{' '}
        <a href="https://dashboard.stripe.com/customers" target="_blank" rel="noreferrer" className="underline hover:text-gold">
          Stripe Dashboard
        </a>
        .)
      </p>

      {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

      {!error && !subscribers && <p className="text-sm text-forest/80">Loading…</p>}

      {subscribers && subscribers.length === 0 && (
        <p className="text-sm text-forest/80">No newsletter signups yet — they&apos;ll show up here as soon as someone joins from the footer form.</p>
      )}

      {subscribers && subscribers.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-forest-dark font-medium">
              {subscribers.length} subscriber{subscribers.length === 1 ? '' : 's'}
            </p>
            <button
              onClick={() => downloadCsv(subscribers)}
              className="text-xs uppercase tracking-widest bg-gold text-forest-dark px-4 py-2 hover:opacity-90"
            >
              Download CSV
            </button>
          </div>

          <div className="overflow-x-auto border border-forest/10 rounded-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blush-light text-forest-dark">
                  <th className="text-left px-4 py-3 font-serif text-base border-b border-forest/10">Email</th>
                  <th className="text-left px-4 py-3 font-serif text-base border-b border-forest/10">Name</th>
                  <th className="text-left px-4 py-3 font-serif text-base border-b border-forest/10">Joined</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 1 ? 'bg-cream-dark/30' : ''}>
                    <td className="px-4 py-3 text-forest-dark whitespace-nowrap">{s.email}</td>
                    <td className="px-4 py-3 text-forest-dark/80 whitespace-nowrap">{s.name || '—'}</td>
                    <td className="px-4 py-3 text-forest-dark/80 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
