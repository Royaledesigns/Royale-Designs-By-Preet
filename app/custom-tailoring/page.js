import Link from 'next/link';
import siteConfig from '@/components/SiteConfig';
import MeasurementForm from '@/components/MeasurementForm';

export const metadata = { title: 'Custom Tailoring | Royale Designs by Preet' };

// Women's size chart — all measurements in inches. Update here if your
// sizing ever changes; the table below is generated from this data.
const SIZE_LABELS = ['34 (XS)', '36 (S)', '38 (M)', '40 (L)', '42 (XL)', '44 (2XL)', '46 (3XL)', '50 (4XL)', '52 (5XL)'];
const SIZE_ROWS = [
  { label: 'Chest', values: ['33-34', '35-36', '37-38', '39.5-41', '42-43', '44-45', '46-47', '48-50', '51-52'] },
  { label: 'Waist', values: ['27-28', '29-30', '31-32', '33.5-35', '36-37', '39-41', '42-43', '44-45', '46-47'] },
  { label: 'Hip', values: ['37-38.5', '39-40', '42-44', '45-46', '48-49', '49.5-50.5', '50-52', '53-54', '55-56'] },
  { label: 'Armhole', values: ['15-15.5', '16-16.5', '17-18', '18.5-19', '20-20.5', '21-21.5', '21.5-22', '22-23', '23-24'] },
  { label: 'US Size', values: ['0-2', '4-6', '8-10', '12-14', '16-17', '18-19', '20-21', '22-23', '23-24'] },
];

const HOW_TO_MEASURE = [
  { part: 'Chest', tip: 'Around the fullest part of your bust, keeping the tape level across your back.' },
  { part: 'Waist', tip: 'Around the narrowest part of your natural waistline.' },
  { part: 'Hip', tip: 'Around the fullest part of your hips, roughly 8" below your waist.' },
  { part: 'Armhole', tip: 'Around your arm at the shoulder seam, where a sleeve would attach.' },
];

export default function CustomTailoringPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-4xl text-forest-dark mb-6 text-center">Custom Tailoring</h1>
      <p className="text-forest/80 leading-relaxed text-center mb-10 max-w-2xl mx-auto">
        Want a piece made to your exact measurements or with your own colour and fabric
        preferences? Choose any design from our collection and we&apos;ll custom stitch it just
        for you.
      </p>

      <div className="bg-cream-dark/60 rounded-sm p-8 space-y-4 text-forest-dark max-w-2xl mx-auto">
        <h2 className="font-serif text-2xl mb-2">How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-forest/80">
          <li>Browse our shop and pick the outfit you&apos;d like — every design in our collection can be custom stitched for you.</li>
          <li>Send us your measurements and preferences — colour, fabric and embellishment options for that design.</li>
          <li>Your piece is custom stitched to order and shipped to you, tracked, wherever you are.</li>
        </ol>
      </div>

      <div className="mt-16">
        <h2 className="font-serif text-2xl text-forest-dark mb-2 text-center">Size Chart</h2>
        <p className="text-sm text-forest/80 text-center mb-6">
          Women&apos;s sizing, all measurements in inches. Between sizes, or not sure what to
          choose? Select &ldquo;Custom&rdquo; at checkout and we&apos;ll confirm your fit with you directly.
        </p>

        <div className="overflow-x-auto rounded-sm border border-forest/10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="bg-blush-light text-forest-dark font-serif text-base text-left px-4 py-3 border-b border-r border-forest/10 whitespace-nowrap">
                  Size
                </th>
                {SIZE_LABELS.map((label) => (
                  <th
                    key={label}
                    className="text-forest-dark font-medium text-center px-4 py-3 border-b border-forest/10 whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 1 ? 'bg-cream-dark/30' : ''}>
                  <th
                    scope="row"
                    className="bg-blush-light text-forest-dark font-serif text-base text-left px-4 py-3 border-r border-forest/10 whitespace-nowrap"
                  >
                    {row.label}
                  </th>
                  {row.values.map((v, idx) => (
                    <td key={idx} className="text-center px-4 py-3 text-forest-dark/80 whitespace-nowrap">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {HOW_TO_MEASURE.map((item) => (
            <div key={item.part} className="flex gap-3">
              <span className="font-serif text-lg text-gold-dark flex-none w-24">{item.part}</span>
              <span className="text-sm text-forest/80 leading-relaxed">{item.tip}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="font-serif text-2xl text-forest-dark mb-2 text-center">Submit Your Measurements</h2>
        <p className="text-sm text-forest/80 text-center mb-8 max-w-2xl mx-auto">
          Know your numbers already? Fill this in and send it straight to us — we&apos;ll follow
          up by email to confirm fabric, embellishment and a quote.
        </p>
        <MeasurementForm />
      </div>

      <div className="text-center mt-16">
        <p className="text-forest/80 mb-4">
          Not ready with your measurements yet? Reach out and tell us what you have in mind.
        </p>
        <Link href="/contact" className="inline-block bg-forest text-cream px-8 py-3 uppercase text-sm tracking-widest hover:bg-forest-dark">
          Enquire Now
        </Link>
        <p className="text-sm text-forest/80 mt-4">
          Or email us directly at{' '}
          <a href={`mailto:${siteConfig.email}`} className="underline hover:text-gold">
            {siteConfig.email}
          </a>
        </p>
      </div>
    </div>
  );
}
