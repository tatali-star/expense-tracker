import { Suspense } from "react";
import ExpenseTracker, { ExpenseTrackerSkeleton } from "./components/ExpenseTracker";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Трекер доходов и расходов
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Записывайте доходы и траты, следите за балансом
        </p>
      </header>
      <Suspense fallback={<ExpenseTrackerSkeleton />}>
        <ExpenseTracker />
      </Suspense>
    </main>
  );
}
