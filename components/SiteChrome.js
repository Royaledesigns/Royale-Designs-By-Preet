'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import ChatWidget from './ChatWidget';

// The admin dashboard (/admin/*) is a work tool Preet uses on her phone to
// manage products, not a page a customer ever sees — so it doesn't need the
// public storefront's nav, social bar, currency switcher, cart icon, footer,
// or chat widget. Those were previously rendered on every page including
// /admin ones (via app/layout.js), which ate a big chunk of mobile screen
// height before any actual admin content appeared and made an already-busy
// page feel busier. This component is the one place that decides whether a
// given route gets the full storefront shell or a bare one, so admin pages
// get their own lean layout and the public site is completely unaffected.
export default function SiteChrome({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <main className="min-h-screen bg-cream">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <ChatWidget />
    </>
  );
}
