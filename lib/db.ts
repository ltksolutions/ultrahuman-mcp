import { kv } from "@vercel/kv";
import { randomBytes } from "crypto";

// ─── Types ───

export interface User {
  email: string;
  ultrahumanToken: string; // encrypted
  mcpToken: string; // public token for MCP URL
  role: "user" | "admin";
  gdprAccepted: boolean;
  termsAccepted: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserPublic = Omit<User, "ultrahumanToken">;

// ─── Key patterns ───

const userKey = (email: string) => `user:${email.toLowerCase()}`;
const mcpLookupKey = (mcpToken: string) => `mcp:${mcpToken}`;
const magicLinkKey = (token: string) => `magic:${token}`;
const allUsersKey = () => "users:all";

// ─── Token generation ───

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

// ─── User CRUD ───

export async function createUser(
  email: string,
  gdprAccepted: boolean,
  termsAccepted: boolean
): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await getUser(normalizedEmail);
  if (existing) throw new Error("Používateľ s týmto emailom už existuje");

  const mcpToken = generateToken(24);

  // Check if this is the first user or if email is in ADMIN_EMAILS
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allUsers = await getAllUserEmails();
  const isFirstUser = allUsers.length === 0;
  const isAdmin = isFirstUser || adminEmails.includes(normalizedEmail);

  const user: User = {
    email: normalizedEmail,
    ultrahumanToken: "",
    mcpToken,
    role: isAdmin ? "admin" : "user",
    gdprAccepted,
    termsAccepted,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await kv.set(userKey(normalizedEmail), JSON.stringify(user));
  await kv.set(mcpLookupKey(mcpToken), normalizedEmail);
  await kv.sadd(allUsersKey(), normalizedEmail);

  return user;
}

export async function getUser(email: string): Promise<User | null> {
  const data = await kv.get<string>(userKey(email.toLowerCase().trim()));
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function getUserByMcpToken(
  mcpToken: string
): Promise<User | null> {
  const email = await kv.get<string>(mcpLookupKey(mcpToken));
  if (!email) return null;
  return getUser(email);
}

export async function updateUserToken(
  email: string,
  encryptedToken: string
): Promise<void> {
  const user = await getUser(email);
  if (!user) throw new Error("Používateľ neexistuje");

  user.ultrahumanToken = encryptedToken;
  user.updatedAt = new Date().toISOString();
  await kv.set(userKey(email.toLowerCase()), JSON.stringify(user));
}

export async function deactivateUser(email: string): Promise<void> {
  const user = await getUser(email);
  if (!user) throw new Error("Používateľ neexistuje");

  user.active = false;
  user.updatedAt = new Date().toISOString();
  await kv.set(userKey(email.toLowerCase()), JSON.stringify(user));
}

export async function reactivateUser(email: string): Promise<void> {
  const user = await getUser(email);
  if (!user) throw new Error("Používateľ neexistuje");

  user.active = true;
  user.updatedAt = new Date().toISOString();
  await kv.set(userKey(email.toLowerCase()), JSON.stringify(user));
}

export async function getAllUserEmails(): Promise<string[]> {
  const members = await kv.smembers(allUsersKey());
  return (members || []) as string[];
}

export async function getAllUsers(): Promise<UserPublic[]> {
  const emails = await getAllUserEmails();
  const users: UserPublic[] = [];

  for (const email of emails) {
    const user = await getUser(email);
    if (user) {
      const { ultrahumanToken, ...publicUser } = user;
      users.push(publicUser);
    }
  }

  return users.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Magic Links ───

export interface MagicLink {
  email: string;
  type: "register" | "login";
  expiresAt: string;
}

export async function createMagicLink(
  email: string,
  type: "register" | "login"
): Promise<string> {
  const token = generateToken(32);
  const link: MagicLink = {
    email: email.toLowerCase().trim(),
    type,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  };

  await kv.set(magicLinkKey(token), JSON.stringify(link), { ex: 1800 }); // TTL 30 min
  return token;
}

export async function getMagicLink(
  token: string
): Promise<MagicLink | null> {
  const data = await kv.get<string>(magicLinkKey(token));
  if (!data) return null;
  const link = typeof data === "string" ? JSON.parse(data) : data;

  if (new Date(link.expiresAt) < new Date()) {
    await kv.del(magicLinkKey(token));
    return null;
  }

  return link;
}

export async function deleteMagicLink(token: string): Promise<void> {
  await kv.del(magicLinkKey(token));
}
