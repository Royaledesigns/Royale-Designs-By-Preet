# Royale Designs by Preet — Website

A full custom e-commerce site for Royale Designs by Preet, built with Next.js.
It includes a full product catalog (pulled from your existing Shopify store),
collection pages, product pages with size/quantity selection, a cart, a real
Stripe Checkout integration, and all the standard pages a store needs
(About, Contact, Custom Tailoring, Shipping & Returns, FAQ).

## What's included

- **Home, Shop, and category pages** for Lehengas, Gharara Sets, Sharara
  Sets, Anarkalis and Suits, built from your 7 current products (real
  titles, prices in AUD, descriptions and photos pulled from your Shopify
  store on 2026-09-05).
- **Product pages** with size and quantity selection, "Add to Cart" and
  "Buy Now".
- **Cart + real checkout** via Stripe Checkout — supports international
  shipping address collection (Australia, USA, Canada, UK, New Zealand,
  and several EU countries) with separate domestic/international shipping
  rates.
- **Currency switcher** — shoppers can preview an estimated price in
  USD/GBP/CAD/EUR/NZD (live rates via the free Frankfurter API), while the
  actual charge always happens in AUD.
- **About, Custom Tailoring, Contact (with a working form), Shipping &
  Returns, and FAQ** pages.
- Brand styling using your forest green / blush pink / cream palette.

## Before you go live — things to double check

This was built from what's in your Shopify store and your saved brand
details. A few things are placeholders you should review before launch:

1. **Social links** — `components/SiteConfig.js` has placeholder `#` links
   for Instagram, TikTok, Facebook and WhatsApp. Add your real profile URLs.
2. **Phone number** — not set. Add it in `components/SiteConfig.js` if you
   want it shown on the Contact page.
3. **Shipping rates & timeframes** — `app/api/checkout/route.js` uses
   placeholder flat rates ($15 AUD domestic, $45 AUD international) and the
   estimates on `/shipping-returns` are reasonable defaults, not your
   actual carrier rates. Adjust both to match what you actually charge.
4. **Returns policy wording** — `/shipping-returns`, the FAQ, and the
   product page now state your no-returns/no-exchanges/no-refunds policy,
   the colour disclaimer, and the required unboxing-video rule for damage
   claims. Re-read the exact wording once and adjust it if you'd like
   anything phrased differently — it's real policy text now, not a
   placeholder.
5. **Product images** — currently linked directly to your Shopify CDN
   (`cdn.shopify.com`), so they'll keep working as long as those products
   stay in that store. If you'd rather this site not depend on Shopify at
   all, download the images and drop them into `/public/products/`, then
   update the `image` field for each product in `data/products.js` to a
   local path like `/products/metallic-gold-silk-suit.jpg`.
6. **Adding/editing products** — everything lives in `data/products.js`.
   Copy an existing entry, update the fields, and it will automatically
   appear on the homepage, its category page, and `/shop`.

## Getting it running locally

```bash
npm install
cp .env.example .env.local   # then fill in your real values
npm run dev
```

Visit http://localhost:3000.

## Setting up real payments (Stripe)

The checkout button won't work until you add Stripe keys — it will show a
friendly "payments are not configured yet" message instead of failing
silently.

1. Create a free Stripe account at https://dashboard.stripe.com/register
   (or log in if you already have one).
2. Go to **Developers → API keys** and copy your **Secret key** and
   **Publishable key**.
3. Add them to `.env.local` (or your hosting provider's environment
   variables):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Test with Stripe's test card `4242 4242 4242 4242`, any future expiry,
   any CVC.
5. When you're ready to accept real payments, switch to your **live** keys
   (`sk_live_...` / `pk_live_...`) — Stripe will walk you through
   activating your account (business details, bank account for payouts).

Orders are priced server-side from `data/products.js`, so the amount
charged always matches your catalog even if someone tampers with the page.

## Setting up the contact form / newsletter emails (optional)

Without any extra setup, contact form and newsletter submissions are just
logged on the server so nothing is lost. To actually receive them by
email:

1. Create a free account at https://resend.com.
2. Get an API key and add it to your environment:
   ```
   RESEND_API_KEY=re_...
   CONTACT_TO_EMAIL=prabhpreet.maan@yahoo.com
   ```
3. Submissions will then be emailed to `CONTACT_TO_EMAIL`.

## Setting up the Instagram feed

The homepage has a "Shop the Feed" section that automatically shows your most
recent Instagram posts (tap a photo to open the real post). It stays hidden
until you set it up — nothing breaks if you skip this.

