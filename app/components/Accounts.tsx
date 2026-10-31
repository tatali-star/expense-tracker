"use client";

import { useState } from "react";
import {
  ACCOUNT_KIND_LABELS,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  FOREIGN_CURRENCIES,
  type Account,
  type AccountKind,
  type Currency,
  type Entry,
  type Transfer,
  type Rates,
  type Settings,
  accountBalance,
  accountUsed,
  accountCurrency,
  formatDate,
  formatMoney,
  formatRate,
  parseAmount,
  rateOf,
} from "../lib/expenses";
import Segmented from "./Segmented";
import { inputClass } from "./SelectWithAdd";

type Props = {
  settings: Settings;
  entries: Entry[];
  transfers: Transfer[];
  ratesStatus: "idle" | "loading" | "error";
  onAdd: (account: Omit<Account, "id">) => void;
  onUpdate: (account: Account) => void;
  onDelete: (id: string) => void;
  onSaveRates: (rates: Rates) => void;
  onRefreshRates: () => void;
};

function KindIcon({ kind }: { kind: AccountKind }) {
  const common = "h-4 w-4";
  if (kind === "card")
    return (
      <svg viewBox="0 0 20 20" fill="none" className={common} aria-hidden>
        <rect
          x="2.5"
          y="4.5"
          width="15"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M2.5 8h15" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  if (kind === "account")
    return (
      <svg viewBox="0 0 20 20" fill="none" className={common} aria-hidden>
        <path
          d="M3 8l7-4 7 4M4.5 8.5v6M8.5 8.5v6M11.5 8.5v6M15.5 8.5v6M3 16h14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" fill="none" className={common} aria-hidden>
      <rect
        x="2.5"
        y="5.5"
        width="15"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function Accounts({
  settings,
  entries,
  transfers,
  ratesStatus,
  onAdd,
  onUpdate,
  onDelete,
  onSaveRates,
  onRefreshRates,
}: Props) {
  const { accounts, rates } = settings;
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [editingRates, setEditingRates] = useState(false);

  const balances = accounts.map((a) => {
    const currency = accountCurrency(a);
    const balance = accountBalance(a, entries, rates, transfers);
    return {
      account: a,
      currency,
      balance,
      rub: balance * rateOf(currency, rates),
    };
  });
  const total = balances.reduce((s, b) => s + b.rub, 0);
  const missingRate = balances.some(
    (b) => b.currency !== "RUB" && !rates[b.currency],
  );

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Счета и карты</h2>
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

      <p className="mt-3 text-xs text-zinc-400">
        Всего на счетах, в рублях по курсу
      </p>
      <p
        className={`text-xl font-semibold tabular-nums ${
          total < 0 ? "text-rose-600" : "text-zinc-900"
        }`}
      >
        {formatMoney(total)}
      </p>
      {missingRate && (
        <p className="mt-1 text-xs text-amber-600">
          Курс не задан — валютные счета не учтены в итоге
        </p>
      )}

      {editing === "new" && (
        <AccountForm
          initial={null}
          accounts={accounts}
          locked={false}
          onCancel={() => setEditing(null)}
          onSave={(a) => {
            onAdd(a);
            setEditing(null);
          }}
        />
      )}

      {accounts.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          Добавьте первый счёт
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100">
          {balances.map(({ account, currency, balance, rub }) => {
            const used = accountUsed(account.id, entries, transfers);
            if (
              editing !== null &&
              editing !== "new" &&
              editing.id === account.id
            ) {
              return (
                <li key={account.id} className="py-2">
                  <AccountForm
                    initial={account}
                    accounts={accounts}
                    locked={used}
                    onCancel={() => setEditing(null)}
                    onDelete={used ? undefined : () => onDelete(account.id)}
                    onSave={(a) => {
                      onUpdate({ ...a, id: account.id });
                      setEditing(null);
                    }}
                  />
                </li>
              );
            }
            return (
              <li key={account.id} className="animate-fade-in">
                <button
                  type="button"
                  onClick={() => setEditing(account)}
                  title="Изменить счёт"
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-zinc-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                    {currency === "RUB" ? (
                      <KindIcon kind={account.kind} />
                    ) : (
                      <span className="text-xs font-semibold">
                        {currency === "USDT" ? "₮" : CURRENCY_SYMBOLS[currency]}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-900">
                      {account.name}
                    </span>
                    {account.name !== ACCOUNT_KIND_LABELS[account.kind] && (
                      <span className="block text-xs text-zinc-400">
                        {ACCOUNT_KIND_LABELS[account.kind]}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block text-sm font-medium tabular-nums ${
                        balance < 0 ? "text-rose-600" : "text-zinc-900"
                      }`}
                    >
                      {formatMoney(balance, currency)}
                    </span>
                    {currency !== "RUB" && rates[currency] > 0 && (
                      <span className="block text-xs tabular-nums text-zinc-400">
                        ≈ {formatMoney(rub)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 rounded-xl bg-zinc-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-500">
            {settings.ratesManual
              ? "Курсы заданы вручную"
              : settings.ratesDate
                ? `Курсы ЦБ на ${formatDate(settings.ratesDate)}`
                : "Курсы валют"}
          </p>
          {!editingRates && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={onRefreshRates}
                disabled={ratesStatus === "loading"}
                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:bg-white hover:text-zinc-900 disabled:opacity-50"
              >
                {ratesStatus === "loading" ? "Загрузка…" : "Обновить по ЦБ"}
              </button>
              <button
                type="button"
                onClick={() => setEditingRates(true)}
                className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:bg-white hover:text-zinc-900"
              >
                Изменить
              </button>
            </div>
          )}
        </div>
        {ratesStatus === "error" && (
          <p className="mt-1 text-xs text-rose-600">
            Не удалось получить курсы ЦБ — задайте вручную
          </p>
        )}
        {editingRates ? (
          <RatesForm
            rates={rates}
            onCancel={() => setEditingRates(false)}
            onSave={(r) => {
              onSaveRates(r);
              setEditingRates(false);
            }}
          />
        ) : (
          <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
            {FOREIGN_CURRENCIES.map((c) => (
              <li key={c} className="rounded-lg bg-white px-2 py-1.5">
                <span className="block text-xs text-zinc-400">
                  1 {CURRENCY_SYMBOLS[c]}
                </span>
                <span className="block text-sm font-medium tabular-nums text-zinc-900">
                  {rates[c] ? `${formatRate(rates[c])} ₽` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

type FormProps = {
  initial: Account | null;
  accounts: Account[];
  /** По счёту есть операции — валюту менять нельзя, иначе суммы потеряют смысл. */
  locked: boolean;
  onSave: (account: Omit<Account, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

function AccountForm({
  initial,
  accounts,
  locked,
  onSave,
  onCancel,
  onDelete,
}: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? "card");
  const [currency, setCurrency] = useState<Currency>(
    accountCurrency(initial ?? undefined),
  );
  const [start, setStart] = useState(
    initial?.initial ? String(initial.initial).replace(".", ",") : "",
  );
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Введите название");
    if (
      accounts.some(
        (a) =>
          a.id !== initial?.id &&
          a.name.toLowerCase() === trimmed.toLowerCase(),
      )
    )
      return setError("Такой счёт уже есть");
    const value = start.trim() ? parseAmount(start) : 0;
    if (Number.isNaN(value)) return setError("Неверный остаток");
    onSave({ name: trimmed, kind, currency, initial: value });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-in mt-3 space-y-2.5 rounded-xl bg-zinc-50 p-3"
    >
      <input
        autoFocus
        type="text"
        placeholder="Название, например Тинькофф"
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
      />
      <Segmented
        value={kind}
        onChange={setKind}
        options={(Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map(
          (k) => ({
            value: k,
            label: ACCOUNT_KIND_LABELS[k],
          }),
        )}
      />
      <div className={locked ? "pointer-events-none opacity-50" : ""}>
        <Segmented
          value={currency}
          onChange={setCurrency}
          options={CURRENCIES.map((c) => ({
            value: c,
            label: CURRENCY_SYMBOLS[c],
          }))}
        />
      </div>
      {locked && (
        <p className="text-xs text-zinc-400">
          По счёту есть операции — валюту изменить нельзя
        </p>
      )}
      <input
        type="text"
        inputMode="decimal"
        placeholder={`Начальный остаток, ${CURRENCY_SYMBOLS[currency]}`}
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className={inputClass}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          {initial ? "Сохранить" : "Добавить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white py-2 text-sm font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
        >
          Отмена
        </button>
      </div>
      {initial && (
        <button
          type="button"
          onClick={onDelete}
          disabled={!onDelete}
          title={
            onDelete ? undefined : "По счёту есть операции — сначала удалите их"
          }
          className="w-full rounded-xl py-1.5 text-xs text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
        >
          {onDelete ? "Удалить счёт" : "Счёт с операциями удалить нельзя"}
        </button>
      )}
    </form>
  );
}

function RatesForm({
  rates,
  onSave,
  onCancel,
}: {
  rates: Rates;
  onSave: (rates: Rates) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FOREIGN_CURRENCIES.map((c) => [
        c,
        rates[c] ? String(rates[c]).replace(".", ",") : "",
      ]),
    ),
  );
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = { ...rates };
    for (const c of FOREIGN_CURRENCIES) {
      const value = draft[c].trim() ? parseAmount(draft[c], 4) : 0;
      if (Number.isNaN(value) || value < 0)
        return setError(`Неверный курс ${c}`);
      next[c] = value;
    }
    onSave(next);
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in mt-2 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {FOREIGN_CURRENCIES.map((c) => (
          <label key={c} className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">
              1 {CURRENCY_SYMBOLS[c]}, ₽
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={draft[c]}
              onChange={(e) => setDraft({ ...draft, [c]: e.target.value })}
              className={`${inputClass} px-2 py-1.5`}
            />
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-white py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
