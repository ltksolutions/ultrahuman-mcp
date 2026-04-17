import type { VercelRequest, VercelResponse } from "@vercel/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../lib/mcp-server.js";

// Reuse server instance across warm invocations
let server: McpServer | null = null;

function getServer(): McpServer {
  if (!server) {
    server = createMcpServer();
  }
  return server;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers for MCP clients
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Mcp-Session-Id"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id"
  );

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const mcpServer = getServer();

    // Create a stateless transport for each request (serverless-friendly)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    await mcpServer.connect(transport);

    // Let the transport handle the MCP protocol
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
}
