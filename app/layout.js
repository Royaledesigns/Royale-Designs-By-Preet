import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import { CurrencyProvider } from '@/lib/currency-context';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatWidget from '@/components/ChatWidget';
import siteConfig from '@/components/SiteConfig';

export const metadata = {
  title: `${siteConfig.name} | ${siteConfig.tagline}`,
  description:
    'Premium South Asian bridal & ethnic wear, thoughtfully customised for you and delivered to Australia, the USA, Canada, the United Kingdom, New Zealand and Europe.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Poppins:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans text-forest-dark antialiased">
        <CurrencyProvider>
          <CartProvider>
            <Header />
            <main className="min-h-[60vh]">{children}</main>
            <Footer />
            <ChatWidget />
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
