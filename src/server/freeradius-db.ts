import mysql from "mysql2/promise";
import {
  getActiveRadiusEngine,
  radiusEngineConfigHash,
} from "@/server/radius-engine";
import { getTenantCode } from "@/lib/tenant-context";

type PoolCache = { hash: string; pool: mysql.Pool };
const globalForMysql = globalThis as unknown as {
  freeradiusPoolCache?: Map<string, PoolCache>;
};

function poolCacheMap() {
  if (!globalForMysql.freeradiusPoolCache) {
    globalForMysql.freeradiusPoolCache = new Map();
  }
  return globalForMysql.freeradiusPoolCache;
}

export async function isFreeradiusConfigured() {
  const engine = await getActiveRadiusEngine();
  return Boolean(engine?.dbHost && engine.dbUser);
}

export async function getFreeradiusPool(): Promise<mysql.Pool | null> {
  const tenantCode = await getTenantCode();
  const engine = await getActiveRadiusEngine();
  const map = poolCacheMap();
  const cacheKey = tenantCode;

  if (!engine?.dbHost || !engine.dbUser) {
    const cached = map.get(cacheKey);
    if (cached) {
      await cached.pool.end().catch(() => undefined);
      map.delete(cacheKey);
    }
    return null;
  }

  const hash = radiusEngineConfigHash(engine);
  const cached = map.get(cacheKey);
  if (cached && cached.hash === hash) {
    return cached.pool;
  }
  if (cached) {
    await cached.pool.end().catch(() => undefined);
  }

  const pool = mysql.createPool({
    host: engine.dbHost,
    port: engine.dbPort || 3306,
    user: engine.dbUser,
    password: engine.dbPassword,
    database: engine.dbName || "radius",
    waitForConnections: true,
    connectionLimit: 8,
    enableKeepAlive: true,
  });
  map.set(cacheKey, { hash, pool });
  return pool;
}

export async function frQuery<T extends mysql.RowDataPacket[]>(
  sql: string,
  params: Array<string | number | boolean | null> = [],
): Promise<T> {
  const pool = await getFreeradiusPool();
  if (!pool) {
    throw new Error("Radius Engine belum dikonfigurasi. Isi di Pengaturan → Radius Engine.");
  }
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function frExecute(sql: string, params: Array<string | number | boolean | null> = []) {
  const pool = await getFreeradiusPool();
  if (!pool) {
    throw new Error("Radius Engine belum dikonfigurasi. Isi di Pengaturan → Radius Engine.");
  }
  const [result] = await pool.execute(sql, params);
  return result;
}
