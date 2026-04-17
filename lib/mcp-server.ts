import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getMetrics, getSleep, getHeartRate, getHrv, getSteps,
  getTemperature, getRecovery, getMovement, getVo2Max, getProfile,
  type UltrahumanConfig,
} from "./ultrahuman-api.js";

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

/**
 * Creates an MCP server configured with a specific user's credentials.
 */
export function createMcpServer(config: UltrahumanConfig): McpServer {
  const server = new McpServer({ name: "ultrahuman", version: "1.0.0" });

  const dateShape = {
    date: z.string().describe("Date in YYYY-MM-DD format (e.g. 2026-04-17)"),
  };

  server.tool("get_all_metrics",
    "Fetch all health metrics from Ultrahuman Ring for a date.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getMetrics(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_sleep",
    "Fetch sleep data: stages, duration, score, bedtime, wake time.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getSleep(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_heart_rate",
    "Fetch heart rate: resting, average, max, HR zones.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getHeartRate(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_hrv",
    "Fetch HRV – recovery and stress indicator.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getHrv(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_steps",
    "Fetch daily step count.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getSteps(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_temperature",
    "Fetch skin temperature and baseline deviations.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getTemperature(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_recovery",
    "Fetch recovery index and readiness score.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getRecovery(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_movement",
    "Fetch movement: activity, calories, exercise minutes.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getMovement(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_vo2max",
    "Fetch VO2 Max estimate.",
    dateShape,
    async ({ date }) => { try { return toolResult(await getVo2Max(config, date)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_profile",
    "Fetch Ultrahuman user profile.",
    {},
    async () => { try { return toolResult(await getProfile(config)); } catch (e) { return toolError(e); } }
  );

  server.tool("get_date_range",
    "Fetch metrics for a date range (max 14 days).",
    {
      start_date: z.string().describe("Start date YYYY-MM-DD"),
      end_date: z.string().describe("End date YYYY-MM-DD"),
    },
    async ({ start_date, end_date }) => {
      try {
        const start = new Date(start_date);
        const end = new Date(end_date);
        const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
        if (diff > 14) return toolError("Max 14 days (serverless timeout limit)");
        if (diff < 0) return toolError("start_date must be before end_date");

        const results: Record<string, unknown> = {};
        const cur = new Date(start);
        while (cur <= end) {
          const d = cur.toISOString().split("T")[0]!;
          try { results[d] = await getMetrics(config, d); }
          catch (e) { results[d] = { error: e instanceof Error ? e.message : "Failed" }; }
          cur.setDate(cur.getDate() + 1);
        }
        return toolResult(results);
      } catch (e) { return toolError(e); }
    }
  );

  return server;
}
