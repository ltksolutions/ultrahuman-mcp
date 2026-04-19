import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fetchMetrics,
  extractTypes,
  extractType,
  type UltrahumanConfig,
  type ApiResponse,
} from "./ultrahuman-api.js";

// ─── Helpers ───

function ok(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function fail(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true,
  };
}

/**
 * 60s in-memory cache — multiple tool calls for the same date
 * reuse the API response without hitting Ultrahuman again.
 */
function createCache() {
  const store = new Map<string, { data: ApiResponse; ts: number }>();
  const TTL = 60_000;

  return async function get(
    config: UltrahumanConfig,
    date: string
  ): Promise<ApiResponse> {
    const key = `${config.userEmail}:${date}`;
    const hit = store.get(key);
    if (hit && Date.now() - hit.ts < TTL) return hit.data;

    const data = await fetchMetrics(config, date);
    store.set(key, { data, ts: Date.now() });

    // evict stale
    if (store.size > 50) {
      const now = Date.now();
      for (const [k, v] of store) {
        if (now - v.ts > TTL) store.delete(k);
      }
    }
    return data;
  };
}

// ─── Server factory ───

export function createMcpServer(config: UltrahumanConfig): McpServer {
  const server = new McpServer({ name: "ultrahuman", version: "1.0.0" });
  const cached = createCache();

  const dateParam = {
    date: z.string().describe("Date in YYYY-MM-DD format"),
  };

  // ── All metrics ──
  server.tool(
    "get_all_metrics",
    "Fetch ALL health metrics from the Ultrahuman Ring for a given date. Returns the complete API response with: heart rate (hr), skin temperature (temp), HRV (hrv), steps, motion, resting HR (night_rhr), sleep (score + stages + graphs + insights), recovery, glucose, metabolic_score, glucose_variability, average_glucose, hba1c, time_in_target, recovery_index, movement_index, vo2_max.",
    dateParam,
    async ({ date }) => {
      try {
        return ok(await cached(config, date));
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Sleep ──
  server.tool(
    "get_sleep",
    "Fetch sleep data: sleep score, bedtime start/end, total sleep time, sleep efficiency, sleep stages (deep/light/REM/awake %), sleep stage graph, HR/HRV during sleep, movement graph, summary scores (efficiency, temperature, restfulness, HRV form, timing, restoration), and AI-generated insights.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        const sleep = extractType(res, "sleep");
        return ok(sleep ?? { message: "No sleep data for this date" });
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Heart rate ──
  server.tool(
    "get_heart_rate",
    "Fetch heart rate data: timestamped HR values throughout the day (BPM), last reading, and resting HR (night_rhr) with nightly average.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(extractTypes(res, ["hr", "night_rhr"]));
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── HRV ──
  server.tool(
    "get_hrv",
    "Fetch Heart Rate Variability (HRV): timestamped values and daily average. Key indicator of recovery and autonomic nervous system balance.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(extractType(res, "hrv") ?? { message: "No HRV data" });
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Steps ──
  server.tool(
    "get_steps",
    "Fetch step count: timestamped values and daily average.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(extractType(res, "steps") ?? { message: "No steps data" });
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Temperature ──
  server.tool(
    "get_temperature",
    "Fetch skin temperature: timestamped readings in °C, last reading.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(extractType(res, "temp") ?? { message: "No temperature data" });
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Recovery ──
  server.tool(
    "get_recovery",
    "Fetch recovery data: recovery score (0-10) and recovery index value. Shows overall body readiness.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(extractTypes(res, ["recovery", "recovery_index"]));
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Movement ──
  server.tool(
    "get_movement",
    "Fetch movement data: motion values (timestamped), daily average, and movement index score.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(extractTypes(res, ["motion", "movement_index"]));
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── VO2 Max ──
  server.tool(
    "get_vo2max",
    "Fetch VO2 Max: estimated cardiorespiratory fitness value.",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(extractType(res, "vo2_max") ?? { message: "No VO2 Max data" });
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Glucose / Metabolic ──
  server.tool(
    "get_glucose",
    "Fetch glucose and metabolic data (requires Ultrahuman M1 CGM): glucose readings (mg/dL, timestamped), metabolic score, glucose variability (%), average glucose (mg/dL), HbA1c, and time in target (%).",
    dateParam,
    async ({ date }) => {
      try {
        const res = await cached(config, date);
        return ok(
          extractTypes(res, [
            "glucose",
            "metabolic_score",
            "glucose_variability",
            "average_glucose",
            "hba1c",
            "time_in_target",
          ])
        );
      } catch (e) {
        return fail(e);
      }
    }
  );

  // ── Date range ──
  server.tool(
    "get_date_range",
    "Fetch all metrics for a date range (max 14 days). Returns full API response per day. Useful for trend analysis across multiple days.",
    {
      start_date: z.string().describe("Start date YYYY-MM-DD"),
      end_date: z.string().describe("End date YYYY-MM-DD"),
    },
    async ({ start_date, end_date }) => {
      try {
        const s = new Date(start_date);
        const e = new Date(end_date);
        const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000);
        if (diff > 14) return fail("Max 14 days (serverless timeout)");
        if (diff < 0) return fail("start_date must be before end_date");

        const results: Record<string, unknown> = {};
        const cur = new Date(s);
        while (cur <= e) {
          const d = cur.toISOString().split("T")[0]!;
          try {
            results[d] = await cached(config, d);
          } catch (err) {
            results[d] = {
              error: err instanceof Error ? err.message : "Failed",
            };
          }
          cur.setDate(cur.getDate() + 1);
        }
        return ok(results);
      } catch (e) {
        return fail(e);
      }
    }
  );

  return server;
}
