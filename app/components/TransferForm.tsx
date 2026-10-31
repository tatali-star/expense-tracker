"use client";

import { useState } from "react";
import {
  CURRENCY_SYMBOLS,
  type Settings,
  type Transfer,
  accountCurrency,
  accountLabel,
  formatRate,
  parseAmount,
  rateOf,
  todayISO,
} from "../lib/expenses";
import { inputClass } from "./SelectWithAdd";

type Props = {
  settings: Settings;
  initial?: Transfer;
  onSave: (transfer: Omit<Transfer, "id">) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  /** Внутри списка операций — компактный вид с серым фоном. */
  inline?: boolean;
};

const fmt = (n: number) =>
  Number.isFinite(n) && n > 0 ? String(n).replace(".", ",") : "";

export default function TransferForm({
  settings,
  initial,
  onSave,
  onCancel,
  onDelete,
  inline,
}: Props) {
  const accounts = settings.accounts;
  const [fromId, setFromId] = useState(
    initial?.fromId ?? accounts[0]?.id ?? "",
  );
  const [toId, setToId] = useState(
    initial?.toId ?? accounts[1]?.id ?? accounts[0]?.id ?? "",
  );
  const [amountFrom, setAmountFrom] = useState(
    initial ? fmt(initial.amountFrom) : "",
  );
  // сумма зачисления считается по курсу, пока пользователь не ввёл её сам
  const [amountTo, setAmountTo] = useState(
    initial ? fmt(initial.amountTo) : "",
  );
  const [toTouched, setToTouched] = useState(Boolean(initial));
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState("");

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  const fromCur = accountCurrency(from);
  const toCur = accountCurrency(to);
  const exchange = fromCur !== toCur;

  const fromValue = parseAmount(amountFrom);
  const fromRate = rateOf(fromCur, settings.rates);
  const toRate = rateOf(toCur, settings.rates);
  const autoTo =
    fromValue > 0 && fromRate && toRate
      ? Math.round(((fromValue * fromRate) / toRate) * 100) / 100
      : NaN;
  const shownTo = toTouched ? amountTo : fmt(autoTo);
  const toValue = exchange ? parseAmount(shownTo) : fromValue;

  function swap() {
    setFromId(toId);
    setToId(fromId);
    if (exchange && toTouched) {
      setAmountFrom(amountTo);
      setAmountTo(amountFrom);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!from || !to) return setError("Выберите счета");
    if (fromId === toId)
      return setError("Счета списания и зачисления совпадают");
    if (!(fromValue > 0)) return setError("Введите сумму больше нуля");
    if (!(toValue > 0)) return setError("Введите сумму зачисления");
    if (!date) return setError("Укажите дату");
    onSave({
      fromId,
      toId,
      amountFrom: fromValue,
      amountTo: toValue,
      date,
      description: description.trim(),
    });
    if (!initial) {
      setAmountFrom("");
      setAmountTo("");
      setToTouched(false);
      setDescription("");
    }
    setError("");
  }

  const accountOptions = accounts.map((a) => (
    <option key={a.id} value={a.id}>
      {accountLabel(a)}
    </option>
  ));

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => onCancel && e.key === "Escape" && onCancel()}
      className={
        inline
          ? "animate-fade-in my-2 rounded-xl bg-zinc-50 p-4"
          : "animate-fade-in"
      }
    >
      {inline && (
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Изменить перевод
        </p>
      )}

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Откуда</span>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className={inputClass}
          >
            {accountOptions}
          </select>
        </label>
        <button
          type="button"
          onClick={swap}
          title="Поменять местами"
          aria-label="Поменять счета местами"
          className="flex h-10 w-10 items-center justify-center self-center justify-self-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 sm:self-end"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 rotate-90 sm:rotate-0"
            aria-hidden
          >
            <path
              d="M4 7h12m0 0l-3-3m3 3l-3 3M16 13H4m0 0l3-3m-3 3l3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Куда</span>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className={inputClass}
          >
            {accountOptions}
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            {exchange ? "Списано" : "Сумма"}, {CURRENCY_SYMBOLS[fromCur]}
          </span>
          <input
            autoFocus={inline}
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amountFrom}
            onChange={(e) => setAmountFrom(e.target.value)}
            className={inputClass}
          />
        </label>

        {exchange && (
          <label className="animate-fade-in flex flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-500">
              Зачислено, {CURRENCY_SYMBOLS[toCur]}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={shownTo}
              onChange={(e) => {
                setToTouched(true);
                setAmountTo(e.target.value);
              }}
              className={inputClass}
            />
            <span className="text-xs text-zinc-400">
              {fromValue > 0 && toValue > 0
                ? `Курс обмена: 1 ${CURRENCY_SYMBOLS[fromCur === "RUB" ? toCur : fromCur]} = ${formatRate(
                    fromCur === "RUB"
                      ? fromValue / toValue
                      : toValue / fromValue,
                  )} ${CURRENCY_SYMBOLS[fromCur === "RUB" ? fromCur : toCur]}`
                : toTouched
                  ? ""
                  : "Посчитается по курсу — поправьте, если в банке другой"}
            </span>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Дата</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>

        <label
          className={`flex flex-col gap-1.5 ${exchange ? "" : "sm:col-span-2"}`}
        >
          <span className="text-xs font-medium text-zinc-500">Описание</span>
          <input
            type="text"
            placeholder="Например, пополнение карты"
            value={description}
            maxLength={120}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 text-sm text-rose-600" aria-live="polite">
          {error}
        </p>
        <div className="flex flex-wrap gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50"
            >
              Удалить
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-100 sm:flex-none"
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            className="flex-1 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 active:scale-[0.98] sm:flex-none"
          >
            {initial ? "Сохранить" : "Перевести"}
          </button>
        </div>
      </div>
    </form>
  );
}
