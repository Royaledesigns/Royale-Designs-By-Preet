From f31e778e43a9399db00c70caddf0ef4545317276 Mon Sep 17 00:00:00 2001
From: Claude <noreply@anthropic.com>
Date: Sat, 21 Nov 2026 00:08:06 +0000
Subject: [PATCH 1/2] Order via WhatsApp instead of checkout; fix mobile
 nav/chat overlap

- Product page now shows price but replaces Add to Cart/Buy Now with a
  single "Order on WhatsApp" button that opens a chat pre-filled with
  the product, size, quantity and price (same for the sold-out
  "reach out" link). Cart/Stripe checkout code is left in place but no
  longer linked from the product page.
- Shop page no longer renders a 4-row category chip bar that pushed
  products far down on mobile; categories are now only reached via the
  header's Shop menu.
- Mobile nav: categories nest directly under "Shop" (tap to expand)
  instead of appearing after all nav links.
- Header social links abbreviate to 2 letters on small screens so they
  stop overflowing the screen edge.
- Chat bubble shrinks slightly on mobile so it covers less of the
  product grid.
---
 app/shop/page.js            | 21 ++--------
 components/AddToCartForm.js | 67 +++++++++++++++++--------------
 components/ChatWidget.js    |  4 +-
 components/Header.js        | 79 +++++++++++++++++++++++++++----------
 4 files changed, 100 insertions(+), 71 deletions(-)

diff --git a/app/shop/page.js b/app/shop/page.js
index 96c0e62..d552688 100644
--- a/app/shop/page.js
+++ b/app/shop/page.js
@@ -1,5 +1,3 @@
-import Link from 'next/link';
-import { categories } from '@/data/products';
 import { getAllProducts } from '@/lib/catalog';
 import ProductCard from '@/components/ProductCard';
 
