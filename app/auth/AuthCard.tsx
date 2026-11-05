/** Общая карточка страниц входа, регистрации и восстановления пароля. */
export default function AuthCard({
  hint,
  children,
}: {
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Трекер доходов и расходов
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{hint}</p>
        {children}
      </section>
    </main>
  );
}

export const submitClass =
  "rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60";
export const linkClass = "font-medium text-zinc-900 underline";
