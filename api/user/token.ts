import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth } from "../../lib/auth.js";
import { updateUserToken, getUser } from "../../lib/db.js";
import { encrypt, decrypt } from "../../lib/crypto.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    // Show whether token is set (never reveal the actual token fully)
    const hasToken = !!user.ultrahumanToken;
    let maskedToken = "";

    if (hasToken) {
      try {
        const decrypted = decrypt(user.ultrahumanToken);
        if (decrypted.length > 8) {
          maskedToken =
            decrypted.substring(0, 4) +
            "•".repeat(decrypted.length - 8) +
            decrypted.substring(decrypted.length - 4);
        } else {
          maskedToken = "••••••••";
        }
      } catch {
        maskedToken = "••••••••";
      }
    }

    return res.status(200).json({
      hasToken,
      maskedToken,
    });
  }

  if (req.method === "PUT") {
    const { token } = req.body || {};

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return res.status(400).json({ error: "Token je povinný" });
    }

    try {
      const encrypted = encrypt(token.trim());
      await updateUserToken(user.email, encrypted);

      return res.status(200).json({
        message: "Ultrahuman token bol úspešne uložený",
      });
    } catch (error) {
      console.error("Token update error:", error);
      return res.status(500).json({ error: "Chyba pri ukladaní tokenu" });
    }
  }

  if (req.method === "DELETE") {
    try {
      await updateUserToken(user.email, "");
      return res.status(200).json({
        message: "Ultrahuman token bol odstránený",
      });
    } catch (error) {
      console.error("Token delete error:", error);
      return res.status(500).json({ error: "Chyba pri odstraňovaní tokenu" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
