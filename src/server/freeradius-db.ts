import mysql from "mysql2/promise";

type GlobalPool = { freeradiusPool?: mysql.Pool | null };

const globalForMysql = globalThis as unknown as GlobalPool;

export function isFreeradiusConfigured() {
  return Boolean(process.env.FREERADIUS_DB_URL?.trim());
}

export function getFreeradiusPool(): mysql.Pool | null {
  if (globalForMysql.freeradiusPool !== undefined) {
    return globalForMysql.freeradiusPool;
  }
  const url = process.env.FREERADIUS_DB_URL?.trim();
  if (!url) {
    globalForMysql.freeradiusPool = null;
    return null;
  }
  globalForMysql.freeradiusPool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 8,
    enableKeepAlive: true,
  });
  return globalForMysql.freeradiusPool;
}

export async function frQuery<T extends mysql.RowDataPacket[]>(
  sql: string,
  params: Array<string | number | boolean | null> = [],
): Promise<T> {
  const pool = getFreeradiusPool();
  if (!pool) {
    throw new Error("FREERADIUS_DB_URL belum di-set.");
  }
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function frExecute(sql: string, params: Array<string | number | boolean | null> = []) {
  const pool = getFreeradiusPool();
  if (!pool) {
    throw new Error("FREERADIUS_DB_URL belum di-set.");
  }
  const [result] = await pool.execute(sql, params);
  return result;
}
