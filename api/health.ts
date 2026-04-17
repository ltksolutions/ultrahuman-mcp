import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: "ok",
    server: "ultrahuman-mcp",
    version: "1.0.0",
    multi_user: true,
  });
}
