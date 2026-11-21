'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { categories } from '@/data/products';
import siteConfig from './SiteConfig';
import CurrencySwitcher from './CurrencySwitcher';

// On narrow screens there's no room for "INSTAGRAM TIKTOK FACEBOOK
// WHATSAPP" — it used to fall back to 2-letter codes ("IN TI FA WH"),
// which nobody could actually read as platform names. These give the
// same bar instantly recognisable icons on mobile instead.
const socialIcons = {
  instagram: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 2h-3.2v13.4a3.4 3.4 0 1 1-2.8-3.35v-3.26a6.6 6.6 0 1 0 6 6.57V9.3a8.1 8.1 0 0 0 4.6 1.43V7.5a4.8 4.8 0 0 1-4.6-4.6Z" />
    </svg>
  ),
  facebook: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 22v-8.4h2.8l.4-3.3h-3.2V8.1c0-.95.26-1.6 1.63-1.6h1.74V3.56A23.4 23.4 0 0 0 14.3 3.4c-2.52 0-4.25 1.54-4.25 4.37v2.56H7.25v3.3h2.8V22Z" />
    </svg>
  ),
  whatsapp: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.58 15.1L2 22l4.98-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.95 12.5l-.2.32.58 2.57-2.65-.7-.32.19A8.2 8.2 0 1 1 12 3.8Zm-3.28 4.1c-.17 0-.45.06-.69.32-.24.26-.9.87-.9 2.13s.93 2.47 1.06 2.65c.13.17 1.8 2.86 4.44 3.9 2.2.86 2.64.7 3.12.65.48-.04 1.53-.62 1.75-1.22.22-.6.22-1.1.15-1.22-.07-.11-.24-.17-.5-.3-.26-.13-1.53-.75-1.77-.84-.24-.09-.41-.13-.58.13-.17.26-.67.84-.82 1.01-.15.17-.3.19-.56.07-.26-.13-1.08-.4-2.06-1.27-.76-.68-1.27-1.51-1.42-1.77-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.07-.13-.58-1.44-.81-1.97-.2-.48-.41-.47-.58-.48Z" />
    </svg>
  ),
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/custom-tailoring', label: 'Custom Made For You' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const { count } = useCart();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-forest/10">
      <div className="bg-forest-dark text-cream/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-end gap-3.5 sm:gap-5 text-[11px] uppercase tracking-[0.15em] overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Object.entries(siteConfig.social).map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={platform}
              className="flex-shrink-0 hover:text-gold transition-colors flex items-center"
            >
              <span className="hidden sm:inline">{platform}</span>
              <span className="sm:hidden">{socialIcons[platform]}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex py-3 items-center justify-between gap-4">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo.png"
              alt={`${siteConfig.name} — ${siteConfig.motto}`}
              width={800}
              height={800}
              priority
              className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 object-contain"
            />
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
                    className={`hover:text-gold transition-colors ${pathname.startsWith('/shop') ? 'text-gold-dark' : ''}`}
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
                  className={`hover:text-gold transition-colors ${pathname === link.href ? 'text-gold-dark' : ''}`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-4">
            <CurrencySwitcher />
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
                <span className="absolute -top-1 -right-1 bg-gold text-forest-dark text-[10px] leading-none rounded-full w-5 h-5 flex items-center justify-center">
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
            {navLinks.map((link) =>
              link.label === 'Shop' ? (
                <div key={link.href}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="py-2 text-forest-dark uppercase text-sm tracking-wider"
                    >
                      {link.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMobileShopOpen((v) => !v)}
                      aria-label={mobileShopOpen ? 'Hide categories' : 'Show categories'}
                      aria-expanded={mobileShopOpen}
                      className="p-2 -mr-2 text-forest-dark"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`transition-transform ${mobileShopOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {mobileShopOpen && (
                    <div className="pl-2 pb-1 flex flex-col gap-1">
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
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 text-forest-dark uppercase text-sm tracking-wider"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
