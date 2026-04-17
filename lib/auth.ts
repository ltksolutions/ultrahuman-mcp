import { SignJWT, jwtVerify } from "jose";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUser, type User } from "./db.js";

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || "change-me-in-production");

const COOKIE_NAME = "uh_session";

export interface SessionPayload {
  email: string;
  role: "user" | "admin";
}

export async function createSession(
  email: string,
  role: "user" | "admin"
): Promise<string> {
  return new SignJWT({ email, role } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const isProduction = process.env.VERCEL_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${isProduction ? "; Secure" : ""}`
  );
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((c) => {
    const [key, ...val] = c.trim().split("=");
    if (key) cookies[key] = val.join("=");
  });
  return cookies;
}

export async function getSessionFromRequest(
  req: VercelRequest
): Promise<SessionPayload | null> {
  const cookieHeader = req.headers.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<User | null> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Neprihlásený" });
    return null;
  }

  const user = await getUser(session.email);
  if (!user || !user.active) {
    res.status(401).json({ error: "Účet nie je aktívny" });
    return null;
  }

  return user;
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<User | null> {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (user.role !== "admin") {
    res.status(403).json({ error: "Nemáte oprávnenie správcu" });
    return null;
  }

  return user;
}
