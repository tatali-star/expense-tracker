"use client";

import { useState } from "react";
import {
  type Entry,
  type EntryType,
  type Settings,
  type Transfer,
  TYPE_LABELS,
  accountCurrency,
  categoryStyle,
  formatDate,
  formatMoney,
  formatSigned,
  sumBy,
  toRub,
} from "../lib/expenses";
import EntryEditor from "./EntryEditor";
import Segmented from "./Segmented";
import TransferForm from "./TransferForm";

type Props = {
  entries: Entry[];
  transfers: Transfer[];
  settings: Settings;
  onDelete: (id: string) => void;
  onUpdate: (entry: Entry) => void;
  onDeleteTransfer: (id: string) => void;
  onUpdateTransfer: (transfer: Transfer) => void;
};

type TypeFilter = EntryType | "transfer" | "all";
type Row =
  { kind: "entry"; item: Entry } | { kind: "transfer"; item: Transfer };
const ALL = "Все";
const ALL_ACCOUNTS = "";
type SortOrder = "desc" | "asc";

const deleteIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
    <path
      d="M5 5l10 10M15 5L5 15"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export default function ExpenseList({
  entries,
  transfers,
  settings,
  onDelete,
  onUpdate,
  onDeleteTransfer,
  onUpdateTransfer,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [filter, setFilter] = useState(ALL);
  const [accountFilter, setAccountFilter] = useState(ALL_ACCOUNTS);
  const [sort, setSort] = useState<SortOrder>("desc");
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const visibleEntries =
    typeFilter === "transfer"
      ? []
      : entries
          .filter((e) => typeFilter === "all" || e.type === typeFilter)
          .filter((e) => filter === ALL || e.category === filter)
          .filter(
            (e) =>
              accountFilter === ALL_ACCOUNTS || e.accountId === accountFilter,
          );

  const visibleTransfers =
    typeFilter === "all" || typeFilter === "transfer"
      ? transfers.filter(
          (t) =>
            accountFilter === ALL_ACCOUNTS ||
            t.fromId === accountFilter ||
            t.toId === accountFilter,
        )
      : [];

  const rows: Row[] = [
    ...visibleEntries.map((item) => ({ kind: "entry" as const, item })),
    ...visibleTransfers.map((item) => ({ kind: "transfer" as const, item })),
  ].toSorted((a, b) => {
    const cmp = a.item.date.localeCompare(b.item.date);
    return sort === "desc" ? -cmp : cmp;
  });

  // переводы не доход и не расход — в итог не входят
  const visibleTotal =
    typeFilter === "expense" || typeFilter === "income"
      ? sumBy(visibleEntries, typeFilter)
      : sumBy(visibleEntries, "income") - sumBy(visibleEntries, "expense");

  function handleTypeFilter(next: TypeFilter) {
    setTypeFilter(next);
    setFilter(ALL);
  }

  // в чипах — справочник плюс категории, которые уже удалены, но остались в операциях
  const chipCategories =
    typeFilter === "expense" || typeFilter === "income"
      ? [
          ...new Set([
            ...settings.categories[typeFilter],
            ...entries
              .filter((e) => e.type === typeFilter)
              .map((e) => e.category),
          ]),
        ]
      : [];

  const findAccount = (id: string) =>
    settings.accounts.find((a) => a.id === id);
  const accountName = (id: string) => findAccount(id)?.name ?? "Удалённый счёт";

  function handleDelete(id: string, remove: (id: string) => void) {
    if (editingId === id) setEditingId(null);
    setRemoving((prev) => new Set(prev).add(id));
    // даём анимации исчезновения доиграть
    setTimeout(() => {
      remove(id);
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }

  let totalLabel =
    typeFilter === "expense" || typeFilter === "income"
      ? `Итого: ${TYPE_LABELS[typeFilter].many.toLowerCase()}`
      : "Баланс";
  if (filter !== ALL) totalLabel = `Итого: ${filter}`;

  const rowClass = (id: string) =>
    `animate-fade-in group flex items-center gap-3 py-3 transition-all duration-200 ${
      removing.has(id) ? "translate-x-4 opacity-0" : ""
    }`;
  const openButtonClass =
    "-my-1 -ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 pl-2 text-left transition hover:bg-zinc-50";
  const deleteButtonClass =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100";

  function renderEntry(e: Entry) {
    if (editingId === e.id)
      return (
        <li key={e.id}>
          <EntryEditor
            entry={e}
            settings={settings}
            onCancel={() => setEditingId(null)}
            onDelete={() => handleDelete(e.id, onDelete)}
            onSave={(next) => {
              onUpdate(next);
              setEditingId(null);
            }}
          />
        </li>
      );
    return (
      <li key={e.id} className={rowClass(e.id)}>
        <button
          type="button"
          onClick={() => setEditingId(e.id)}
          title="Изменить"
          className={openButtonClass}
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${categoryStyle(e.category).badge}`}
              >
                {e.category}
              </span>
              <span className="text-xs text-zinc-400">
                {e.recurringId && <span title="Обязательный платёж">↻ </span>}
                {formatDate(e.date)} ·{" "}
                {e.type === "income"
                  ? `${e.source ? `${e.source} → ` : ""}${accountName(e.accountId)}`
                  : accountName(e.accountId)}
              </span>
            </span>
            {e.description && (
              <span className="mt-1 block truncate text-sm text-zinc-700">
                {e.description}
              </span>
            )}
          </span>
          <span className="shrink-0 text-right">
            <span
              className={`block text-sm font-semibold tabular-nums ${
                e.type === "income" ? "text-emerald-600" : "text-zinc-900"
              }`}
            >
              {formatSigned(e.amount, e.type, e.currency)}
            </span>
            {e.currency && e.currency !== "RUB" && (
              <span className="block text-xs tabular-nums text-zinc-400">
                ≈ {formatMoney(toRub(e))}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleDelete(e.id, onDelete)}
          aria-label={`Удалить ${TYPE_LABELS[e.type].one.toLowerCase()}`}
          className={deleteButtonClass}
        >
          {deleteIcon}
        </button>
      </li>
    );
  }

  function renderTransfer(t: Transfer) {
    if (editingId === t.id)
      return (
        <li key={t.id}>
          <TransferForm
            inline
            initial={t}
            settings={settings}
            onCancel={() => setEditingId(null)}
            onDelete={() => handleDelete(t.id, onDeleteTransfer)}
            onSave={(next) => {
              onUpdateTransfer({ ...next, id: t.id });
              setEditingId(null);
            }}
          />
        </li>
      );
    const fromCur = accountCurrency(findAccount(t.fromId));
    const toCur = accountCurrency(findAccount(t.toId));
    return (
      <li key={t.id} className={rowClass(t.id)}>
        <button
          type="button"
          onClick={() => setEditingId(t.id)}
          title="Изменить"
          className={openButtonClass}
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                ⇄ Перевод
              </span>
              <span className="text-xs text-zinc-400">
                {formatDate(t.date)}
              </span>
            </span>
            <span className="mt-1 block truncate text-sm text-zinc-700">
              {accountName(t.fromId)} → {accountName(t.toId)}
              {t.description && (
                <span className="text-zinc-400"> · {t.description}</span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold tabular-nums text-sky-700">
              {formatMoney(t.amountFrom, fromCur)}
            </span>
            {fromCur !== toCur && (
              <span className="block text-xs tabular-nums text-zinc-400">
                → {formatMoney(t.amountTo, toCur)}
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleDelete(t.id, onDeleteTransfer)}
          aria-label="Удалить перевод"
          className={deleteButtonClass}
        >
          {deleteIcon}
        </button>
      </li>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900">Операции</h2>
        <div className="flex items-center gap-1">
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            aria-label="Фильтр по счёту"
            className="max-w-40 truncate rounded-lg bg-transparent px-1.5 py-1.5 text-xs font-medium text-zinc-500 outline-none transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <option value={ALL_ACCOUNTS}>Все счета</option>
            {settings.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            {sort === "desc" ? "Сначала новые ↓" : "Сначала старые ↑"}
          </button>
        </div>
      </div>

      <Segmented
        className="mt-4"
        compact
        value={typeFilter}
        onChange={handleTypeFilter}
        options={[
          { value: "all", label: "Все" },
          { value: "expense", label: TYPE_LABELS.expense.many },
          { value: "income", label: TYPE_LABELS.income.many },
          { value: "transfer", label: "Переводы" },
        ]}
      />

      {chipCategories.length > 0 && (
        <div className="animate-fade-in -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {[ALL, ...chipCategories].map((c) => {
            const active = filter === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-400">
          {entries.length === 0 && transfers.length === 0
            ? "Пока нет ни одной записи"
            : "Здесь пока пусто"}
        </p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-zinc-100">
            {rows.map((r) =>
              r.kind === "entry" ? renderEntry(r.item) : renderTransfer(r.item),
            )}
          </ul>
          {typeFilter !== "transfer" && (
            <div className="mt-2 flex justify-between border-t border-zinc-100 pt-3 text-sm">
              <span className="text-zinc-500">{totalLabel}</span>
              <span
                className={`font-semibold tabular-nums ${
                  typeFilter === "income" ||
                  (typeFilter === "all" && visibleTotal > 0)
                    ? "text-emerald-600"
                    : typeFilter === "all" && visibleTotal < 0
                      ? "text-rose-600"
                      : "text-zinc-900"
                }`}
              >
                {typeFilter === "all" && visibleTotal > 0 ? "+" : ""}
                {formatMoney(visibleTotal)}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
