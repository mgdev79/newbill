import type { Nas } from "@/generated/tenant";

export type NasPublic = {
  id: string;
  name: string;
  ip: string;
  apiPort: number;
  useSsl: boolean;
  timeoutSec: number;
  apiUser: string;
  hasApiPassword: boolean;
  timezone: string;
  healthy: boolean;
  enabled: boolean;
  description: string;
  hasRadiusSecret: boolean;
  latitude: string;
  longitude: string;
  coverageM: number;
  hotspotUrl: string;
  isolirUrl: string;
  enablePpp: boolean;
  enableHotspot: boolean;
  lastSeenAt: string | null;
  lastError: string;
  radiusAuthPort: number | null;
  radiusAcctPort: number | null;
  userOnline: number;
};

export function toPublicNas(
  row: Nas,
  extra?: {
    radiusAuthPort?: number | null;
    radiusAcctPort?: number | null;
    userOnline?: number;
  },
): NasPublic {
  return {
    id: row.id,
    name: row.name,
    ip: row.ip,
    apiPort: row.apiPort,
    useSsl: row.useSsl,
    timeoutSec: row.timeoutSec,
    apiUser: row.apiUser,
    hasApiPassword: Boolean(row.apiPassword),
    timezone: row.timezone,
    healthy: row.healthy,
    enabled: row.enabled,
    description: row.description,
    hasRadiusSecret: Boolean(row.radiusSecret),
    latitude: row.latitude,
    longitude: row.longitude,
    coverageM: row.coverageM,
    hotspotUrl: row.hotspotUrl,
    isolirUrl: row.isolirUrl,
    enablePpp: row.enablePpp,
    enableHotspot: row.enableHotspot,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    lastError: row.lastError,
    radiusAuthPort: extra?.radiusAuthPort ?? null,
    radiusAcctPort: extra?.radiusAcctPort ?? null,
    userOnline: extra?.userOnline ?? 0,
  };
}

export type NasWriteBody = {
  name?: string;
  ip?: string;
  apiPort?: number;
  useSsl?: boolean;
  timeoutSec?: number;
  apiUser?: string;
  apiPassword?: string;
  timezone?: string;
  enabled?: boolean;
  description?: string;
  radiusSecret?: string;
  latitude?: string;
  longitude?: string;
  coverageM?: number;
  hotspotUrl?: string;
  isolirUrl?: string;
  enablePpp?: boolean;
  enableHotspot?: boolean;
};

export function parseNasBody(raw: unknown): NasWriteBody {
  const body = (raw ?? {}) as Record<string, unknown>;
  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string) : undefined;
  const num = (key: string) =>
    typeof body[key] === "number"
      ? (body[key] as number)
      : typeof body[key] === "string" && body[key] !== ""
        ? Number(body[key])
        : undefined;
  const bool = (key: string) =>
    typeof body[key] === "boolean" ? (body[key] as boolean) : undefined;

  return {
    name: str("name")?.trim(),
    ip: str("ip")?.trim(),
    apiPort: num("apiPort"),
    useSsl: bool("useSsl"),
    timeoutSec: num("timeoutSec"),
    apiUser: str("apiUser")?.trim(),
    apiPassword: str("apiPassword"),
    timezone: str("timezone")?.trim(),
    enabled: bool("enabled"),
    description: str("description")?.trim(),
    radiusSecret: str("radiusSecret"),
    latitude: str("latitude")?.trim(),
    longitude: str("longitude")?.trim(),
    coverageM: num("coverageM"),
    hotspotUrl: str("hotspotUrl")?.trim(),
    isolirUrl: str("isolirUrl")?.trim(),
    enablePpp: bool("enablePpp"),
    enableHotspot: bool("enableHotspot"),
  };
}
