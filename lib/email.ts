const RESEND_API_KEY = () => process.env.RESEND_API_KEY || "";
const APP_URL = () => process.env.APP_URL || "http://localhost:3000";
const FROM_EMAIL = () =>
  process.env.FROM_EMAIL || "Ultrahuman MCP <noreply@resend.dev>";

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL(),
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Email send failed:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }
}

export async function sendRegistrationEmail(
  email: string,
  token: string
): Promise<void> {
  const verifyUrl = `${APP_URL()}/api/auth/verify?token=${token}&type=register`;

  await sendEmail(
    email,
    "Potvrďte registráciu – Ultrahuman MCP",
    `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
      <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 16px;">Potvrdenie registrácie</h2>
      <p style="color: #444; font-size: 15px; line-height: 1.6;">
        Dostali sme vašu žiadosť o registráciu do systému Ultrahuman MCP.
      </p>
      <p style="color: #444; font-size: 15px; line-height: 1.6;">
        Kliknutím na tlačidlo nižšie potvrdíte registráciu a budete automaticky prihlásený.
      </p>
      <div style="margin: 28px 0;">
        <a href="${verifyUrl}"
           style="display: inline-block; background: #18181b; color: #fff; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 500;">
          Potvrdiť registráciu
        </a>
      </div>
      <p style="color: #888; font-size: 13px;">
        Link je platný 30 minút. Ak ste nežiadali o registráciu, tento email ignorujte.
      </p>
    </div>
    `
  );
}

export async function sendLoginEmail(
  email: string,
  token: string
): Promise<void> {
  const verifyUrl = `${APP_URL()}/api/auth/verify?token=${token}&type=login`;

  await sendEmail(
    email,
    "Prihlásenie – Ultrahuman MCP",
    `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
      <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 16px;">Prihlásenie do systému</h2>
      <p style="color: #444; font-size: 15px; line-height: 1.6;">
        Kliknutím na tlačidlo nižšie sa prihlásite do systému Ultrahuman MCP.
      </p>
      <div style="margin: 28px 0;">
        <a href="${verifyUrl}"
           style="display: inline-block; background: #18181b; color: #fff; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 500;">
          Prihlásiť sa
        </a>
      </div>
      <p style="color: #888; font-size: 13px;">
        Link je platný 30 minút. Ak ste nežiadali o prihlásenie, tento email ignorujte.
      </p>
    </div>
    `
  );
}
