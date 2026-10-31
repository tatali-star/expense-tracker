"use client";

import { useState } from "react";
import {
  type Entry,
  type Settings,
  TYPE_LABELS,
  categoryStyle,
  formatMoney,
  sumBy,
  toRub,
} from "../lib/expenses";
import Segmented from "./Segmented";

type Breakdown = "expense" | "income" | "sources";

const NO_SOURCE = "Без источника";

type Props = {
  entries: Entry[];
  settings: Settings;
  month: string; // YYYY-MM
  onMonthChange: (month: string) => void;
};

export default function Summary({ entries, settings, month, onMonthChange }: Props) {
  const [breakdown, setBreakdown] = useState<Breakdown>("expense");

  const monthEntries = entries.filter((e) => e.date.startsWith(month));
  const income = sumBy(monthEntries, "income");
  const expense = sumBy(monthEntries, "expense");
  const balance = income - expense;

  const breakdownType = breakdown === "expense" ? "expense" : "income";
  const breakdownTotal = breakdownType === "income" ? income : expense;
  const typed = monthEntries.filter((e) => e.type === breakdownType);
  const keyOf = (e: Entry) => (breakdown === "sources" ? (e.source ?? NO_SOURCE) : e.category);
  // справочник плюс значения из операций (на случай, если пункт уже удалён)
  const names = [
    ...new Set([
      ...(breakdown === "sources" ? settings.sources : settings.categories[breakdown]),
      ...typed.map(keyOf),
    ]),
  ];
  const byCategory = names.map((category) => ({
    category,
    sum: typed.filter((e) => keyOf(e) === category).reduce((s, e) => s + toRub(e), 0),
  }));

  const [y, m] = month.split("-").map(Number);
  const rawLabel = new Date(y, m - 1, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  function shift(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Предыдущий месяц"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-zinc-600">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Следующий месяц"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          ›
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Баланс за месяц
        </p>
        <p
          className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight transition-colors ${
            balance > 0 ? "text-emerald-600" : balance < 0 ? "text-rose-600" : "text-zinc-900"
          }`}
        >
          {balance > 0 ? "+" : ""}
          {formatMoney(balance)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-50/70 px-3 py-2.5">
          <p className="text-xs text-emerald-700">Доходы</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700">
            {formatMoney(income)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
          <p className="text-xs text-zinc-500">Расходы</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
            {formatMoney(expense)}
          </p>
        </div>
      </div>

      <Segmented
        className="mt-6"
        value={breakdown}
        onChange={setBreakdown}
        options={[
          { value: "expense", label: TYPE_LABELS.expense.many },
          { value: "income", label: TYPE_LABELS.income.many },
          { value: "sources", label: "Источники" },
        ]}
      />

      <ul key={breakdown} className="animate-fade-in mt-4 space-y-3.5">
        {byCategory.length === 0 && (
          <li className="text-sm text-zinc-400">Нет данных</li>
        )}
        {byCategory.map(({ category, sum }) => {
          const pct = breakdownTotal > 0 ? (sum / breakdownTotal) * 100 : 0;
          return (
            <li key={category}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-zinc-700">
                  <span className={`h-2 w-2 rounded-full ${categoryStyle(category).dot}`} />
                  {category}
                </span>
                <span className="tabular-nums text-zinc-900">{formatMoney(sum)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${categoryStyle(category).bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
