import { Suspense } from "react";
import { redirect } from "next/navigation";
import { logout } from "./actions";
import { isSignedIn } from "./lib/auth";
import { readStore } from "./lib/db";
import ExpenseTracker, { ExpenseTrackerSkeleton } from "./components/ExpenseTracker";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Трекер доходов и расходов
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Записывайте доходы и траты, следите за балансом
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-xl px-3 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Выйти
          </button>
        </form>
      </header>
      <Suspense fallback={<ExpenseTrackerSkeleton />}>
        <Tracker />
      </Suspense>
    </main>
  );
}

// вход и данные читаются на каждый запрос, поэтому компонент стоит за Suspense
async function Tracker() {
  if (!(await isSignedIn())) redirect("/login");
  const { data, versions } = await readStore();
  return <ExpenseTracker initialData={data} initialVersions={versions} />;
}
