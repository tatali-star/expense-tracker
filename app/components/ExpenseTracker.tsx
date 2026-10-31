"use client";

import { use, useEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import {
  type Account,
  type Entry,
  type Transfer,
  type EntryType,
  type Rates,
  type Recurring,
  type Settings,
  accountCurrency,
  fetchCbrRates,
  findName,
  dueDate,
  loadEntries,
  accountUsed,
  loadRecurring,
  loadTransfers,
  loadSettings,
  saveEntries,
  saveRecurring,
  saveTransfers,
  saveSettings,
  todayISO,
} from "../lib/expenses";
import Accounts from "./Accounts";
import Catalogs from "./Catalogs";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import RecurringPayments from "./RecurringPayments";
import Summary from "./Summary";

export default function ExpenseTracker() {
  use(browser("Доходы, расходы и справочники хранятся в localStorage."));

  const [entries, setEntries] = useState<Entry[]>(loadEntries);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [recurring, setRecurring] = useState<Recurring[]>(loadRecurring);
  const [transfers, setTransfers] = useState<Transfer[]>(loadTransfers);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [ratesStatus, setRatesStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const autoRatesTried = useRef(false);

  function updateSettings(next: Settings) {
    setSettings(next);
    saveSettings(next);
  }

  function refreshRates() {
    setRatesStatus("loading");
    loadRates();
  }

  function loadRates() {
    fetchCbrRates()
      .then(({ rates, date }) => {
        // функциональное обновление: пока шёл запрос, пользователь мог поменять настройки
        setSettings((prev) => {
          const next = {
            ...prev,
            rates,
            ratesDate: date,
            ratesUpdated: todayISO(),
            ratesManual: false,
          };
          saveSettings(next);
          return next;
        });
        setRatesStatus("idle");
      })
      .catch(() => setRatesStatus("error"));
  }

  // курсы ЦБ подтягиваются раз в день, если пользователь не задал их вручную
  useEffect(() => {
    if (autoRatesTried.current) return;
    autoRatesTried.current = true;
    if (!settings.ratesManual && settings.ratesUpdated !== todayISO())
      loadRates();
  });

  function saveRates(rates: Rates) {
    updateSettings({ ...settings, rates, ratesManual: true });
  }

  // сумма хранится в валюте счёта, курс фиксируется на момент записи
  function handleAdd(data: Omit<Entry, "id">) {
    const currency = accountCurrency(
      settings.accounts.find((a) => a.id === data.accountId),
    );
    const money =
      currency === "RUB" ? {} : { currency, rate: settings.rates[currency] };
    const next = [{ ...data, ...money, id: crypto.randomUUID() }, ...entries];
    setEntries(next);
    saveEntries(next);
    setMonth(data.date.slice(0, 7));
  }

  function handleUpdate(entry: Entry) {
    const next = entries.map((e) => (e.id === entry.id ? entry : e));
    setEntries(next);
    saveEntries(next);
  }

  function handleDelete(id: string) {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveEntries(next);
      return next;
    });
  }

  function updateRecurring(next: Recurring[]) {
    setRecurring(next);
    saveRecurring(next);
  }

  function saveRecurringItem(item: Recurring) {
    const exists = recurring.some((r) => r.id === item.id);
    updateRecurring(
      exists
        ? recurring.map((r) => (r.id === item.id ? item : r))
        : [...recurring, item],
    );
  }

  // оплата — обычный расход, связанный с платежом; в текущем месяце датируется сегодняшним днём
  function payRecurring(item: Recurring, amount: number) {
    const today = todayISO();
    handleAdd({
      type: "expense",
      amount,
      category: item.category,
      accountId: item.accountId,
      date: today.startsWith(month) ? today : dueDate(item, month),
      description: item.name,
      recurringId: item.id,
    });
  }

  function setRecurringMonthAmount(
    item: Recurring,
    forMonth: string,
    amount: number | null,
  ) {
    const overrides = { ...item.overrides };
    if (amount === null) delete overrides[forMonth];
    else overrides[forMonth] = amount;
    const next: Recurring = { ...item, overrides };
    if (Object.keys(overrides).length === 0) delete next.overrides;
    saveRecurringItem(next);
  }

  function unpayRecurring(item: Recurring) {
    const next = entries.filter(
      (e) => !(e.recurringId === item.id && e.date.startsWith(month)),
    );
    setEntries(next);
    saveEntries(next);
  }

  // возвращают название/id, чтобы форма сразу выбрала созданный пункт
  function addCategory(type: EntryType, name: string) {
    const existing = findName(settings.categories[type], name);
    if (existing) return existing;
    updateSettings({
      ...settings,
      categories: {
        ...settings.categories,
        [type]: [...settings.categories[type], name],
      },
    });
    return name;
  }

  function addSource(name: string) {
    const existing = findName(settings.sources, name);
    if (existing) return existing;
    updateSettings({ ...settings, sources: [...settings.sources, name] });
    return name;
  }

  function addAccount(data: Omit<Account, "id">) {
    const existing = settings.accounts.find(
      (a) => a.name.toLowerCase() === data.name.toLowerCase(),
    );
    if (existing) return existing.id;
    const account = { ...data, id: crypto.randomUUID() };
    updateSettings({ ...settings, accounts: [...settings.accounts, account] });
    return account.id;
  }

  function updateAccount(account: Account) {
    updateSettings({
      ...settings,
      accounts: settings.accounts.map((a) =>
        a.id === account.id ? account : a,
      ),
    });
  }

  function updateTransfers(next: Transfer[]) {
    setTransfers(next);
    saveTransfers(next);
  }

  function addTransfer(data: Omit<Transfer, "id">) {
    updateTransfers([{ ...data, id: crypto.randomUUID() }, ...transfers]);
  }

  function deleteAccount(id: string) {
    if (accountUsed(id, entries, transfers)) return;
    updateSettings({
      ...settings,
      accounts: settings.accounts.filter((a) => a.id !== id),
    });
  }

  function addCatalogItem(tab: EntryType | "sources", name: string) {
    if (tab === "sources") addSource(name);
    else addCategory(tab, name);
  }

  function deleteCatalogItem(tab: EntryType | "sources", name: string) {
    if (tab === "sources") {
      updateSettings({
        ...settings,
        sources: settings.sources.filter((s) => s !== name),
      });
    } else {
      updateSettings({
        ...settings,
        categories: {
          ...settings.categories,
          [tab]: settings.categories[tab].filter((c) => c !== name),
        },
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <ExpenseForm
          settings={settings}
          onAdd={handleAdd}
          onAddCategory={addCategory}
          onAddSource={addSource}
          onAddAccount={(name) =>
            addAccount({ name, kind: "card", initial: 0, currency: "RUB" })
          }
          onAddTransfer={addTransfer}
        />
        <RecurringPayments
          items={recurring}
          entries={entries}
          settings={settings}
          month={month}
          onSave={saveRecurringItem}
          onDelete={(id) =>
            updateRecurring(recurring.filter((r) => r.id !== id))
          }
          onPay={payRecurring}
          onUnpay={unpayRecurring}
          onAddCategory={(name) => addCategory("expense", name)}
          onSetMonthAmount={setRecurringMonthAmount}
          onUpdateEntry={handleUpdate}
        />
        <ExpenseList
          transfers={transfers}
          onUpdateTransfer={(t) =>
            updateTransfers(transfers.map((x) => (x.id === t.id ? t : x)))
          }
          onDeleteTransfer={(id) =>
            setTransfers((prev) => {
              const next = prev.filter((x) => x.id !== id);
              saveTransfers(next);
              return next;
            })
          }
          entries={entries}
          settings={settings}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      </div>
      <div className="flex flex-col gap-5">
        <Summary
          entries={entries}
          settings={settings}
          month={month}
          onMonthChange={setMonth}
        />
        <Accounts
          transfers={transfers}
          settings={settings}
          entries={entries}
          ratesStatus={ratesStatus}
          onAdd={addAccount}
          onUpdate={updateAccount}
          onDelete={deleteAccount}
          onSaveRates={saveRates}
          onRefreshRates={refreshRates}
        />
        <Catalogs
          settings={settings}
          onAdd={addCatalogItem}
          onDelete={deleteCatalogItem}
        />
      </div>
    </div>
  );
}

export function ExpenseTrackerSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-5">
        <div className="h-64 rounded-2xl bg-zinc-100" />
        <div className="h-80 rounded-2xl bg-zinc-100" />
      </div>
      <div className="h-96 rounded-2xl bg-zinc-100" />
    </div>
  );
}
