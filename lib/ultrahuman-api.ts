/**
 * Ultrahuman Partner API Client
 *
 * Official docs: https://ultrahumanapp.notion.site/UltraSignal-API-Documentation
 *
 * SINGLE ENDPOINT: GET https://partner.ultrahuman.com/api/v1/metrics
 *   Query params: email, date (YYYY-MM-DD)
 *   Header: Authorization: <auth_key>
 *
 * Response structure:
 * {
 *   data: {
 *     metric_data: [
 *       { type: "hr",                 object: { values: [...], last_reading, unit } },
 *       { type: "temp",               object: { values: [...], last_reading, unit } },
 *       { type: "hrv",                object: { values: [...], avg } },
 *       { type: "steps",              object: { values: [...], avg } },
 *       { type: "motion",             object: { values: [...], avg } },
 *       { type: "night_rhr",          object: { values: [...], avg } },
 *       { type: "sleep",              object: { score, details: { ... } } },
 *       { type: "recovery",           object: { score } },
 *       { type: "glucose",            object: { values: [...] } },
 *       { type: "metabolic_score",    object: { value } },
 *       { type: "glucose_variability",object: { value } },
 *       { type: "average_glucose",    object: { value } },
 *       { type: "hba1c",              object: { value } },
 *       { type: "time_in_target",     object: { value } },
 *       { type: "recovery_index",     object: { value } },
 *       { type: "movement_index",     object: { value } },
 *       { type: "vo2_max",            object: { value } },
 *     ]
 *   },
 *   error: null,
 *   status: "ok"
 * }
 */

const API_URL = "https://partner.ultrahuman.com/api/v1/metrics";

// ─── Types ───

export interface UltrahumanConfig {
  authToken: string;
  userEmail: string;
}

export interface MetricItem {
  type: string;
  object: Record<string, unknown>;
}

export interface ApiResponse {
  data: {
    metric_data: MetricItem[];
  };
  error: string | null;
  status: string;
}

// ─── API Call ───

/**
 * Fetch ALL metrics for a given user and date.
 * Single endpoint — returns everything at once.
 */
export async function fetchMetrics(
  config: UltrahumanConfig,
  date: string
): Promise<ApiResponse> {
  const url = new URL(API_URL);
  url.searchParams.set("email", config.userEmail);
  url.searchParams.set("date", date);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: config.authToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ultrahuman API error ${response.status}: ${errorText}`
    );
  }

  const json = (await response.json()) as ApiResponse;

  if (json.error) {
    throw new Error(`Ultrahuman API: ${json.error}`);
  }

  return json;
}

// ─── Extraction helpers ───

/**
 * Extract specific metric types from the metric_data array.
 * Returns an object keyed by type with the metric object as value.
 */
export function extractTypes(
  response: ApiResponse,
  types: string[]
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};

  for (const item of response.data.metric_data) {
    if (types.includes(item.type)) {
      result[item.type] = item.object;
    }
  }

  return result;
}

/**
 * Extract a single metric type. Returns null if not found.
 */
export function extractType(
  response: ApiResponse,
  type: string
): Record<string, unknown> | null {
  const item = response.data.metric_data.find((m) => m.type === type);
  return item ? item.object : null;
}
