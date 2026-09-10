import { NextResponse } from 'next/server';

// Generates an on-brand product title from a photo using Google's Gemini
// vision model (free tier — no billing needed, see README.md "AI-generated
// product titles"). Called from the "Generate Title with AI" button in the
// admin dashboard (app/admin/products/page.js). Protected by the same
// /api/admin session check as every other admin route (see proxy.js) — no
// extra auth needed here.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// A few real titles already on the site, so the model matches the house
// style instead of inventing its own.
const STYLE_EXAMPLES = [
  'Multi-Coloured Embellished Lehenga',
  'Purplish Pink Embellished Gharara',
  'Metallic Bronze Gharara',
  'Golden Beige Embellished Sharara',
  'Sea Green Anarkali',
  'Metallic Gold Silk Suit',
  'Dark Maroon Embellished Suit',
];

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { imageUrl, category } = body;
  if (!imageUrl) {
    return NextResponse.json({ error: 'An image is required to generate a title.' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'GEMINI_API_KEY is not set yet — add it to your environment variables in Vercel, then redeploy. See README.md "AI-generated product titles" for how to get one for free.',
      },
      { status: 500 }
    );
  }

  // Gemini only accepts image bytes (or a Google Files URI), not an arbitrary
  // external URL — so fetch the product photo server-side first.
  let imageBase64;
  let mimeType;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Photo fetch failed with status ${imgRes.status}`);
    mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    imageBase64 = buffer.toString('base64');
  } catch (err) {
    console.error('Could not load product photo for title generation:', err);
    return NextResponse.json({ error: 'Could not load the product photo to analyze.' }, { status: 502 });
  }

  const categoryLine = category ? `\nIt's listed under the "${category}" category.` : '';

  const prompt = `You are naming a product photo for Royale Designs by Preet, an Indian/Pakistani bridal and ethnic wear boutique. Write ONE short product title for the piece shown, in this exact house style: [Colour] [Embellishment or fabric/technique] [Garment type]. Real examples already on the site: ${STYLE_EXAMPLES.map((t) => `"${t}"`).join(', ')}.${categoryLine}

Rules:
- 3 to 6 words.
- Title Case, no quotation marks, no trailing punctuation.
- Lead with the dominant colour, then the standout detail (embellishment, embroidery, fabric, mirror work, etc.), then the garment type (Lehenga, Gharara, Sharara, Anarkali, Suit, Dupatta, Jewellery Set, etc. — pick what actually matches the photo).
- Do not use filler words like "beautiful", "stunning", or "gorgeous".
- Reply with ONLY the title — nothing else, no explanation.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
          },
        ],
        generationConfig: { maxOutputTokens: 40, temperature: 0.6 },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini title generation failed:', response.status, errBody);
      const friendly =
        response.status === 400 || response.status === 403
          ? 'GEMINI_API_KEY was rejected — double check the key in Vercel.'
          : response.status === 429
            ? 'Hit the free-tier rate limit — wait a minute and try again.'
            : 'Could not reach the AI title generator right now.';
      return NextResponse.json({ error: friendly }, { status: 502 });
    }

    const data = await response.json();
    const rawTitle =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';
    const title = rawTitle.replace(/^["'“”]+|["'“”]+$/g, '').replace(/\.$/, '').trim();

    if (!title) {
      return NextResponse.json({ error: 'The AI did not return a title — try again.' }, { status: 502 });
    }

    return NextResponse.json({ title });
  } catch (err) {
    console.error('Title generation error:', err);
    return NextResponse.json({ error: 'Could not generate a title right now.' }, { status: 500 });
  }
}
