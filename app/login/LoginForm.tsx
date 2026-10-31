"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { inputClass } from "../components/SelectWithAdd";

export default function LoginForm() {
  const [error, action, pending] = useActionState(login, "");

  return (
    <form action={action} className="mt-5 flex flex-col gap-3">
      <input
        type="password"
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Пароль"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Проверяю…" : "Войти"}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </form>
  );
}
