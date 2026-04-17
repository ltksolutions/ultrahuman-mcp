import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../lib/auth.js";
import { getAllUsers } from "../../lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const users = await getAllUsers();
    return res.status(200).json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({ error: "Chyba pri načítaní používateľov" });
  }
}
