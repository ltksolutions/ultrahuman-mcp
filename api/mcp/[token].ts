import type { VercelRequest, VercelResponse } from "@vercel/node";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getUserByMcpToken } from "../../lib/db.js";
import { decrypt } from "../../lib/crypto.js";
import { createMcpServer } from "../../lib/mcp-server.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Missing MCP token in URL" },
        id: null,
      });
    }

    // Look up user by MCP token
    const user = await getUserByMcpToken(token);

    if (!user || !user.active) {
      return res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid or inactive MCP token" },
        id: null,
      });
    }

    if (!user.ultrahumanToken) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Ultrahuman auth token not configured. Please set it in your dashboard.",
        },
        id: null,
      });
    }

    // Decrypt the user's Ultrahuman token
    const ultrahumanAuthToken = decrypt(user.ultrahumanToken);

    if (!ultrahumanAuthToken) {
      return res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Failed to decrypt auth token" },
        id: null,
      });
    }

    // Create MCP server with this user's credentials
    const mcpServer = createMcpServer({
      authToken: ultrahumanAuthToken,
      userEmail: user.email,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
}
