"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithEmail, signUpWithEmail } from "../actions";
import { inputClass } from "../components/SelectWithAdd";
import AuthCard, { linkClass, submitClass } from "./AuthCard";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signUp = mode === "sign-up";
  const [error, action, pending] = useActionState(signUp ? signUpWithEmail : signInWithEmail, "");

  return (
    <AuthCard
      hint={signUp ? "Создайте аккаунт — записи будут видны только вам." : "Войдите в свой аккаунт."}
    >
      <form action={action} className="mt-5 flex flex-col gap-3">
        {signUp && (
          <input
            type="text"
            name="name"
            required
            autoFocus
            autoComplete="name"
            placeholder="Имя"
            className={inputClass}
          />
        )}
        <input
          type="email"
          name="email"
          required
          autoFocus={!signUp}
          autoComplete="email"
          placeholder="Почта"
          className={inputClass}
        />
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete={signUp ? "new-password" : "current-password"}
          placeholder={signUp ? "Пароль, не меньше 8 символов" : "Пароль"}
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={submitClass}>
          {pending ? "Проверяю…" : signUp ? "Зарегистрироваться" : "Войти"}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </form>
      {!signUp && (
        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/auth/forgot-password" className={linkClass}>
            Забыли пароль?
          </Link>
        </p>
      )}
      <p className="mt-2 text-sm text-zinc-500">
        {signUp ? "Уже есть аккаунт? " : "Ещё нет аккаунта? "}
        <Link href={signUp ? "/auth/sign-in" : "/auth/sign-up"} className={linkClass}>
          {signUp ? "Войти" : "Зарегистрироваться"}
        </Link>
      </p>
    </AuthCard>
  );
}
