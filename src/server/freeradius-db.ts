import mysql from "mysql2/promise";
import {
  getActiveRadiusEngine,
  radiusEngineConfigHash,
} from "@/server/radius-engine";

type PoolCache = { hash: string; pool: mysql.Pool };
const globalForMysql = globalThis as unknown as { freeradiusPoolCache?: PoolCache | null };

export async function isFreeradiusConfigured() {
  const engine = await getActiveRadiusEngine();
  return Boolean(engine?.dbHost && engine.dbUser);
}

export async function getFreeradiusPool(): Promise<mysql.Pool | null> {
  const engine = await getActiveRadiusEngine();
  if (!engine?.dbHost || !engine.dbUser) {
    if (globalForMysql.freeradiusPoolCache) {
      await globalForMysql.freeradiusPoolCache.pool.end().catch(() => undefined);
      globalForMysql.freeradiusPoolCache = null;
    }
    return null;
  }

  const hash = radiusEngineConfigHash(engine);
  const cached = globalForMysql.freeradiusPoolCache;
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
  globalForMysql.freeradiusPoolCache = { hash, pool };
  return pool;
}

export async function frQuery<T extends mysql.RowDataPacket[]>(
  sql: string,
  params: Array<string | number | boolean | null> = [],
): Promise<T> {
  const pool = await getFreeradiusPool();
  if (!pool) {
    throw new Error("Radius Engine belum dikonfigurasi. Isi di SaaS Admin → Radius Engine.");
  }
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function frExecute(sql: string, params: Array<string | number | boolean | null> = []) {
  const pool = await getFreeradiusPool();
  if (!pool) {
    throw new Error("Radius Engine belum dikonfigurasi. Isi di SaaS Admin → Radius Engine.");
  }
  const [result] = await pool.execute(sql, params);
  return result;
}
