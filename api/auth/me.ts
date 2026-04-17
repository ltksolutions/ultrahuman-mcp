import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionFromRequest, clearSessionCookie } from "../../lib/auth.js";
import { getUser } from "../../lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "DELETE") {
    // Logout
    clearSessionCookie(res);
    return res.status(200).json({ message: "Odhlásený" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: "Neprihlásený" });
    }

    const user = await getUser(session.email);
    if (!user || !user.active) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "Účet neexistuje alebo nie je aktívny" });
    }

    // Return user info (without sensitive token)
    return res.status(200).json({
      email: user.email,
      role: user.role,
      mcpToken: user.mcpToken,
      hasUltrahumanToken: !!user.ultrahumanToken,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return res.status(500).json({ error: "Chyba servera" });
  }
}
