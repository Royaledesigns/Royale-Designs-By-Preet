import siteConfig from '@/components/SiteConfig';

// Powers the "Chat with us" widget (components/ChatWidget.js) that appears
// on every page. Uses the same free Gemini key already set up for the
// admin "Generate Title with AI" feature (see .env.example / README.md),
// via the Interactions API. The model only answers from BUSINESS_FACTS
// below — update this block whenever shipping, pricing or policy details
// change, and the chatbot's answers stay accurate automatically.
//
// Streamed (stream: true) rather than a single request/response — Gemini
// can take several seconds to finish a full reply, so streaming the reply
// word-by-word to the browser makes it feel instant instead of leaving
// the shopper staring at "Typing…" the whole time.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const BUSINESS_FACTS = `
Business: ${siteConfig.name} ("${siteConfig.motto}") — a premium South Asian bridal & ethnic wear boutique based in ${siteConfig.location}.

What we sell: Bridal Wear, Lehengas, Gharara Sets, Sharara Sets, Anarkalis, Partywear Suits, Casual Wear Suits, Dupattas, Heels & Punjabi Jutti, Kids Wear, and Jewellery.

Shipping — we currently deliver to: ${siteConfig.shipsTo.join(', ')}. Shipping is a flat rate chosen at checkout based on destination:
- Australia: $20 AUD, estimated 5–7 business days from dispatch.
- New Zealand: $30 AUD, estimated 5–8 business days from dispatch.
- USA, Canada, United Kingdom or Europe: $60 AUD, estimated 6–9 business days from dispatch.
Every piece is made to order, so please allow processing time before dispatch (on top of the shipping estimate above). International orders may be subject to customs duties or import taxes charged by the destination country, which are the customer's responsibility and not included at checkout.

Currency: all orders are charged in Australian Dollars (AUD). The site can show an estimated price in USD, GBP, CAD, EUR or NZD via the currency switcher, but the amount actually charged is always in AUD.

Custom Made For You: any design in the collection can be custom stitched to a customer's exact measurements, or with their own colour/fabric preferences. Choose "Custom" as the size on a product page, or visit the Custom Made For You page to start. Jewellery and Dupattas don't use a size picker — customers choose a quantity instead. Kids Wear and Heels & Punjabi Jutti have their own size charts (kids' age sizes and shoe sizes respectively).

Pricing & discounts: we do not run discounts, sales or coupon codes — pricing reflects the quality of materials and the handcrafted detailing in every piece.

Returns policy: all sales are final — we do not offer returns, exchanges or refunds. Customers should check measurements and colours carefully before ordering, or ask us first if unsure. If a parcel arrives damaged, we need a full, uninterrupted video of it being opened from a sealed state, plus photos, to process a claim.

Colour disclaimer: colours can look slightly different in person than in product photos/videos because of lighting — this is normal for handcrafted fabrics and isn't considered a fault.

Seeing the full look: most product pages link out to Instagram to see the piece worn/styled in full.

Contact us: email ${siteConfig.email}, WhatsApp ${siteConfig.social.whatsapp}, Instagram ${siteConfig.social.instagram}, TikTok ${siteConfig.social.tiktok}, Facebook ${siteConfig.social.facebook}.
`.trim();

const SYSTEM_PROMPT = `You are the friendly customer-support assistant in the live chat widget on the ${siteConfig.name} website, talking directly with a shopper.

Only answer using the FACTS below — never invent shipping costs, delivery times, prices, stock levels or policies that aren't listed there. If someone asks about something outside these facts (a specific product's price or availability, an existing order's status, exact sizing for one item), say you don't have that detail handy and point them to browsing the shop, the Custom Made For You page, or messaging on WhatsApp/email.

Keep replies short and warm — 1 to 2 sentences, plain conversational text, no markdown formatting and no bullet lists. Never say you are an AI, a model, or mention Gemini or any technology — if asked who you are, just say you're here to help with questions about Royale Designs by Preet.

FACTS:
${BUSINESS_FACTS}`;

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid request.', 400);
  }

  const { message, history } = body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return jsonError('A message is required.', 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError("Chat isn't set up yet — please reach out on WhatsApp or email instead.", 500);
  }

  // Keep only the last few turns so the prompt stays small (faster to
  // process) — plenty for a support chat that rarely needs deep history.
  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const historyText = recentHistory
    .map((m) => `${m.role === 'user' ? 'Customer' : 'You'}: ${String(m.text || '').trim()}`)
    .filter(Boolean)
    .join('\n');
  const conversation = `${historyText ? historyText + '\n' : ''}Customer: ${message.trim()}\nYou:`;

  let upstream;
  try {
    upstream = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ type: 'text', text: `${SYSTEM_PROMPT}\n\nConversation so far:\n${conversation}` }],
        stream: true,
      }),
    });
  } catch (err) {
    console.error('Chat error:', err);
    return jsonError('Could not reach the chat assistant right now.', 500);
  }

  if (!upstream.ok || !upstream.body) {
    const errBody = await upstream.text().catch(() => '');
    console.error('Gemini chat failed:', upstream.status, errBody);
    const friendly =
      upstream.status === 429
        ? "We're getting a lot of questions right now — try again in a minute, or message us on WhatsApp."
        : 'Could not reach the chat assistant right now — please try again, or message us on WhatsApp.';
    return jsonError(friendly, 502);
  }

  // Relay Gemini's server-sent events to the browser as plain text chunks
  // (just the words themselves) — the widget appends each chunk as it
  // arrives, so the reply visibly types itself out instead of the shopper
  // waiting on a blank "Typing…" bubble for the whole answer to finish.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      let gotAnyText = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;
            let event;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }
            if (event.event_type === 'step.delta' && event.delta?.type === 'text' && event.delta.text) {
              gotAnyText = true;
              controller.enqueue(encoder.encode(event.delta.text));
            } else if (event.event_type === 'error') {
              console.error('Gemini stream reported an error event:', event);
            }
          }
        }
        if (!gotAnyText) {
          controller.enqueue(
            encoder.encode("Sorry, I couldn't put together a reply — please try again, or message us on WhatsApp.")
          );
        }
      } catch (err) {
        console.error('Chat stream error:', err);
        if (!gotAnyText) {
          controller.enqueue(encoder.encode('Something went wrong — please try again.'));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
