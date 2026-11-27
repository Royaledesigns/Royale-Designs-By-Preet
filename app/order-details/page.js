import siteConfig from '@/components/SiteConfig';
import OrderDetailsForm from '@/components/OrderDetailsForm';

// This page isn't meant to be browsed to — it's a link you send directly to
// a customer once they've agreed to buy something over Instagram or
// WhatsApp DMs, so you can get their delivery details without retyping
// everything from the chat yourself. See app/robots.js — it's kept out of
// search results on purpose.
export const metadata = {
  title: 'Confirm Your Order',
  description: `Already agreed on your order with ${siteConfig.name} over Instagram or WhatsApp? Share your delivery details here and we'll get it shipped.`,
  alternates: { canonical: '/order-details' },
};

export default function OrderDetailsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-4xl text-forest-dark mb-6 text-center">Confirm Your Order</h1>
      <p className="text-forest/80 leading-relaxed text-center mb-12 max-w-2xl mx-auto">
        Thanks for choosing {siteConfig.shortName}! Just pop in your delivery details below and
        we&apos;ll get your order packed and shipped out to you.
      </p>
      <OrderDetailsForm />
    </div>
  );
}
