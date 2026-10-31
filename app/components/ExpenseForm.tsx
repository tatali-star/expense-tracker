"use client";

import { useState } from "react";
import {
  CURRENCY_SYMBOLS,
  accountCurrency,
  formatMoney,
  formatRate,
  type Entry,
  type EntryType,
  type Settings,
  type Transfer,
  TYPE_LABELS,
  accountLabel,
  parseAmount,
  todayISO,
} from "../lib/expenses";
import Segmented from "./Segmented";
import SelectWithAdd, { inputClass } from "./SelectWithAdd";
import TransferForm from "./TransferForm";

type Props = {
  settings: Settings;
  onAdd: (entry: Omit<Entry, "id">) => void;
  onAddCategory: (type: EntryType, name: string) => string;
  onAddSource: (name: string) => string;
  onAddAccount: (name: string) => string;
  onAddTransfer: (transfer: Omit<Transfer, "id">) => void;
};

type Mode = EntryType | "transfer";

const NO_SOURCE = "";

export default function ExpenseForm({
  settings,
  onAdd,
  onAddCategory,
  onAddSource,
  onAddAccount,
  onAddTransfer,
}: Props) {
  const [mode, setMode] = useState<Mode>("expense");
  const type: EntryType = mode === "transfer" ? "expense" : mode;
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(
    settings.categories.expense[0] ?? "",
  );
  const [accountId, setAccountId] = useState(settings.accounts[0]?.id ?? "");
  const [source, setSource] = useState(NO_SOURCE);
  const [date, setDate] = useState(todayISO);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const categories = settings.categories[type];
  // если выбранный элемент удалили из справочника — берём первый доступный
  const effectiveCategory = categories.includes(category)
    ? category
    : (categories[0] ?? "");
  const effectiveAccount = settings.accounts.some((a) => a.id === accountId)
    ? accountId
    : (settings.accounts[0]?.id ?? "");
  const effectiveSource = settings.sources.includes(source)
    ? source
    : NO_SOURCE;

  const isIncome = type === "income";
  const currency = accountCurrency(
    settings.accounts.find((a) => a.id === effectiveAccount),
  );
  const rate = currency === "RUB" ? 1 : settings.rates[currency];
  const preview = parseAmount(amount);

  function handleModeChange(next: Mode) {
    setMode(next);
    if (next !== "transfer") setCategory(settings.categories[next][0] ?? "");
    setError("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!(value > 0)) return setError("Введите сумму больше нуля");
    if (!effectiveCategory) return setError("Добавьте категорию");
    if (!effectiveAccount) return setError("Добавьте счёт или карту");
    if (!rate)
      return setError(`Задайте курс ${currency} в блоке «Счета и карты»`);
    if (!date) return setError("Укажите дату");
    onAdd({
      type,
      amount: value,
      category: effectiveCategory,
      accountId: effectiveAccount,
      ...(isIncome && effectiveSource ? { source: effectiveSource } : {}),
      date,
      description: description.trim(),
    });
    setAmount("");
    setDescription("");
    setError("");
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-zinc-900">Новая запись</h2>
        <Segmented
          className="w-full sm:w-80"
          value={mode}
          onChange={handleModeChange}
          options={[
            { value: "expense", label: TYPE_LABELS.expense.one },
            { value: "income", label: TYPE_LABELS.income.one },
            { value: "transfer", label: "Перевод" },
          ]}
        />
      </div>

      {mode === "transfer" ? (
        <TransferForm settings={settings} onSave={onAddTransfer} />
      ) : (
        <form onSubmit={handleSubmit} className="animate-fade-in">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-500">
                Сумма, {CURRENCY_SYMBOLS[currency]}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
              {currency !== "RUB" && (
                <span className="animate-fade-in text-xs text-zinc-400">
                  {rate
                    ? `${preview > 0 ? `≈ ${formatMoney(preview * rate)} · ` : ""}курс ${formatRate(rate)} ₽`
                    : "Курс не задан"}
                </span>
              )}
            </label>

            <SelectWithAdd
              label="Категория"
              value={effectiveCategory}
              onChange={setCategory}
              options={categories.map((c) => ({ value: c, label: c }))}
              onCreate={(name) => onAddCategory(type, name)}
              addLabel="+ Новая категория…"
              placeholder="Название категории"
            />

            <SelectWithAdd
              label={isIncome ? "Зачислить на" : "Списать с"}
              value={effectiveAccount}
              onChange={setAccountId}
              options={settings.accounts.map((a) => ({
                value: a.id,
                label: accountLabel(a),
              }))}
              onCreate={onAddAccount}
              addLabel="+ Новый счёт или карта…"
              placeholder="Например, Карта Сбер"
            />

            {isIncome && (
              <div className="animate-fade-in">
                <SelectWithAdd
                  label="Источник"
                  value={effectiveSource}
                  onChange={setSource}
                  options={[
                    { value: NO_SOURCE, label: "Не указан" },
                    ...settings.sources.map((s) => ({ value: s, label: s })),
                  ]}
                  onCreate={onAddSource}
                  addLabel="+ Новый источник…"
                  placeholder="Например, ООО «Ромашка»"
                />
              </div>
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
              className={`flex flex-col gap-1.5 ${isIncome ? "sm:col-span-2" : ""}`}
            >
              <span className="text-xs font-medium text-zinc-500">
                Описание
              </span>
              <input
                type="text"
                placeholder={
                  isIncome ? "Например, аванс" : "Например, обед в кафе"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p
              className={`text-sm text-rose-600 transition-opacity duration-200 ${
                error ? "opacity-100" : "opacity-0"
              }`}
              aria-live="polite"
            >
              {error || " "}
            </p>
            <button
              type="submit"
              className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors active:scale-[0.98] ${
                isIncome
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-zinc-900 hover:bg-zinc-700"
              }`}
            >
              {isIncome ? "Добавить доход" : "Добавить расход"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
