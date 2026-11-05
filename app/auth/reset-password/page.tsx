"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { setNewPassword } from "../../actions";
import { inputClass } from "../../components/SelectWithAdd";
import AuthCard, { linkClass, submitClass } from "../AuthCard";

const BAD_LINK = "Ссылка устарела или уже использована. Запросите новую.";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, action, pending] = useActionState(setNewPassword, { error: "", done: false });

  if (state.done) {
    return (
      <p className="mt-5 text-sm text-zinc-700">
        Пароль изменён.{" "}
        <Link href="/auth/sign-in" className={linkClass}>
          Войти
        </Link>
      </p>
    );
  }
  // ссылка из письма с истёкшим сроком приходит сюда с ошибкой вместо токена
  if (!token || params.get("error")) {
    return (
      <p className="mt-5 text-sm text-zinc-700">
        {BAD_LINK}{" "}
        <Link href="/auth/forgot-password" className={linkClass}>
          Запросить ссылку
        </Link>
      </p>
    );
  }
  return (
    <form action={action} className="mt-5 flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input
        type="password"
        name="password"
        required
        minLength={8}
        autoFocus
        autoComplete="new-password"
        placeholder="Новый пароль, не меньше 8 символов"
        className={inputClass}
      />
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Сохраняю…" : "Сохранить пароль"}
      </button>
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard hint="Придумайте новый пароль.">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
