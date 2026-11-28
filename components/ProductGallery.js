'use client';

import { useState } from 'react';
import Image from 'next/image';

// Product-page photo viewer: one large photo plus a row of thumbnails to
// switch between up to 4 shots. With a single photo it renders exactly like
// the old static image (no thumbnails). The first photo is `priority` (it's
// the page's LCP element) — the others only load as needed.
export default function ProductGallery({ images, title }) {
  const [active, setActive] = useState(0);
  const photos = images.filter(Boolean);
  if (photos.length === 0) return null;
  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div>
      <div className="relative aspect-[3/4] rounded-sm overflow-hidden bg-cream-dark">
        <Image
          key={current}
          src={current}
          alt={active === 0 ? title : `${title} — photo ${active + 1}`}
          fill
          priority={active === 0}
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${photos.length}`}
              aria-current={i === active}
              className={`relative aspect-[3/4] rounded-sm overflow-hidden bg-cream-dark border-2 transition-colors ${
                i === active ? 'border-forest' : 'border-transparent hover:border-forest/40'
              }`}
            >
              <Image src={url} alt="" fill sizes="12vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
