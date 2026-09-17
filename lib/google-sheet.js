// Sends customer details to a Google Sheet, via a small Apps Script "Web
// App" bound to that sheet (see README.md "Google Sheet customer sync"
// for the one-time setup — no Google Cloud project or service account
// needed, just a script pasted into the Sheet itself).
//
// This is best-effort and silent: if GOOGLE_SHEET_WEBHOOK_URL isn't set
// yet, or the request fails, we log it and move on — a hiccup writing to
// the sheet should never block a signup, a contact message, or an order
// from completing.
export async function appendToSheet(row) {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // Human-readable Melbourne local time (e.g. "14 Sep 2026, 11:47 am")
        // instead of a raw ISO string, so the sheet is readable at a glance.
        date: new Date().toLocaleString('en-AU', {
          timeZone: 'Australia/Melbourne',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        ...row,
      }),
      // Apps Script web apps issue a redirect on success — follow it so
      // the write actually completes.
      redirect: 'follow',
    });
    if (!res.ok) {
      console.error('Google Sheet sync failed:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('Google Sheet sync error:', err);
  }
}
