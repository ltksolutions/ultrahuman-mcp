import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getMetrics,
  getSleep,
  getHeartRate,
  getHrv,
  getSteps,
  getTemperature,
  getRecovery,
  getMovement,
  getVo2Max,
  getProfile,
  type UltrahumanConfig,
} from "./ultrahuman-api.js";

function getConfig(): UltrahumanConfig {
  const authToken = process.env.ULTRAHUMAN_AUTH_TOKEN;
  const userEmail = process.env.ULTRAHUMAN_USER_EMAIL;
  if (!authToken || !userEmail) {
    throw new Error(
      "Missing ULTRAHUMAN_AUTH_TOKEN or ULTRAHUMAN_USER_EMAIL env vars"
    );
  }
  return { authToken, userEmail };
}

// ─── Helpers ───

function toolResult(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// ─── Create and configure MCP Server ───

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "ultrahuman",
    version: "1.0.0",
  });

  const dateShape = {
    date: z.string().describe("Date in YYYY-MM-DD format (e.g. 2026-04-17)"),
  };

  server.tool(
    "get_all_metrics",
    "Fetch all health metrics from Ultrahuman Ring for a specific date: sleep, heart rate, HRV, steps, temperature, recovery, movement, VO2 max.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getMetrics(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_sleep",
    "Fetch detailed sleep data: stages, duration, sleep score, bedtime, wake time.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getSleep(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_heart_rate",
    "Fetch heart rate data: resting HR, average HR, max HR, HR zones.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getHeartRate(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_hrv",
    "Fetch Heart Rate Variability (HRV) – key recovery and stress indicator.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getHrv(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_steps",
    "Fetch daily step count and movement data.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getSteps(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_temperature",
    "Fetch skin temperature data and deviations from baseline.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getTemperature(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_recovery",
    "Fetch recovery index and readiness score (based on sleep, HRV, temperature, activity).",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getRecovery(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_movement",
    "Fetch movement index: activity levels, calories burned, exercise minutes.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getMovement(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_vo2max",
    "Fetch VO2 Max (cardiorespiratory fitness) estimate.",
    dateShape,
    async ({ date }) => {
      try {
        return toolResult(await getVo2Max(getConfig(), date));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_profile",
    "Fetch Ultrahuman user profile information.",
    {},
    async () => {
      try {
        return toolResult(await getProfile(getConfig()));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.tool(
    "get_date_range",
    "Fetch all metrics for a date range (max 30 days). Great for weekly/monthly trend analysis.",
    {
      start_date: z.string().describe("Start date YYYY-MM-DD"),
      end_date: z.string().describe("End date YYYY-MM-DD"),
    },
    async ({ start_date, end_date }) => {
      try {
        const start = new Date(start_date);
        const end = new Date(end_date);
        const diffDays = Math.ceil(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays > 30) return toolError("Date range max 30 days");
        if (diffDays < 0) return toolError("start_date must be before end_date");

        const cfg = getConfig();
        const results: Record<string, unknown> = {};
        const current = new Date(start);

        while (current <= end) {
          const dateStr = current.toISOString().split("T")[0]!;
          try {
            results[dateStr] = await getMetrics(cfg, dateStr);
          } catch (e) {
            results[dateStr] = {
              error: e instanceof Error ? e.message : "Failed",
            };
          }
          current.setDate(current.getDate() + 1);
        }
        return toolResult(results);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  return server;
}