1. **Switch your Instagram account to Business or Creator** (Instagram app →
   Settings → Account type). This is free and doesn't change how your
   account looks to followers.
2. Go to [developers.facebook.com](https://developers.facebook.com), create
   a free account/app, and under your app's setup choose **"Business Login
   for Instagram"** (this is the option for an Instagram-only presence — you
   don't need a Facebook Page for this).
3. Follow Meta's flow to authorize your own Instagram account. Because
   you're only displaying your own posts (not anyone else's), Meta does not
   require App Review for this — you get **Standard Access** immediately.
4. This gives you a **long-lived access token** (valid 60 days). Add it to
   your environment:
   ```
   INSTAGRAM_ACCESS_TOKEN=IGQ...
   ```
5. Redeploy / restart the app — the "Shop the Feed" section will appear on
   the homepage automatically once posts load.

**Every ~50–60 days**, refresh the token before it expires (Meta invalidates
it after 60 days). Run this once and update `INSTAGRAM_ACCESS_TOKEN` with
the new value it returns:

```bash
curl -i -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=YOUR_CURRENT_TOKEN"
```

A calendar reminder every 7–8 weeks is the simplest way to not forget this.

Note this feed only shows your recent **photos and captions with a link
back to Instagram** — it can't pull prices, sizes or inventory, since
Instagram doesn't have that data. To actually sell a piece you've posted, use
the admin dashboard below to turn it into a real product.

## Adding products from your phone (/admin)

`/admin/products` is a password-protected dashboard — open it from your
phone's browser and it works the same as on a computer. It lets you check
Instagram for new posts, turn them into products with a couple of taps
(price, category, whether custom stitching is offered), and publish —
no code changes or redeploy needed. Set it up once:

1. **Redis (stores your products):** In Vercel → your project → **Storage**
   → **Marketplace Database** → search **Redis** → install (the free tier
   is plenty) → connect it to this project. Vercel adds the required
   environment variables automatically.
2. **Blob storage (keeps Instagram photos from expiring — optional but
   recommended):** In Vercel → **Storage** → **Create Database** → **Blob**
   → connect it to this project. Without this, a product photo pulled from
   Instagram may stop loading after a while, since Instagram's own image
   links are temporary.
3. **Set a dashboard password:** add `ADMIN_PASSWORD=` (anything only you
   know) to your environment variables in Vercel.
4. **Redeploy.** Then visit `yourdomain.com/admin/login` and sign in.

From there:
- **Check Instagram for new posts** — pulls in anything you've posted that
  isn't already a product, as a draft (photo + caption prefilled).
- Open a draft, add a **price** and pick a **category**, tell it whether
  **custom stitching** is available for that piece, then hit **Publish** —
  it's live on the site immediately, no redeploy.
- Anything already live can be edited or unpublished the same way from the
  "Live on the site" section further down the page.

Products added this way live in Redis rather than in `data/products.js` —
that file still works as the starting catalog and as a fallback if Redis
isn't connected yet, but once Redis is set up, the dashboard is the way to
add, edit, or remove products going forward.

## Deploying

The easiest way to put this live is **Vercel** (made by the creators of
Next.js, free tier is enough to start):

1. Push this folder to a GitHub repository.
2. Go to https://vercel.com, sign up/log in, and click "New Project" →
   import your repository.
3. In the project's Environment Variables settings, add the same values
   from `.env.example` (your real Stripe keys, site URL, etc.) —
   `NEXT_PUBLIC_SITE_URL` should be your final domain, e.g.
   `https://royaledesignsbypreet.com`.
4. Click Deploy. Vercel gives you a free `.vercel.app` URL immediately, and
   you can attach your own custom domain afterwards under Project →
   Settings → Domains.

Any other Node.js hosting that supports Next.js (Netlify, Railway,
Render, your own server) will also work — the steps are the same: install
dependencies, set the environment variables, run `npm run build` then
`npm run start`.

## Project structure

```
app/                  Pages (App Router)
  page.js             Home
  shop/                Shop All + category pages
  product/[handle]/    Product detail pages
  cart/                Cart page
  checkout/            Stripe success/cancel pages
  about/, contact/, custom-tailoring/, shipping-returns/, faq/
  api/checkout/        Creates the Stripe Checkout session
  api/contact/         Handles the contact form + newsletter signup
components/           Header, Footer, product card, cart form, etc.
data/products.js      Your product catalog — edit this to add/change products
lib/                  Cart state, currency conversion (React context)
```
