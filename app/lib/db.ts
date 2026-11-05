import "server-only";
import { neon } from "@neondatabase/serverless";
import { type RawStore, type StoreKey, type Versions, STORE_KEYS } from "./expenses";

/**
 * Данные трекера в базе: у каждого пользователя по строке на раздел (записи,
 * настройки, платежи, переводы), значение — JSON. Таблица описана в
 * db/tracker_user_data.sql. version растёт с каждым сохранением: по нему видно,
 * что раздел успели изменить с другого устройства.
 *
 * userId приходит только из сессии на сервере и есть в условии каждого запроса.
 */

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Не задан DATABASE_URL — база данных не подключена");
  return neon(url);
}

export async function readStore(userId: string): Promise<{ data: RawStore; versions: Versions }> {
  const rows = (await sql()`
    SELECT key, value, version FROM tracker_user_data WHERE user_id = ${userId}::uuid
  `) as { key: string; value: unknown; version: number }[];
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
export async function writeKey(userId: string, key: StoreKey, value: unknown, baseVersion: number) {
  const json = JSON.stringify(value);
  const rows = (
    baseVersion === 0
      ? await sql()`
          INSERT INTO tracker_user_data (user_id, key, value)
          VALUES (${userId}::uuid, ${key}, ${json}::jsonb)
          ON CONFLICT (user_id, key) DO NOTHING
          RETURNING version`
      : await sql()`
          UPDATE tracker_user_data
          SET value = ${json}::jsonb, version = version + 1, updated_at = now()
          WHERE user_id = ${userId}::uuid AND key = ${key} AND version = ${baseVersion}
          RETURNING version`
  ) as { version: number }[];
  return rows[0]?.version ?? null;
}

/** Заменяет все данные пользователя разом (восстановление из копии) одной транзакцией. */
export async function replaceStore(userId: string, data: RawStore): Promise<Versions> {
  const db = sql();
  const queries = STORE_KEYS.map((key) =>
    data[key] == null
      ? db`
          DELETE FROM tracker_user_data WHERE user_id = ${userId}::uuid AND key = ${key}
          RETURNING 0 AS version`
      : db`
          INSERT INTO tracker_user_data (user_id, key, value)
          VALUES (${userId}::uuid, ${key}, ${JSON.stringify(data[key])}::jsonb)
          ON CONFLICT (user_id, key) DO UPDATE
            SET value = EXCLUDED.value, version = tracker_user_data.version + 1, updated_at = now()
          RETURNING version`,
  );
  const results = (await db.transaction(queries)) as { version: number }[][];
  const versions = {} as Versions;
  STORE_KEYS.forEach((key, i) => (versions[key] = data[key] == null ? 0 : results[i][0].version));
  return versions;
}
