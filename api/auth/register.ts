import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUser, createMagicLink } from "../../lib/db.js";
import { sendRegistrationEmail } from "../../lib/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, gdprAccepted, termsAccepted } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email je povinný" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Neplatný formát emailu" });
    }

    if (!gdprAccepted || !termsAccepted) {
      return res.status(400).json({
        error: "Musíte súhlasiť s GDPR a Podmienkami používania",
      });
    }

    // Check if user already exists
    const existing = await getUser(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        error: "Účet s týmto emailom už existuje. Použite prihlásenie.",
      });
    }

    // Create magic link for registration
    const token = await createMagicLink(normalizedEmail, "register");

    // Send registration email
    await sendRegistrationEmail(normalizedEmail, token);

    return res.status(200).json({
      message:
        "Na vašu emailovú adresu bol odoslaný overovací link. Skontrolujte si doručenú poštu.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Chyba pri registrácii" });
  }
}
