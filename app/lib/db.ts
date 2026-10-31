import "server-only";
import { neon } from "@neondatabase/serverless";
import { type RawStore, type StoreKey, type Versions, STORE_KEYS } from "./expenses";

/**
 * Данные трекера в базе: по строке на раздел (записи, настройки, платежи, переводы),
 * значение — тот же JSON, что раньше лежал в браузере. version растёт с каждым
 * сохранением: по нему видно, что раздел успели изменить с другого устройства.
 */

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Не задан DATABASE_URL — база данных не подключена");
  return neon(url);
}

let tableReady: Promise<unknown> | null = null;

function ensureTable() {
  tableReady ??= sql()`
    CREATE TABLE IF NOT EXISTS tracker_data (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      version integer NOT NULL DEFAULT 1,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`.catch((err) => {
    tableReady = null; // повторим при следующем запросе
    throw err;
  });
  return tableReady;
}

export async function readStore(): Promise<{ data: RawStore; versions: Versions }> {
  await ensureTable();
  const rows = (await sql()`SELECT key, value, version FROM tracker_data`) as {
    key: string;
    value: unknown;
    version: number;
  }[];
  const data = { entries: null, settings: null, recurring: null, transfers: null } as RawStore;
  const versions = { entries: 0, settings: 0, recurring: 0, transfers: 0 } as Versions;
  for (const row of rows) {
    if (!STORE_KEYS.includes(row.key as StoreKey)) continue;
    data[row.key as StoreKey] = row.value;
    versions[row.key as StoreKey] = row.version;
  }
  return { data, versions };
}

/**
 * Сохраняет раздел, только если в базе всё ещё версия baseVersion (0 — раздела нет).
 * Возвращает новую версию или null, если раздел уже изменили в другом месте.
 */
export async function writeKey(key: StoreKey, value: unknown, baseVersion: number) {
  await ensureTable();
  const json = JSON.stringify(value);
  const rows = (
    baseVersion === 0
      ? await sql()`
          INSERT INTO tracker_data (key, value) VALUES (${key}, ${json}::jsonb)
          ON CONFLICT (key) DO NOTHING
          RETURNING version`
      : await sql()`
          UPDATE tracker_data SET value = ${json}::jsonb, version = version + 1, updated_at = now()
          WHERE key = ${key} AND version = ${baseVersion}
          RETURNING version`
  ) as { version: number }[];
  return rows[0]?.version ?? null;
}

/** Заменяет все данные разом (восстановление из копии) одной транзакцией. */
export async function replaceStore(data: RawStore): Promise<Versions> {
  await ensureTable();
  const db = sql();
  const queries = STORE_KEYS.map((key) =>
    data[key] == null
      ? db`DELETE FROM tracker_data WHERE key = ${key} RETURNING 0 AS version`
      : db`
          INSERT INTO tracker_data (key, value) VALUES (${key}, ${JSON.stringify(data[key])}::jsonb)
          ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, version = tracker_data.version + 1, updated_at = now()
          RETURNING version`,
  );
  const results = (await db.transaction(queries)) as { version: number }[][];
  const versions = {} as Versions;
  STORE_KEYS.forEach((key, i) => (versions[key] = data[key] == null ? 0 : results[i][0].version));
  return versions;
}
