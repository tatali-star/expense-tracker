"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset } from "../../actions";
import { inputClass } from "../../components/SelectWithAdd";
import AuthCard, { linkClass, submitClass } from "../AuthCard";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestReset, { error: "", sent: false });

  return (
    <AuthCard hint="Пришлём на почту ссылку для нового пароля.">
      {state.sent ? (
        <p className="mt-5 text-sm text-zinc-700">
          Если такая почта зарегистрирована, письмо уже в пути. Ссылка действует 15 минут.
          Не видите письмо — проверьте папку «Спам».
        </p>
      ) : (
        <form action={action} className="mt-5 flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="Почта"
            className={inputClass}
          />
          <button type="submit" disabled={pending} className={submitClass}>
            {pending ? "Отправляю…" : "Отправить ссылку"}
          </button>
          {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
        </form>
      )}
      <p className="mt-4 text-sm text-zinc-500">
        <Link href="/auth/sign-in" className={linkClass}>
          Вернуться ко входу
        </Link>
      </p>
    </AuthCard>
  );
}
