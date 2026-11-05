export type EntryType = "expense" | "income";
export type AccountKind = "card" | "account" | "cash";
export type Currency = "RUB" | "USD" | "EUR" | "USDT";
export type ForeignCurrency = Exclude<Currency, "RUB">;
/** Сколько рублей стоит единица валюты; 0 — курс ещё не известен. */
export type Rates = Record<ForeignCurrency, number>;

export const CURRENCIES: Currency[] = ["RUB", "USD", "EUR", "USDT"];
export const FOREIGN_CURRENCIES: ForeignCurrency[] = ["USD", "EUR", "USDT"];
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  USDT: "USDT",
};

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  initial: number; // начальный остаток в валюте счёта
  currency?: Currency; // нет поля — рубли (счета из ранних версий)
};

export type Settings = {
  categories: Record<EntryType, string[]>;
  sources: string[];
  accounts: Account[];
  rates: Rates;
  ratesDate: string; // дата курса ЦБ, YYYY-MM-DD
  ratesUpdated: string; // когда последний раз запрашивали ЦБ
  ratesManual: boolean; // курсы введены вручную — не перезаписывать автоматически
};

export type Entry = {
  id: string;
  type: EntryType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  accountId: string;
  source?: string; // только для доходов
  recurringId?: string; // оплата обязательного платежа
  currency?: Currency; // валюта суммы, по умолчанию рубли
  rate?: number; // курс к рублю на момент записи — по нему считается статистика
};

/**
 * Перевод между своими счетами. Не доход и не расход: меняет только остатки.
 * Суммы в валютах счетов — при обмене валюты они разные.
 */
export type Transfer = {
  id: string;
  fromId: string;
  toId: string;
  amountFrom: number; // списано, в валюте счёта fromId
  amountTo: number; // зачислено, в валюте счёта toId
  date: string; // YYYY-MM-DD
  description: string;
};

export type Frequency = "monthly" | "yearly";

/** Обязательный (повторяющийся) платёж: кредит, коммуналка, подписка… */
export type Recurring = {
  id: string;
  name: string;
  amount: number; // в валюте счёта
  category: string;
  accountId: string;
  day: number; // число месяца, 1–31
  frequency: Frequency;
  startMonth: string; // YYYY-MM, для ежегодных задаёт и месяц платежа
  endMonth?: string; // YYYY-MM, последний платёж (кредиты, рассрочки)
  variable?: boolean; // сумма каждый месяц разная (коммуналка) — amount примерная
  overrides?: Record<string, number>; // точная сумма на отдельные месяцы, YYYY-MM → сумма
};

/** Сумма платежа в месяце: уточнённая на этот месяц или обычная. */
export function plannedAmount(r: Recurring, month: string) {
  return r.overrides?.[month] ?? r.amount;
}

export const DEFAULT_ACCOUNT_ID = "cash";

export const RECURRING_CATEGORIES = [
  "Кредиты",
  "Ипотека",
  "Коммуналка",
  "Интернет",
  "Телефония",
  "Подписки",
];

const DEFAULT_INCOME_CATEGORIES = ["Зарплата", "Подработка", "Подарки", "Другое"];

const account = (
  id: string,
  name: string,
  kind: AccountKind,
  currency: Currency = "RUB",
): Account => ({ id, name, kind, initial: 0, currency });

const DEFAULT_ACCOUNTS: Account[] = [
  account(DEFAULT_ACCOUNT_ID, "Наличные", "cash"),
  account("card", "Карта", "card"),
];

export const DEFAULT_SETTINGS: Settings = {
  categories: {
    expense: ["Еда", "Транспорт", "Развлечения", "Здоровье", ...RECURRING_CATEGORIES, "Другое"],
    income: DEFAULT_INCOME_CATEGORIES,
  },
  sources: [],
  accounts: DEFAULT_ACCOUNTS,
  rates: { USD: 0, EUR: 0, USDT: 0 },
  ratesDate: "",
  ratesUpdated: "",
  ratesManual: false,
};

// v2: обновлённый список счетов и доходов (данные таких копий читаются как есть)
// v3: категории для обязательных платежей
// v4: валюты у счетов
const SETTINGS_VERSION = 4;

