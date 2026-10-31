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
  type RawStore,
  type Versions,
  accountCurrency,
  fetchCbrRates,
  findName,
  dueDate,
  accountUsed,
  parseEntries,
  parseList,
  parseSettings,
  settingsForStore,
  todayISO,
} from "../lib/expenses";
import Accounts from "./Accounts";
import Backup from "./Backup";
import Catalogs from "./Catalogs";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import RecurringPayments from "./RecurringPayments";
import Summary from "./Summary";
import { type SyncProblem, useSync } from "./useSync";

function parseStore(data: RawStore) {
  const entries = parseEntries(data.entries);
  const { settings, migrated } = parseSettings(data.settings, entries);
  return {
    entries,
    settings,
    settingsMigrated: migrated,
    recurring: parseList<Recurring>(data.recurring),
    transfers: parseList<Transfer>(data.transfers),
  };
}

type Props = {
  initialData: RawStore;
  initialVersions: Versions;
};

export default function ExpenseTracker({ initialData, initialVersions }: Props) {
  // данные приходят с сервера, но перенос из старой версии и дата копии — в localStorage
  use(browser("Старые данные и дата резервной копии хранятся в localStorage."));

  const [initial] = useState(() => parseStore(initialData));
  const [entries, setEntries] = useState<Entry[]>(initial.entries);
  const [settings, setSettings] = useState<Settings>(initial.settings);
  const [recurring, setRecurring] = useState<Recurring[]>(initial.recurring);
  const [transfers, setTransfers] = useState<Transfer[]>(initial.transfers);
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [ratesStatus, setRatesStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const autoRatesTried = useRef(false);
  const sync = useSync(initialVersions);

  const saveEntries = (next: Entry[]) => sync.save("entries", next);
  const saveSettings = (next: Settings) => sync.save("settings", settingsForStore(next));
  const saveRecurring = (next: Recurring[]) => sync.save("recurring", next);
  const saveTransfers = (next: Transfer[]) => sync.save("transfers", next);

  // настройки старой версии после миграции сохраняем в новом виде
  const migrationSaved = useRef(false);
  useEffect(() => {
    if (migrationSaved.current || !initial.settingsMigrated) return;
    migrationSaved.current = true;
    sync.save("settings", settingsForStore(initial.settings));
  });

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

  // восстановление из копии: сначала база, потом экран; миграции применятся при разборе
  async function replaceAllData(data: RawStore) {
    const parsed = parseStore(data);
    const stored = { ...data, settings: data.settings == null ? null : settingsForStore(parsed.settings) };
    await sync.replace(stored);
    setEntries(parsed.entries);
    setSettings(parsed.settings);
    setRecurring(parsed.recurring);
    setTransfers(parsed.transfers);
  }

  function currentData(): RawStore {
    return { entries, settings: settingsForStore(settings), recurring, transfers };
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
    <>
    {sync.problem && <SyncBanner problem={sync.problem} />}
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
        <Backup
          getData={currentData}
          offerLegacy={
            initial.entries.length + initial.recurring.length + initial.transfers.length === 0
          }
          onReplace={replaceAllData}
        />
      </div>
    </div>
    </>
  );
}

const SYNC_MESSAGES: Record<NonNullable<SyncProblem>, string> = {
  error: "Не удалось сохранить последние изменения. Проверьте интернет и обновите страницу.",
  conflict:
    "Данные изменили на другом устройстве. Обновите страницу, чтобы увидеть свежие — изменения здесь пока не сохраняются.",
};

function SyncBanner({ problem }: { problem: NonNullable<SyncProblem> }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
      <p>{SYNC_MESSAGES[problem]}</p>
      <button
        type="button"
        onClick={() => location.reload()}
        className="rounded-xl bg-amber-600 px-4 py-2 font-medium text-white transition hover:bg-amber-700"
      >
        Обновить
      </button>
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