@@ -16,22 +14,9 @@ export default async function ShopPage() {
   return (
     <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
       <h1 className="font-serif text-4xl text-forest-dark mb-2">Shop All</h1>
-      <p className="text-forest/80 mb-8">{products.length} pieces, handcrafted to order.</p>
-
-      <div className="flex flex-wrap gap-2 mb-10">
-        <span className="px-4 py-1.5 rounded-full text-xs uppercase tracking-wide bg-forest text-cream">
-          All
-        </span>
-        {categories.map((c) => (
-          <Link
-            key={c.slug}
-            href={`/shop/${c.slug}`}
-            className="px-4 py-1.5 rounded-full text-xs uppercase tracking-wide border border-forest/20 text-forest-dark hover:bg-forest hover:text-cream transition-colors"
-          >
-            {c.label}
-          </Link>
-        ))}
-      </div>
+      <p className="text-forest/80 mb-8">
+        {products.length} pieces, handcrafted to order. Browse by category from the Shop menu above.
+      </p>
 
       <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
         {products.map((p) => (
diff --git a/components/AddToCartForm.js b/components/AddToCartForm.js
index 67ee3e1..5f7cdc3 100644
--- a/components/AddToCartForm.js
+++ b/components/AddToCartForm.js
@@ -1,14 +1,34 @@
 'use client';
 
 import { useState } from 'react';
-import { useRouter } from 'next/navigation';
-import { useCart } from '@/lib/cart-context';
 import { getSizesForCategory, isUnsizedCategory, getSizeStock } from '@/data/products';
+import { formatMoney } from '@/lib/currency-shared';
 import siteConfig from './SiteConfig';
 
 const CUSTOM_SIZE = 'Custom (contact us for measurements)';
 const ONE_SIZE = 'One Size';
 
+// WhatsApp's wa.me deep link accepts a prefilled "text" query param when
+// addressed by phone number (unlike the wa.me/message/<code> short link
+// used elsewhere, which carries its own fixed template) — so orders built
+// here go straight to the business number with the product, size and price
+// already filled in, ready for the shopper to just hit send.
+function whatsappNumber() {
+  return siteConfig.phone.replace(/[^0-9]/g, '');
+}
+
+function buildWhatsAppLink(message) {
+  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(message)}`;
+}
+
+function buildOrderMessage(product, size, qty, isUnsized) {
+  const sizeLine = isUnsized || size === CUSTOM_SIZE ? '' : ` — Size: ${size}`;
+  const qtyLine = qty > 1 ? ` x${qty}` : '';
+  const total = formatMoney(product.price * qty, 'AUD');
+  const customNote = size === CUSTOM_SIZE ? ' (custom stitched to my measurements)' : '';
+  return `Hi! I'd like to order: ${product.title}${sizeLine}${customNote}${qtyLine} — ${total}. Is it available?`;
+}
+
 export default function AddToCartForm({ product }) {
   // Clothing sizes (XS–XL) everywhere except Heels & Punjabi Jutti (EU shoe
   // sizes) and Kids Wear (age-based sizes). Jewellery and Dupattas aren't
@@ -32,9 +52,6 @@ export default function AddToCartForm({ product }) {
 
   const [size, setSize] = useState(defaultSize);
   const [qty, setQty] = useState(1);
-  const [added, setAdded] = useState(false);
-  const { addItem } = useCart();
-  const router = useRouter();
 
   // Custom orders and jewellery/dupattas (one size) aren't stock-limited —
   // only a specific ready-made size is. Caps the quantity stepper so
@@ -47,18 +64,12 @@ export default function AddToCartForm({ product }) {
     setQty((q) => Math.min(q, Number.isFinite(nextMax) ? Math.max(nextMax, 1) : q));
   }
 
-  const handleAdd = () => {
-    addItem(product, size, qty);
-    setAdded(true);
-    setTimeout(() => setAdded(false), 2000);
-  };
-
-  const handleBuyNow = () => {
-    addItem(product, size, qty);
-    router.push('/cart');
-  };
+  const orderLink = buildWhatsAppLink(buildOrderMessage(product, size, qty, isUnsized));
 
   if (product.soldOut) {
+    const reachOutLink = buildWhatsAppLink(
+      `Hi! I'm interested in: ${product.title}. Is it still available, or could something similar be made?`
+    );
     return (
       <div className="mt-6 space-y-4">
         <p className="inline-block bg-forest-dark text-cream text-xs uppercase tracking-widest px-3 py-1.5">
@@ -71,7 +82,7 @@ export default function AddToCartForm({ product }) {
             : ' Love the look? We may be able to recreate something similar as a custom stitch.'}
         </p>
         <a
-          href={siteConfig.social.whatsapp}
+          href={reachOutLink}
           target="_blank"
           rel="noreferrer"
           className="inline-block bg-gold text-forest-dark px-6 py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
@@ -140,25 +151,21 @@ export default function AddToCartForm({ product }) {
         )}
       </div>
 
-      <div className="flex flex-col sm:flex-row gap-3 pt-2">
-        <button
-          onClick={handleAdd}
-          className="flex-1 border border-forest text-forest-dark py-3 uppercase text-sm tracking-widest hover:bg-forest hover:text-cream transition-colors"
-        >
-          {added ? 'Added ✓' : 'Add to Cart'}
-        </button>
-        <button
-          onClick={handleBuyNow}
-          className="flex-1 bg-gold text-forest-dark py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
+      <div className="pt-2">
+        <a
+          href={orderLink}
+          target="_blank"
+          rel="noreferrer"
+          className="block w-full text-center bg-gold text-forest-dark py-3 uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
         >
-          Buy Now
-        </button>
+          Order on WhatsApp
+        </a>
       </div>
 
       {customStitchAvailable && (
         <p className="text-xs text-forest/80 pt-1">
-          Need a size outside our standard range, or a colour tweak? Choose &ldquo;Custom&rdquo; and
-          tell us your measurements at checkout, or reach out on the{' '}
+          Need a size outside our standard range, or a colour tweak? Choose &ldquo;Custom&rdquo; above, then
+          tap Order on WhatsApp and share your measurements with us there — or visit the{' '}
           <a href="/custom-tailoring" className="font-semibold text-gold-dark underline hover:text-forest-dark">
             Custom Made For You
           </a>{' '}
diff --git a/components/ChatWidget.js b/components/ChatWidget.js
index ff3e017..ff0b371 100644
--- a/components/ChatWidget.js
+++ b/components/ChatWidget.js
@@ -177,7 +177,7 @@ export default function ChatWidget() {
   }
 
   return (
-    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
+    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex flex-col items-end gap-3">
       {open && (
         <div className="w-[92vw] max-w-[360px] h-[70vh] max-h-[520px] bg-cream border border-forest/15 rounded-sm shadow-xl flex flex-col overflow-hidden">
           <div className="bg-forest text-cream px-4 py-3 flex items-center justify-between flex-shrink-0">
@@ -248,7 +248,7 @@ export default function ChatWidget() {
       <button
         onClick={() => setOpen((v) => !v)}
         aria-label={open ? 'Close chat' : 'Chat with us'}
-        className="w-14 h-14 rounded-full bg-forest text-cream shadow-lg flex items-center justify-center hover:bg-forest-dark transition-colors"
+        className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-forest text-cream shadow-lg flex items-center justify-center hover:bg-forest-dark transition-colors"
       >
         {open ? (
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
diff --git a/components/Header.js b/components/Header.js
index f2fac76..ef789da 100644
--- a/components/Header.js
+++ b/components/Header.js
@@ -19,22 +19,24 @@ const navLinks = [
 export default function Header() {
   const [open, setOpen] = useState(false);
   const [shopOpen, setShopOpen] = useState(false);
+  const [mobileShopOpen, setMobileShopOpen] = useState(false);
   const { count } = useCart();
   const pathname = usePathname();
 
   return (
     <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-forest/10">
       <div className="bg-forest-dark text-cream/80">
-        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-end gap-5 text-[11px] uppercase tracking-[0.15em]">
+        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-end gap-3.5 sm:gap-5 text-[11px] uppercase tracking-[0.15em] overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
           {Object.entries(siteConfig.social).map(([platform, url]) => (
             <a
               key={platform}
               href={url}
               target="_blank"
               rel="noreferrer"
-              className="hover:text-gold transition-colors"
+              className="flex-shrink-0 hover:text-gold transition-colors"
             >
-              {platform}
+              <span className="hidden sm:inline">{platform}</span>
+              <span className="sm:hidden">{platform.slice(0, 2)}</span>
             </a>
           ))}
         </div>
@@ -126,28 +128,63 @@ export default function Header() {
       {open && (
         <div className="lg:hidden border-t border-forest/10 bg-cream px-4 pb-4">
           <div className="flex flex-col gap-1 pt-2">
-            {navLinks.map((link) => (
-              <Link
-                key={link.href}
-                href={link.href}
-                onClick={() => setOpen(false)}
-                className="py-2 text-forest-dark uppercase text-sm tracking-wider"
-              >
-                {link.label}
-              </Link>
-            ))}
-            <div className="pl-2 pt-1 flex flex-col gap-1">
-              {categories.map((c) => (
+            {navLinks.map((link) =>
+              link.label === 'Shop' ? (
+                <div key={link.href}>
+                  <div className="flex items-center justify-between">
+                    <Link
+                      href={link.href}
+                      onClick={() => setOpen(false)}
+                      className="py-2 text-forest-dark uppercase text-sm tracking-wider"
+                    >
+                      {link.label}
+                    </Link>
+                    <button
+                      type="button"
+                      onClick={() => setMobileShopOpen((v) => !v)}
+                      aria-label={mobileShopOpen ? 'Hide categories' : 'Show categories'}
+                      aria-expanded={mobileShopOpen}
+                      className="p-2 -mr-2 text-forest-dark"
+                    >
+                      <svg
+                        width="14"
+                        height="14"
+                        viewBox="0 0 24 24"
+                        fill="none"
+                        stroke="currentColor"
+                        strokeWidth="2"
+                        className={`transition-transform ${mobileShopOpen ? 'rotate-180' : ''}`}
+                      >
+                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
+                      </svg>
+                    </button>
+                  </div>
+                  {mobileShopOpen && (
+                    <div className="pl-2 pb-1 flex flex-col gap-1">
+                      {categories.map((c) => (
+                        <Link
+                          key={c.slug}
+                          href={`/shop/${c.slug}`}
+                          onClick={() => setOpen(false)}
+                          className="py-1 text-sm text-forest/80"
+                        >
+                          {c.label}
+                        </Link>
+                      ))}
+                    </div>
+                  )}
+                </div>
+              ) : (
                 <Link
-                  key={c.slug}
-                  href={`/shop/${c.slug}`}
+                  key={link.href}
+                  href={link.href}
                   onClick={() => setOpen(false)}
-                  className="py-1 text-sm text-forest/80"
+                  className="py-2 text-forest-dark uppercase text-sm tracking-wider"
                 >
-                  {c.label}
+                  {link.label}
                 </Link>
-              ))}
-            </div>
+              )
+            )}
           </div>
         </div>
       )}
-- 
2.43.0


From 23772f345546eec36bfdd183b39c7385869a5494 Mon Sep 17 00:00:00 2001
From: Claude <noreply@anthropic.com>
Date: Sat, 21 Nov 2026 00:10:56 +0000
Subject: [PATCH 2/2] Add .gitignore for node_modules and build output

Keeps the repo clean of local build artifacts (node_modules, .next)
that were showing up as untracked after installing deps to test the
WhatsApp-order change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DRHc58c1meaecXxKQtEfzC
---
 .gitignore | 5 +++++
 1 file changed, 5 insertions(+)
 create mode 100644 .gitignore

diff --git a/.gitignore b/.gitignore
new file mode 100644
index 0000000..3bd2d27
--- /dev/null
+++ b/.gitignore
@@ -0,0 +1,5 @@
+node_modules/
+.next/
+.env
+.env.local
+.vercel
-- 
2.43.0
