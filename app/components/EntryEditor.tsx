"use client";

import { useState } from "react";
import {
  CURRENCY_SYMBOLS,
  type Entry,
  type Settings,
  TYPE_LABELS,
  accountCurrency,
  formatMoney,
  parseAmount,
} from "../lib/expenses";
import { inputClass } from "./SelectWithAdd";

type Props = {
  entry: Entry;
  settings: Settings;
  onSave: (entry: Entry) => void;
  onCancel: () => void;
  onDelete: () => void;
};

const NO_SOURCE = "";

export default function EntryEditor({ entry, settings, onSave, onCancel, onDelete }: Props) {
  const [amount, setAmount] = useState(String(entry.amount).replace(".", ","));
  const [date, setDate] = useState(entry.date);
  const [category, setCategory] = useState(entry.category);
  const [accountId, setAccountId] = useState(entry.accountId);
  const [source, setSource] = useState(entry.source ?? NO_SOURCE);
  const [description, setDescription] = useState(entry.description);
  const [error, setError] = useState("");

  const isIncome = entry.type === "income";
  const currency = entry.currency ?? "RUB";

  // категория или источник могли быть удалены из справочника — оставляем их доступными
  const categories = [...new Set([...settings.categories[entry.type], entry.category])];
  const sources = [...new Set([...settings.sources, ...(entry.source ? [entry.source] : [])])];
  // счёт можно сменить только на счёт в той же валюте: сумма хранится в валюте счёта
  const accounts = settings.accounts.filter(
    (a) => accountCurrency(a) === currency || a.id === entry.accountId,
  );
  const accountMissing = !settings.accounts.some((a) => a.id === entry.accountId);

  const preview = parseAmount(amount);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!(value > 0)) return setError("Введите сумму больше нуля");
    if (!date) return setError("Укажите дату");
    const next: Entry = {
      ...entry,
      amount: value,
      date,
      category,
      accountId,
      description: description.trim(),
    };
    if (isIncome && source) next.source = source;
    else delete next.source;
    onSave(next);
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
      className="animate-fade-in my-2 rounded-xl bg-zinc-50 p-4"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
        Изменить {TYPE_LABELS[entry.type].one.toLowerCase()}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Сумма, {CURRENCY_SYMBOLS[currency]}</span>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
          {currency !== "RUB" && entry.rate && preview > 0 && (
            <span className="text-xs text-zinc-400">
              ≈ {formatMoney(preview * entry.rate)} по курсу на день записи
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Дата</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Категория</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            {isIncome ? "Зачислено на" : "Списано с"}
          </span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            {accountMissing && <option value={entry.accountId}>Удалённый счёт</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {isIncome && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-500">Источник</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
              <option value={NO_SOURCE}>Не указан</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={`flex flex-col gap-1.5 ${isIncome ? "" : "sm:col-span-2"}`}>
          <span className="text-xs font-medium text-zinc-500">Описание</span>
          <input
            type="text"
            value={description}
            maxLength={120}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 sm:flex-none"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-100 sm:flex-none"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-xl px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 sm:ml-auto sm:w-auto"
        >
          Удалить
        </button>
      </div>
    </form>
  );
}
