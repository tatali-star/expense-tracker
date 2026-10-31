"use client";

import { useRef, useState } from "react";
import { replaceAll, saveSection } from "../actions";
import type { RawStore, StoreKey, Versions } from "../lib/expenses";

/**
 * problem — что показать пользователю: сохранить не удалось (нет связи) или раздел
 * успели изменить на другом устройстве; во втором случае дальше не сохраняем,
 * чтобы не затереть чужие изменения, пока страница не обновлена.
 */
export type SyncProblem = "error" | "conflict" | null;

export function useSync(initialVersions: Versions) {
  const versions = useRef({ ...initialVersions });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const conflict = useRef(false);
  const [problem, setProblem] = useState<SyncProblem>(null);

  // по одному запросу за раз: версия берётся в момент отправки, после предыдущего ответа
  function enqueue<T>(task: () => Promise<T>) {
    const run = queue.current.then(task);
    queue.current = run.catch(() => {});
    return run;
  }

  /** Сохраняет раздел целиком; ошибки показываются через problem. */
  function save(key: StoreKey, value: unknown) {
    if (conflict.current) return;
    enqueue(async () => {
      if (conflict.current) return;
      try {
        const next = await saveSection(key, value, versions.current[key]);
        if (next === null) {
          conflict.current = true;
          setProblem("conflict");
          return;
        }
        versions.current[key] = next;
        setProblem(null);
      } catch {
        setProblem("error");
      }
    });
  }

  /** Заменяет все данные; ошибку получает вызывающий. */
  function replace(data: RawStore) {
    return enqueue(async () => {
      versions.current = await replaceAll(data);
      conflict.current = false;
      setProblem(null);
    });
  }

  return { problem, save, replace };
}
