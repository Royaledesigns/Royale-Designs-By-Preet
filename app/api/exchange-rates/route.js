import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/exchange-rates-server';

// Feeds the currency switcher (see lib/currency.js) an AUD -> USD/GBP/CAD/
// EUR/NZD rate table. Runs server-side so the browser never talks to a
// third-party API directly.
export async function GET() {
  const data = await getExchangeRates();
  return NextResponse.json(data);
}
