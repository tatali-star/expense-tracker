"use client";

import { useState } from "react";

export const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100";

const NEW = "__new__";

type Props = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  /** Создаёт элемент и возвращает его value для выбора. */
  onCreate: (name: string) => string;
  addLabel: string;
  placeholder: string;
};

export default function SelectWithAdd({
  label,
  value,
  options,
  onChange,
  onCreate,
  addLabel,
  placeholder,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const name = draft.trim();
    if (!name) return;
    onChange(onCreate(name));
    setDraft("");
    setAdding(false);
  }

  function cancel() {
    setDraft("");
    setAdding(false);
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {adding ? (
        <div className="animate-fade-in flex gap-2">
          <input
            autoFocus
            type="text"
            value={draft}
            placeholder={placeholder}
            maxLength={40}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                cancel();
              }
            }}
            className={inputClass}
          />
          <button
            type="button"
            onClick={commit}
            aria-label="Сохранить"
            className="shrink-0 rounded-xl bg-zinc-900 px-3 text-sm text-white transition hover:bg-zinc-700"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={cancel}
            aria-label="Отмена"
            className="shrink-0 rounded-xl bg-zinc-100 px-3 text-sm text-zinc-600 transition hover:bg-zinc-200"
          >
            ✕
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => (e.target.value === NEW ? setAdding(true) : onChange(e.target.value))}
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value={NEW}>{addLabel}</option>
        </select>
      )}
    </label>
  );
}
