"use client";

import { useState } from "react";
import {
  type Entry,
  type Frequency,
  type Recurring,
  type Settings,
  CURRENCY_SYMBOLS,
  accountCurrency,
  categoryStyle,
  dueDate,
  formatMoney,
  isDueInMonth,
  parseAmount,
  plannedAmount,
  rateOf,
  toRub,
  paymentsLeft,
  todayISO,
} from "../lib/expenses";
import Segmented from "./Segmented";
import SelectWithAdd, { inputClass } from "./SelectWithAdd";

type Props = {
  items: Recurring[];
  entries: Entry[];
  settings: Settings;
  month: string; // YYYY-MM
  onSave: (item: Recurring) => void;
  onDelete: (id: string) => void;
  onPay: (item: Recurring, amount: number) => void;
  onUnpay: (item: Recurring) => void;
  onAddCategory: (name: string) => string;
  /** Точная сумма на месяц; null — вернуть обычную. */
  onSetMonthAmount: (
    item: Recurring,
    month: string,
    amount: number | null,
  ) => void;
  onUpdateEntry: (entry: Entry) => void;
};

function monthName(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("ru-RU", { month: "long" });
}

const TEMPLATES = [
  { label: "Кредит", category: "Кредиты" },
  { label: "Ипотека", category: "Ипотека" },
  { label: "Коммуналка", category: "Коммуналка" },
  { label: "Интернет", category: "Интернет" },
  { label: "Телефония", category: "Телефония" },
  { label: "Подписка", category: "Подписки" },
];

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export default function RecurringPayments({
  items,
  entries,
  settings,
  month,
  onSave,
  onDelete,
  onPay,
  onUnpay,
  onAddCategory,
  onSetMonthAmount,
  onUpdateEntry,
}: Props) {
  const [editing, setEditing] = useState<Recurring | "new" | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  // правка суммы за месяц (до оплаты) или суммы уже сделанной оплаты
  const [amountEditId, setAmountEditId] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState("");

  const today = todayISO();
  const due = items
    .filter((r) => isDueInMonth(r, month))
    .map((r) => {
      const paidEntries = entries.filter(
        (e) => e.recurringId === r.id && e.date.startsWith(month),
      );
      const date = dueDate(r, month);
      const daysLeft = Math.round(
        (new Date(date).getTime() - new Date(today).getTime()) / 86_400_000,
      );
      const currency = accountCurrency(
        settings.accounts.find((a) => a.id === r.accountId),
      );
      return {
        r,
        date,
        currency,
        paidEntries,
        paid: paidEntries.length > 0,
        amount: plannedAmount(r, month),
        overridden: r.overrides?.[month] !== undefined,
        paidAmount: paidEntries.reduce((s, e) => s + e.amount, 0),
        // итоги блока — в рублях: оплаченное по курсу дня оплаты, остальное по текущему
        paidRub: paidEntries.reduce((s, e) => s + toRub(e), 0),
        plannedRub: plannedAmount(r, month) * rateOf(currency, settings.rates),
        daysLeft,
      };
    })
    .sort(
      (a, b) => Number(a.paid) - Number(b.paid) || a.date.localeCompare(b.date),
    );

  const planned = due.reduce(
    (s, d) => s + (d.paid ? d.paidRub : d.plannedRub),
    0,
  );
  const paid = due.reduce((s, d) => s + d.paidRub, 0);
  const inactive = items.filter((r) => !isDueInMonth(r, month));
  const accountName = (id: string) =>
    settings.accounts.find((a) => a.id === id)?.name ?? "Удалённый счёт";

  function startPay(r: Recurring) {
    setAmountEditId(null);
    setPayingId(r.id);
    setPayAmount(String(plannedAmount(r, month)).replace(".", ","));
  }

  function startAmountEdit(id: string, value: number) {
    setPayingId(null);
    setAmountEditId(id);
    setAmountDraft(String(value).replace(".", ","));
  }

  function confirmAmountEdit(r: Recurring, paidEntries: Entry[]) {
    const value = parseAmount(amountDraft);
    if (!(value > 0)) return;
    if (paidEntries.length === 1)
      onUpdateEntry({ ...paidEntries[0], amount: value });
    else onSetMonthAmount(r, month, value === r.amount ? null : value);
    setAmountEditId(null);
  }

  function confirmPay(r: Recurring) {
    const value = parseAmount(payAmount);
    if (!(value > 0)) return;
    onPay(r, value);
    setPayingId(null);
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900">
          Обязательные платежи
        </h2>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            + Добавить
          </button>
        )}
      </div>

      {due.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-zinc-500">
            <span className="whitespace-nowrap">
              Оплачено {formatMoney(paid)} из {formatMoney(planned)}
            </span>
            <span className="whitespace-nowrap">
              Осталось{" "}
              <span className="font-medium text-zinc-900">
                {formatMoney(Math.max(planned - paid, 0))}
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
              style={{ width: `${planned > 0 ? (paid / planned) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {editing !== null && (
        <RecurringForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          settings={settings}
          month={month}
          onAddCategory={onAddCategory}
          onCancel={() => setEditing(null)}
          onSave={(item) => {
            onSave(item);
            setEditing(null);
          }}
        />
      )}

      {items.length === 0 && editing === null ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          Добавьте кредиты, коммуналку, подписки — и здесь появится план
          платежей на месяц
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100">
          {due.length === 0 && items.length > 0 && (
            <li className="py-4 text-center text-sm text-zinc-400">
              В этом месяце платежей нет
            </li>
          )}
          {due.map(
            ({
              r,
              date,
              currency,
              paidEntries,
              paid,
              paidAmount,
              amount,
              overridden,
              daysLeft,
            }) => {
              // оплату из нескольких записей правят в списке операций
              const canEditAmount = !paid || paidEntries.length === 1;
              const approx = !paid && r.variable && !overridden;
              const left = paymentsLeft(r, month);
              const overdue = !paid && daysLeft < 0;
              const soon = !paid && daysLeft >= 0 && daysLeft <= 3;
              return (
                <li
                  key={r.id}
                  className={`animate-fade-in group py-3 transition-opacity ${paid ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${categoryStyle(r.category).dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm text-zinc-900 ${paid ? "line-through" : ""}`}
                      >
                        {r.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        <span
                          className={
                            overdue
                              ? "font-medium text-rose-600"
                              : soon
                                ? "font-medium text-amber-600"
                                : ""
                          }
                        >
                          {paid
                            ? "оплачено"
                            : overdue
                              ? `просрочено, ${Number(date.slice(8))} число`
                              : daysLeft === 0
                                ? "сегодня"
                                : daysLeft === 1
                                  ? "завтра"
                                  : soon
                                    ? `через ${daysLeft} ${plural(daysLeft, "день", "дня", "дней")}`
                                    : `до ${Number(date.slice(8))} числа`}
                        </span>
                        {" · "}
                        {accountName(r.accountId)}
                        {left !== null &&
                          ` · ещё ${left} ${plural(left, "платёж", "платежа", "платежей")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!canEditAmount}
                      onClick={() =>
                        startAmountEdit(r.id, paid ? paidAmount : amount)
                      }
                      title={
                        paid
                          ? "Исправить сумму оплаты"
                          : `Указать сумму за ${monthName(month)}`
                      }
                      className="shrink-0 rounded-md px-1 text-right tabular-nums transition enabled:hover:bg-zinc-100 disabled:cursor-default"
                    >
                      <span
                        className={`block border-b border-dashed text-sm font-semibold ${
                          approx
                            ? "border-zinc-300 text-zinc-500"
                            : "border-transparent text-zinc-900"
                        } ${canEditAmount ? "group-hover:border-zinc-300" : ""}`}
                      >
                        {approx && "≈ "}
                        {formatMoney(paid ? paidAmount : amount, currency)}
                      </span>
                      {!paid && overridden && (
                        <span className="block text-[11px] text-zinc-400">
                          обычно {formatMoney(r.amount, currency)}
                        </span>
                      )}
                    </button>
                    {paid ? (
                      <button
                        type="button"
                        onClick={() => onUnpay(r)}
                        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        Отменить
                      </button>
                    ) : (
                      payingId !== r.id && (
                        <button
                          type="button"
                          onClick={() => startPay(r)}
                          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700"
                        >
                          Оплатить
                        </button>
                      )
                    )}
                  </div>

                  {amountEditId === r.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        confirmAmountEdit(r, paidEntries);
                      }}
                      onKeyDown={(e) =>
                        e.key === "Escape" && setAmountEditId(null)
                      }
                      className="animate-fade-in mt-2 pl-5"
                    >
                      <p className="mb-1.5 text-xs text-zinc-500">
                        {paid
                          ? "Исправить сумму оплаты"
                          : `Сумма за ${monthName(month)} — например, по квитанции`}
                      </p>
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          value={amountDraft}
                          onChange={(e) => setAmountDraft(e.target.value)}
                          aria-label={paid ? "Сумма оплаты" : "Сумма за месяц"}
                          className={`${inputClass} py-1.5`}
                        />
                        <button
                          type="submit"
                          className="shrink-0 rounded-xl bg-zinc-900 px-3 text-xs font-medium text-white transition hover:bg-zinc-700"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => setAmountEditId(null)}
                          aria-label="Отмена"
                          className="shrink-0 rounded-xl bg-zinc-100 px-3 text-sm text-zinc-600 transition hover:bg-zinc-200"
                        >
                          ✕
                        </button>
                      </div>
                      {!paid && overridden && (
                        <button
                          type="button"
                          onClick={() => {
                            onSetMonthAmount(r, month, null);
                            setAmountEditId(null);
                          }}
                          className="mt-1.5 text-xs text-zinc-400 transition hover:text-zinc-900"
                        >
                          Вернуть обычную сумму (
                          {formatMoney(r.amount, currency)})
                        </button>
                      )}
                    </form>
                  )}

                  {payingId === r.id && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        confirmPay(r);
                      }}
                      className="animate-fade-in mt-2 flex gap-2 pl-5"
                    >
                      <input
                        autoFocus
                        type="text"
                        inputMode="decimal"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        aria-label="Сумма оплаты"
                        className={`${inputClass} py-1.5`}
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-500"
                      >
                        Списать с «{accountName(r.accountId)}»
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayingId(null)}
                        aria-label="Отмена"
                        className="shrink-0 rounded-xl bg-zinc-100 px-3 text-sm text-zinc-600 transition hover:bg-zinc-200"
                      >
                        ✕
                      </button>
                    </form>
                  )}

                  <div className="mt-1 flex gap-3 pl-5 text-xs sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="text-zinc-400 transition hover:text-zinc-900"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      className="text-zinc-400 transition hover:text-rose-600"
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              );
            },
          )}
        </ul>
      )}

      {inactive.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-zinc-400 transition hover:text-zinc-600">
            Не в этом месяце: {inactive.length}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {inactive.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-zinc-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${categoryStyle(r.category).dot}`}
                />
                <span className="flex-1 truncate">{r.name}</span>
                <span className="tabular-nums">
                  {formatMoney(
                    r.amount,
                    accountCurrency(
                      settings.accounts.find((a) => a.id === r.accountId),
                    ),
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(r)}
                  className="text-xs text-zinc-400 transition hover:text-zinc-900"
                >
                  Изменить
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

type FormProps = {
  initial: Recurring | null;
  settings: Settings;
  month: string;
  onSave: (item: Recurring) => void;
  onCancel: () => void;
  onAddCategory: (name: string) => string;
};

function RecurringForm({
  initial,
  settings,
  month,
  onSave,
  onCancel,
  onAddCategory,
}: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount).replace(".", ",") : "",
  );
  const [category, setCategory] = useState(initial?.category ?? "Коммуналка");
  const [accountId, setAccountId] = useState(
    initial?.accountId ?? settings.accounts[0]?.id ?? "",
  );
  const [day, setDay] = useState(String(initial?.day ?? 10));
  const [frequency, setFrequency] = useState<Frequency>(
    initial?.frequency ?? "monthly",
  );
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? month);
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? "");
  const [variable, setVariable] = useState(initial?.variable ?? false);
  const [error, setError] = useState("");

  const categories = settings.categories.expense;
  const effectiveCategory = categories.includes(category)
    ? category
    : (categories[0] ?? "");

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setCategory(findOrFirst(t.category));
    if (!name.trim()) setName(t.label);
    if (t.category === "Подписки") setEndMonth("");
    setVariable(t.category === "Коммуналка");
  }

  function findOrFirst(c: string) {
    return categories.includes(c) ? c : onAddCategory(c);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = parseAmount(amount);
    const dayNum = Number(day);
    if (!name.trim()) return setError("Введите название");
    if (!(value > 0)) return setError("Введите сумму больше нуля");
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31)
      return setError("Число — от 1 до 31");
    if (!accountId) return setError("Выберите счёт");
    if (!startMonth) return setError("Укажите первый платёж");
    if (endMonth && endMonth < startMonth)
      return setError("Последний платёж раньше первого");
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      amount: value,
      category: effectiveCategory,
      accountId,
      day: dayNum,
      frequency,
      startMonth,
      ...(endMonth ? { endMonth } : {}),
      ...(variable ? { variable } : {}),
      ...(initial?.overrides ? { overrides: initial.overrides } : {}),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-in mt-4 rounded-xl bg-zinc-50 p-4"
    >
      {!initial && (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => applyTemplate(t)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${
                effectiveCategory === t.category
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Название</span>
          <input
            type="text"
            value={name}
            maxLength={60}
            placeholder="Например, Ипотека ВТБ"
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            {variable ? "Примерная сумма" : "Сумма"},{" "}
            {
              CURRENCY_SYMBOLS[
                accountCurrency(
                  settings.accounts.find((a) => a.id === accountId),
                )
              ]
            }
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </label>
        <SelectWithAdd
          label="Категория"
          value={effectiveCategory}
          onChange={setCategory}
          options={categories.map((c) => ({ value: c, label: c }))}
          onCreate={onAddCategory}
          addLabel="+ Новая категория…"
          placeholder="Название категории"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Списывать с</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={inputClass}
          >
            {settings.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            Периодичность
          </span>
          <Segmented
            value={frequency}
            onChange={setFrequency}
            options={[
              { value: "monthly", label: "Ежемесячно" },
              { value: "yearly", label: "Ежегодно" },
            ]}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            Число месяца
          </span>
          <input
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            {frequency === "yearly"
              ? "Первый платёж (месяц повторяется)"
              : "Первый платёж"}
          </span>
          <input
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            Последний платёж (для кредитов)
          </span>
          <input
            type="month"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={variable}
          onChange={(e) => setVariable(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-900"
        />
        <span>
          Сумма меняется каждый месяц
          <span className="block text-xs text-zinc-400">
            В плане будет «≈ сумма», пока не укажете точную за месяц
          </span>
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 sm:flex-none sm:px-5"
        >
          {initial ? "Сохранить" : "Добавить платёж"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white py-2.5 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-100 sm:flex-none sm:px-5"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
