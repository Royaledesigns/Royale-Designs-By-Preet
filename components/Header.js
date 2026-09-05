'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { categories } from '@/data/products';
import siteConfig from './SiteConfig';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/custom-tailoring', label: 'Custom Tailoring' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const { count } = useCart();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-forest/10">
      <div className="bg-forest-dark text-cream/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-end gap-5 text-[11px] uppercase tracking-[0.15em]">
          {Object.entries(siteConfig.social).map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-gold transition-colors"
            >
              {platform}
            </a>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex py-3 items-center justify-between gap-4">
          <Link href="/" className="flex flex-col leading-none">
            <span className="font-serif text-3xl sm:text-4xl lg:text-[42px] tracking-wide text-forest">
              {siteConfig.name}
            </span>
            <span className="mt-1.5 font-sans text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-gold">
              {siteConfig.motto}
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 font-sans text-sm uppercase tracking-wider text-forest-dark">
            {navLinks.map((link) =>
              link.label === 'Shop' ? (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => setShopOpen(true)}
                  onMouseLeave={() => setShopOpen(false)}
                >
                  <Link
                    href={link.href}
                    className={`hover:text-gold transition-colors ${pathname.startsWith('/shop') ? 'text-gold' : ''}`}
                  >
                    Shop
                  </Link>
                  {shopOpen && (
                    <div className="absolute left-0 top-full w-56 bg-white shadow-lg rounded-b-md border border-forest/10 py-2 normal-case tracking-normal">
                      {categories.map((c) => (
                        <Link
                          key={c.slug}
                          href={`/shop/${c.slug}`}
                          className="block px-4 py-2 text-sm text-forest-dark hover:bg-cream-dark hover:text-gold"
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`hover:text-gold transition-colors ${pathname === link.href ? 'text-gold' : ''}`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/cart"
              className="relative inline-flex items-center justify-center rounded-full border border-forest/20 w-10 h-10 hover:bg-forest hover:text-cream transition-colors"
              aria-label="View cart"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold text-cream text-[10px] leading-none rounded-full w-5 h-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            <button
              className="lg:hidden inline-flex items-center justify-center w-10 h-10"
              aria-label="Toggle menu"
              onClick={() => setOpen((o) => !o)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-forest/10 bg-cream px-4 pb-4">
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-forest-dark uppercase text-sm tracking-wider"
              >
                {link.label}
              </Link>
            ))}
            <div className="pl-2 pt-1 flex flex-col gap-1">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="py-1 text-sm text-forest/80"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
