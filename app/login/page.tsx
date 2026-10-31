import LoginForm from "./LoginForm";

export const metadata = { title: "Вход — Трекер доходов и расходов" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Трекер доходов и расходов
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Введите пароль. На этом устройстве его спросят один раз.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
