import Mailjet from 'node-mailjet';

type SendMagicLinkArgs = {
  to: string;
  url: string;
};

const FROM = process.env.EMAIL_FROM ?? 'Game Hub <no-reply@gamehub.local>';

let mailjetClient: Mailjet | null = null;

function getMailjet(): Mailjet | null {
  if (mailjetClient) return mailjetClient;
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_SECRET_KEY;
  if (!apiKey || !apiSecret) return null;
  mailjetClient = Mailjet.apiConnect(apiKey, apiSecret);
  return mailjetClient;
}

/** Parse a "Name <email>" / "email" RFC-style from-string into Mailjet's shape. */
function parseFrom(from: string): { Email: string; Name?: string } {
  const match = from.match(/^\s*(.*?)\s*<\s*(.+?)\s*>\s*$/);
  if (match && match[2]) {
    const name = match[1];
    return name ? { Email: match[2], Name: name } : { Email: match[2] };
  }
  return { Email: from.trim() };
}

export async function sendMagicLinkEmail({ to, url }: SendMagicLinkArgs): Promise<void> {
  const mailjet = getMailjet();

  if (!mailjet) {
    // Dev fallback: log the magic link so you can click it from terminal.
    // eslint-disable-next-line no-console
    console.log(`\n🪄 [auth] magic link for ${to}:\n   ${url}\n`);
    return;
  }

  const subject = 'Ton lien de connexion · Game Hub';
  const html = renderMagicLinkHtml(url);
  const text = `Clique pour te connecter à Game Hub :\n\n${url}\n\nLien valable 30 minutes.`;

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: parseFrom(FROM),
        To: [{ Email: to }],
        Subject: subject,
        TextPart: text,
        HTMLPart: html,
      },
    ],
  });
}

function renderMagicLinkHtml(url: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="font-family: -apple-system, system-ui, sans-serif; background: #09090b; color: #fafafa; margin: 0; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111114; border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.08);">
    <h1 style="font-size: 24px; margin: 0 0 8px; color: #d946ef;">Game Hub</h1>
    <p style="margin: 0 0 24px; color: #a1a1aa;">Clique pour te connecter. Le lien expire dans 30 min.</p>
    <a href="${url}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #8b5cf6, #d946ef); color: white; text-decoration: none; border-radius: 12px; font-weight: bold;">Se connecter</a>
    <p style="margin: 24px 0 0; color: #71717a; font-size: 12px;">Si tu n'as pas demandé ce mail, ignore-le.</p>
  </div>
</body>
</html>`;
}
