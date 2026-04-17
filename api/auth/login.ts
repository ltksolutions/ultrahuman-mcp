import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUser, createMagicLink } from "../../lib/db.js";
import { sendLoginEmail } from "../../lib/email.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email je povinný" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await getUser(normalizedEmail);
    if (!user) {
      // Don't reveal whether user exists - always say "sent"
      return res.status(200).json({
        message: "Ak účet existuje, prihlasovací link bol odoslaný na váš email.",
      });
    }

    if (!user.active) {
      return res.status(200).json({
        message: "Ak účet existuje, prihlasovací link bol odoslaný na váš email.",
      });
    }

    const token = await createMagicLink(normalizedEmail, "login");
    await sendLoginEmail(normalizedEmail, token);

    return res.status(200).json({
      message: "Ak účet existuje, prihlasovací link bol odoslaný na váš email.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Chyba pri prihlásení" });
  }
}
