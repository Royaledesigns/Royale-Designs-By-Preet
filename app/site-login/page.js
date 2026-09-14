'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import siteConfig from '@/components/SiteConfig';

function SiteLoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/site-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect password.');
      // A full navigation (not client-side routing) so the middleware
      // re-checks the request with the cookie that was just set.
      const next = searchParams.get('next') || '/';
      window.location.href = next;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="max-w-sm w-full text-center">
        <h1 className="font-serif text-3xl text-forest-dark mb-1">{siteConfig.name}</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dark mb-8">{siteConfig.motto}</p>
        <p className="text-sm text-forest/80 mb-6 leading-relaxed">
          We&apos;re putting the finishing touches on things — enter the password to take a look.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-forest/20 rounded-sm px-4 py-3 text-sm text-center bg-white focus:outline-none focus:ring-1 focus:ring-gold"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest text-cream px-6 py-3 uppercase text-sm tracking-widest hover:bg-forest-dark disabled:opacity-60"
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SiteLoginPage() {
  return (
    <Suspense fallback={null}>
      <SiteLoginForm />
    </Suspense>
  );
}
