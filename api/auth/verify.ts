import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getMagicLink,
  deleteMagicLink,
  createUser,
  getUser,
} from "../../lib/db.js";
import { createSession, setSessionCookie } from "../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token, type } = req.query;

  if (!token || typeof token !== "string") {
    return redirectWithError(res, "Neplatný overovací link");
  }

  try {
    const magicLink = await getMagicLink(token);

    if (!magicLink) {
      return redirectWithError(res, "Link vypršal alebo je neplatný. Skúste sa znovu registrovať alebo prihlásiť.");
    }

    // Delete magic link (single use)
    await deleteMagicLink(token);

    if (magicLink.type === "register") {
      // Create the user account
      const existing = await getUser(magicLink.email);
      if (existing) {
        return redirectWithError(res, "Účet už existuje. Použite prihlásenie.");
      }

      const user = await createUser(magicLink.email, true, true);
      const sessionToken = await createSession(user.email, user.role);
      setSessionCookie(res, sessionToken);

      return res.redirect(302, "/#dashboard");
    }

    if (magicLink.type === "login") {
      const user = await getUser(magicLink.email);
      if (!user || !user.active) {
        return redirectWithError(res, "Účet neexistuje alebo je deaktivovaný.");
      }

      const sessionToken = await createSession(user.email, user.role);
      setSessionCookie(res, sessionToken);

      return res.redirect(302, "/#dashboard");
    }

    return redirectWithError(res, "Neplatný typ overenia");
  } catch (error) {
    console.error("Verify error:", error);
    return redirectWithError(res, "Chyba pri overovaní");
  }
}

function redirectWithError(res: VercelResponse, message: string) {
  return res.redirect(302, `/#error=${encodeURIComponent(message)}`);
}
