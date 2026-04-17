/**
 * Ultrahuman Partner API client
 * Base URL: https://partner.ultrahuman.com/api/v1
 * Auth: Bearer token
 */

const API_BASE = "https://partner.ultrahuman.com/api/v1";

export interface UltrahumanConfig {
  authToken: string;
  userEmail: string;
}

async function apiRequest(
  config: UltrahumanConfig,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set("email", config.userEmail);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${config.authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ultrahuman API error ${response.status}: ${errorText}`
    );
  }

  return response.json();
}

// ─── Individual metric fetchers ───

export async function getMetrics(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/metrics", { date });
}

export async function getSleep(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/sleep", { date });
}

export async function getHeartRate(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/heart_rate", { date });
}

export async function getHrv(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/hrv", { date });
}

export async function getSteps(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/steps", { date });
}

export async function getTemperature(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/temperature", { date });
}

export async function getRecovery(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/recovery", { date });
}

export async function getMovement(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/movement", { date });
}

export async function getVo2Max(
  config: UltrahumanConfig,
  date: string
): Promise<unknown> {
  return apiRequest(config, "/vo2max", { date });
}

export async function getProfile(
  config: UltrahumanConfig
): Promise<unknown> {
  return apiRequest(config, "/profile");
}
