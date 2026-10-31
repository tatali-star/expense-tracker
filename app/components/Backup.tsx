"use client";

import { useRef, useState } from "react";
import {
  type Backup as BackupData,
  createBackup,
  formatDate,
  loadLastBackup,
  parseBackup,
  restoreBackup,
  saveLastBackup,
  todayISO,
} from "../lib/expenses";

type Props = {
  onRestored: () => void;
};

const buttonClass =
  "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition";

export default function Backup({ onRestored }: Props) {
  const [lastBackup, setLastBackup] = useState(loadLastBackup);
  const [pending, setPending] = useState<BackupData | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function handleDownload() {
    const backup = createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `трекер-копия-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    saveLastBackup(todayISO());
    setLastBackup(todayISO());
    setMessage({ text: "Копия скачана в папку загрузок", error: false });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // чтобы тот же файл можно было выбрать повторно
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setMessage(null);
    } catch (err) {
      setPending(null);
      setMessage({ text: (err as Error).message, error: true });
    }
  }

  function handleRestore() {
    if (!pending) return;
    try {
      restoreBackup(pending);
      onRestored();
      setMessage({ text: "Данные восстановлены из копии", error: false });
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true });
    }
    setPending(null);
  }

  const pendingCount = Array.isArray(pending?.data.entries) ? pending.data.entries.length : 0;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">Резервная копия</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Данные хранятся только в этом браузере. Сохраняйте копию в файл, чтобы не
        потерять их при очистке браузера или перенести на другой компьютер.
      </p>
      <p className="mt-3 text-sm text-zinc-600">
        {lastBackup
          ? `Последняя копия: ${formatDate(lastBackup)}`
          : "Копия ещё ни разу не сохранялась"}
      </p>

      {pending ? (
        <div className="animate-fade-in mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            Заменить все текущие данные копией от{" "}
            {formatDate(pending.createdAt.slice(0, 10))}? В копии операций:{" "}
            {pendingCount}. Текущие записи будут удалены.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleRestore}
              className={`${buttonClass} bg-amber-600 text-white hover:bg-amber-700`}
            >
              Заменить
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className={`${buttonClass} bg-white text-zinc-700 hover:bg-zinc-100`}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-700`}
          >
            Скачать копию
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className={`${buttonClass} bg-zinc-100 text-zinc-700 hover:bg-zinc-200`}
          >
            Загрузить
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
      />
      {message && (
        <p className={`mt-2 text-xs ${message.error ? "text-rose-600" : "text-emerald-600"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
