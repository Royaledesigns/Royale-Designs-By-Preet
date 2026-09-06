'use client';

import Link from 'next/link';
import { useState } from 'react';
import { categories } from '@/data/products';
import siteConfig from './SiteConfig';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubscribe(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'newsletter',
          email,
          message: 'New newsletter signup',
        }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <footer className="bg-forest text-cream mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <h3 className="font-serif text-2xl mb-1">{siteConfig.name}</h3>
          <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-blush mb-4">{siteConfig.motto}</p>
          <p className="text-cream/70 text-sm leading-relaxed">
            {siteConfig.tagline}, thoughtfully customised for you with our home based in{' '}
            {siteConfig.location}, delivering to {siteConfig.shipsTo.join(', ')}.
          </p>
        </div>

        <div>
          <h4 className="uppercase text-xs tracking-widest text-blush mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-cream/80">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="hover:text-gold">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="uppercase text-xs tracking-widest text-blush mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link href="/shipping-returns" className="hover:text-gold">Shipping & Returns</Link></li>
            <li><Link href="/faq" className="hover:text-gold">FAQ</Link></li>
            <li><Link href="/custom-tailoring" className="hover:text-gold">Custom Made For You</Link></li>
            <li><Link href="/contact" className="hover:text-gold">Contact Us</Link></li>
            <li><a href={`mailto:${siteConfig.email}`} className="hover:text-gold">{siteConfig.email}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="uppercase text-xs tracking-widest text-blush mb-4">Stay in touch</h4>
          <p className="text-sm text-cream/70 mb-3">
            New arrivals and restocks, straight to your inbox.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-sm px-3 py-2 text-sm text-forest-dark placeholder:text-forest-dark/50 bg-cream focus:outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-sm bg-gold px-4 py-2 text-sm font-medium text-forest-dark hover:opacity-90 disabled:opacity-60"
            >
              {status === 'sending' ? '...' : 'Join'}
            </button>
          </form>
          {status === 'success' && <p className="text-xs text-blush mt-2">Thanks — you&apos;re on the list!</p>}
          {status === 'error' && <p className="text-xs text-red-300 mt-2">Something went wrong, please try again.</p>}

          <div className="flex gap-4 mt-6">
            {Object.entries(siteConfig.social).map(([name, url]) => (
              <a key={name} href={url} target="_blank" rel="noreferrer" className="text-cream/70 hover:text-gold text-xs uppercase tracking-wide">
                {name}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/70">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  );
}
