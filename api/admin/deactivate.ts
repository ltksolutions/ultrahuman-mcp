import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../lib/auth.js";
import { deactivateUser, reactivateUser, getUser } from "../../lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { email, action } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email je povinný" });
    }

    const user = await getUser(email);
    if (!user) {
      return res.status(404).json({ error: "Používateľ neexistuje" });
    }

    // Prevent admin from deactivating themselves
    if (email.toLowerCase() === admin.email.toLowerCase()) {
      return res.status(400).json({
        error: "Nemôžete storno vlastný účet",
      });
    }

    if (action === "deactivate") {
      await deactivateUser(email);
      return res.status(200).json({ message: "Účet bol deaktivovaný" });
    }

    if (action === "reactivate") {
      await reactivateUser(email);
      return res.status(200).json({ message: "Účet bol reaktivovaný" });
    }

    return res.status(400).json({ error: "Neplatná akcia. Použite 'deactivate' alebo 'reactivate'." });
  } catch (error) {
    console.error("Deactivate error:", error);
    return res.status(500).json({ error: "Chyba pri spracovaní" });
  }
}
