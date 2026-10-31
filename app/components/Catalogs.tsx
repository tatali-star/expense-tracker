"use client";

import { useState } from "react";
import { type Settings, categoryStyle, findName } from "../lib/expenses";
import Segmented from "./Segmented";
import { inputClass } from "./SelectWithAdd";

type Tab = "expense" | "income" | "sources";

type Props = {
  settings: Settings;
  onAdd: (tab: Tab, name: string) => void;
  onDelete: (tab: Tab, name: string) => void;
};

const PLACEHOLDERS: Record<Tab, string> = {
  expense: "Новая категория расхода",
  income: "Новая категория дохода",
  sources: "Новый источник поступлений",
};

export default function Catalogs({ settings, onAdd, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>("expense");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const items = tab === "sources" ? settings.sources : settings.categories[tab];
  // в категориях должен остаться хотя бы один пункт, иначе нечего выбрать в форме
  const canDelete = tab === "sources" || items.length > 1;

  function handleTab(next: Tab) {
    setTab(next);
    setError("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (findName(items, name)) return setError("Уже есть в списке");
    onAdd(tab, name);
    setDraft("");
    setError("");
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">Справочники</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Удаление не затрагивает уже сохранённые операции
      </p>

      <Segmented
        className="mt-4"
        value={tab}
        onChange={handleTab}
        options={[
          { value: "expense", label: "Расходы" },
          { value: "income", label: "Доходы" },
          { value: "sources", label: "Источники" },
        ]}
      />

      <ul key={tab} className="animate-fade-in mt-4 flex flex-wrap gap-2">
        {items.length === 0 && <li className="text-sm text-zinc-400">Список пуст</li>}
        {items.map((name) => (
          <li
            key={name}
            className={`flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm ${categoryStyle(name).badge}`}
          >
            {name}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(tab, name)}
                aria-label={`Удалить «${name}»`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs opacity-50 transition hover:bg-black/10 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={draft}
          maxLength={40}
          placeholder={PLACEHOLDERS[tab]}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          className={inputClass}
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Добавить
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </section>
  );
}