export const TYPE_LABELS: Record<EntryType, { one: string; many: string }> = {
  expense: { one: "Расход", many: "Расходы" },
  income: { one: "Доход", many: "Доходы" },
};

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  card: "Карта",
  account: "Счёт",
  cash: "Наличные",
};

type Style = { dot: string; badge: string; bar: string };

const PALETTE: Style[] = [
  { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700", bar: "bg-amber-400" },
  { dot: "bg-sky-400", badge: "bg-sky-50 text-sky-700", bar: "bg-sky-400" },
  { dot: "bg-violet-400", badge: "bg-violet-50 text-violet-700", bar: "bg-violet-400" },
  { dot: "bg-rose-400", badge: "bg-rose-50 text-rose-700", bar: "bg-rose-400" },
  { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-400" },
  { dot: "bg-teal-400", badge: "bg-teal-50 text-teal-700", bar: "bg-teal-400" },
  { dot: "bg-pink-400", badge: "bg-pink-50 text-pink-700", bar: "bg-pink-400" },
  { dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700", bar: "bg-indigo-400" },
  { dot: "bg-orange-400", badge: "bg-orange-50 text-orange-700", bar: "bg-orange-400" },
  { dot: "bg-lime-500", badge: "bg-lime-50 text-lime-700", bar: "bg-lime-500" },
  { dot: "bg-cyan-400", badge: "bg-cyan-50 text-cyan-700", bar: "bg-cyan-400" },
  { dot: "bg-fuchsia-400", badge: "bg-fuchsia-50 text-fuchsia-700", bar: "bg-fuchsia-400" },
];

const NEUTRAL: Style = { dot: "bg-zinc-400", badge: "bg-zinc-100 text-zinc-700", bar: "bg-zinc-400" };

const FIXED_COLORS: Record<string, number> = {
  Еда: 0,
  Транспорт: 1,
  Развлечения: 2,
  Здоровье: 3,
  Зарплата: 4,
  Подработка: 5,
  Подарки: 6,
  Инвестиции: 7,
  "Клиенты (наличные)": 5,
  "Бонусы/кешбеки": 8,
  "Инвестиции недвижимость": 10,
  Кредиты: 3,
  Ипотека: 7,
  Коммуналка: 8,
  Интернет: 1,
  Телефония: 10,
  Подписки: 2,
  "Подарки судьбы": 6,
};

// у пользовательских категорий цвет стабильно выводится из названия
export function categoryStyle(name: string): Style {
  if (name === "Другое" || name === "Без источника") return NEUTRAL;
  if (name in FIXED_COLORS) return PALETTE[FIXED_COLORS[name]];
  let hash = 0;
  for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** Данные трекера в сыром виде — так они лежат в базе и в резервной копии. */
export type StoreKey = "entries" | "settings" | "recurring" | "transfers";
export type RawStore = Record<StoreKey, unknown>;
export const STORE_KEYS: StoreKey[] = ["entries", "settings", "recurring", "transfers"];
/** Номер версии каждого раздела в базе; 0 — раздела ещё нет. */
export type Versions = Record<StoreKey, number>;

export function parseEntries(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return [];
  // записи из ранних версий: без type — это расходы, без счёта — наличные
  return raw.map((e) => ({
    ...e,
    type: e.type === "income" ? "income" : "expense",
    accountId: e.accountId ?? DEFAULT_ACCOUNT_ID,
  }));
}

/** Список (обязательные платежи, переводы) или пустой, если данных нет. */
export function parseList<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? raw : [];
}

/** Настройки для сохранения — с версией, по которой потом сработают миграции. */
export function settingsForStore(settings: Settings) {
  return { ...settings, version: SETTINGS_VERSION };
}

/** Настройки из сырых данных; migrated — данные были старой версии, их стоит пересохранить. */
export function parseSettings(
  raw: unknown,
  entries: Entry[],
): { settings: Settings; migrated: boolean } {
  if (!raw || typeof raw !== "object") return { settings: DEFAULT_SETTINGS, migrated: false };
  const parsed = raw as Partial<Settings> & { version?: number };
  const settings: Settings = {
    categories: {
      expense: parsed.categories?.expense ?? DEFAULT_SETTINGS.categories.expense,
      income: parsed.categories?.income ?? DEFAULT_SETTINGS.categories.income,
    },
    sources: parsed.sources ?? DEFAULT_SETTINGS.sources,
    accounts: parsed.accounts ?? DEFAULT_SETTINGS.accounts,
    rates: { ...DEFAULT_SETTINGS.rates, ...parsed.rates },
    ratesDate: parsed.ratesDate ?? "",
    ratesUpdated: parsed.ratesUpdated ?? "",
    ratesManual: parsed.ratesManual ?? false,
  };
  if (parsed.version === SETTINGS_VERSION) return { settings, migrated: false };
  let migrated = settings;
  const version = parsed.version ?? 1;
  if (version < 3) migrated = migrateToV3(migrated);
  migrated = migrateToV4(migrated, entries);
  return { settings: migrated, migrated: true };
}

/** Добавляет категории обязательных платежей перед «Другое», если их ещё нет. */
function migrateToV3(old: Settings): Settings {
  const missing = RECURRING_CATEGORIES.filter((c) => !findName(old.categories.expense, c));
  if (missing.length === 0) return old;
  const list = old.categories.expense.filter((c) => c !== "Другое");
  const tail = old.categories.expense.includes("Другое") ? ["Другое"] : [];
  return {
    ...old,
    categories: { ...old.categories, expense: [...list, ...missing, ...tail] },
  };
}

const CURRENCY_ACCOUNTS: Record<string, Currency> = { Доллары: "USD", Евро: "EUR", USDT: "USDT" };

/**
 * Ставит валюту счетам «Доллары», «Евро», «USDT». Раньше суммы по ним вводились
 * в рублях, поэтому счёт с операциями или остатком остаётся рублёвым — менять его
 * валюту без пересчёта нельзя.
 */
function migrateToV4(old: Settings, entries: Entry[]): Settings {
  const used = new Set(entries.map((e) => e.accountId));
  return {
    ...old,
    accounts: old.accounts.map((a) => {
      if (a.currency) return a;
      const preset = CURRENCY_ACCOUNTS[a.name];
      const fresh = !used.has(a.id) && a.initial === 0;
      return { ...a, currency: preset && fresh ? preset : "RUB" };
    }),
  };
}

export function isDueInMonth(r: Recurring, month: string) {
  if (month < r.startMonth) return false;
  if (r.endMonth && month > r.endMonth) return false;
  return r.frequency === "monthly" || month.slice(5) === r.startMonth.slice(5);
}

/** Дата платежа в месяце; 31-е число в коротком месяце становится последним днём. */
export function dueDate(r: Recurring, month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(r.day, last)).padStart(2, "0")}`;
}

/** Сколько платежей осталось с month по endMonth включительно. */
export function paymentsLeft(r: Recurring, month: string) {
  if (!r.endMonth) return null;
  const [y1, m1] = month.split("-").map(Number);
  const [y2, m2] = r.endMonth.split("-").map(Number);
  const months = (y2 - y1) * 12 + (m2 - m1) + 1;
  if (months <= 0) return 0;
  return r.frequency === "monthly" ? months : Math.ceil(months / 12);
}

export function accountCurrency(account: Account | undefined): Currency {
  return account?.currency ?? "RUB";
}

export function rateOf(currency: Currency, rates: Rates) {
  return currency === "RUB" ? 1 : rates[currency];
}

/** Сумма операции в рублях по курсу на момент записи. */
export function toRub(e: Entry) {
  return e.amount * (e.rate ?? 1);
}

/** Сумма в рублях по типу операции. */
export function sumBy(entries: Entry[], type: EntryType) {
  return entries.filter((e) => e.type === type).reduce((s, e) => s + toRub(e), 0);
}

/** Сумма операции в нужной валюте (обычно совпадает с валютой счёта). */
function amountIn(e: Entry, currency: Currency, rates: Rates) {
  if ((e.currency ?? "RUB") === currency) return e.amount;
  const rate = rateOf(currency, rates);
  return rate ? toRub(e) / rate : 0;
}

/** Остаток в валюте счёта. */
export function accountBalance(
  account: Account,
  entries: Entry[],
  rates: Rates,
  transfers: Transfer[] = [],
) {
  const currency = accountCurrency(account);
  const fromEntries = entries
    .filter((e) => e.accountId === account.id)
    .reduce((s, e) => s + (e.type === "income" ? 1 : -1) * amountIn(e, currency, rates), 0);
  const fromTransfers = transfers.reduce(
    (s, t) =>
      s + (t.toId === account.id ? t.amountTo : 0) - (t.fromId === account.id ? t.amountFrom : 0),
    0,
  );
  return account.initial + fromEntries + fromTransfers;
}

/** Есть ли по счёту операции или переводы — тогда его нельзя удалить и сменить валюту. */
export function accountUsed(id: string, entries: Entry[], transfers: Transfer[]) {
  return entries.some((e) => e.accountId === id) || transfers.some((t) => t.fromId === id || t.toId === id);
}

/** Подпись счёта в выпадающих списках: «ТБанк · Карта», «Доллары · Наличные, $». */
export function accountLabel(a: Account) {
  const base = a.name === ACCOUNT_KIND_LABELS[a.kind] ? a.name : `${a.name} · ${ACCOUNT_KIND_LABELS[a.kind]}`;
  const currency = accountCurrency(a);
  return currency === "RUB" ? base : `${base}, ${CURRENCY_SYMBOLS[currency]}`;
}

const BACKUP_APP = "expense-tracker";

export type Backup = {
  app: typeof BACKUP_APP;
  createdAt: string; // ISO-время создания копии
  data: RawStore;
};

export function createBackup(data: RawStore): Backup {
  return { app: BACKUP_APP, createdAt: new Date().toISOString(), data };
}

/** Разбирает файл копии; при ошибке бросает исключение с понятным текстом. */
export function parseBackup(text: string): Backup {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Файл повреждён или это не резервная копия");
  }
  if (parsed?.app !== BACKUP_APP || typeof parsed.data !== "object" || !parsed.data)
    throw new Error("Это не резервная копия трекера");
  if (!isRawStore(parsed.data)) throw new Error("В копии неверный формат данных");
  return parsed;
}

/** Формат данных: списки — массивы, настройки — объект; отсутствие допустимо. */
export function isRawStore(data: unknown): data is RawStore {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  const listOrEmpty = (v: unknown) => v == null || Array.isArray(v);
  return (
    listOrEmpty(d.entries) &&
    listOrEmpty(d.recurring) &&
    listOrEmpty(d.transfers) &&
    (d.settings == null || (typeof d.settings === "object" && !Array.isArray(d.settings)))
  );
}

const LAST_BACKUP_KEY = "expense-tracker:last-backup";

/** Дата последней скачанной копии (YYYY-MM-DD) или пустая строка. */
export function loadLastBackup() {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveLastBackup(date: string) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, date);
  } catch {
    // не критично — просто не покажем дату
  }
}

/** Курсы ЦБ РФ; USDT привязан к доллару, поэтому берём курс USD. */
export async function fetchCbrRates(): Promise<{ rates: Rates; date: string }> {
  const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
  if (!res.ok) throw new Error(`ЦБ ответил ${res.status}`);
  const data = await res.json();
  const usd = data.Valute.USD.Value / data.Valute.USD.Nominal;
  const eur = data.Valute.EUR.Value / data.Valute.EUR.Nominal;
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return {
    rates: { USD: round(usd), EUR: round(eur), USDT: round(usd) },
    date: String(data.Date).slice(0, 10),
  };
}

/** Ищет название в списке без учёта регистра. */
export function findName(list: string[], name: string) {
  const lower = name.trim().toLowerCase();
  return list.find((n) => n.toLowerCase() === lower);
}

export function parseAmount(value: string, digits = 2) {
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  const k = 10 ** digits;
  return Number.isFinite(n) ? Math.round(n * k) / k : NaN;
}

const formatters = new Map<Currency, Intl.NumberFormat>();

export function formatMoney(value: number, currency: Currency = "RUB") {
  let f = formatters.get(currency);
  if (!f) {
    // USDT нет в ISO 4217 — форматируем числом и дописываем код
    f =
      currency === "USDT"
        ? new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 2 });
    formatters.set(currency, f);
  }
  const text = f.format(value);
  return currency === "USDT" ? `${text} USDT` : text;
}

export function formatSigned(value: number, type: EntryType, currency: Currency = "RUB") {
  return `${type === "income" ? "+" : "−"}${formatMoney(value, currency)}`;
}

export function formatRate(rate: number) {
  return rate.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function todayISO() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}
