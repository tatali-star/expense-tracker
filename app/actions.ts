"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUserId } from "./lib/auth";
import { replaceStore, writeKey } from "./lib/db";
import { type RawStore, type StoreKey, STORE_KEYS, isRawStore } from "./lib/expenses";

// каждое действие само проверяет вход: Server Actions доступны прямым POST-запросом
async function requireUserId() {
  const userId = await currentUserId();
  if (!userId) throw new Error("Нужно войти заново");
  return userId;
}

const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Неверная почта или пароль",
  INVALID_EMAIL: "Проверьте адрес почты",
  INVALID_PASSWORD: "Неверная почта или пароль",
  USER_ALREADY_EXISTS: "Такая почта уже зарегистрирована — войдите",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Такая почта уже зарегистрирована — войдите",
  PASSWORD_TOO_SHORT: "Пароль слишком короткий — нужно не меньше 8 символов",
  PASSWORD_TOO_LONG: "Пароль слишком длинный",
  EMAIL_NOT_VERIFIED: "Сначала подтвердите почту",
  INVALID_TOKEN: "Ссылка устарела или уже использована. Запросите новую.",
};

function authError(error: { code?: string }) {
  return AUTH_ERRORS[error.code ?? ""] ?? "Не получилось. Попробуйте ещё раз чуть позже.";
}

export async function signInWithEmail(_prev: string, formData: FormData) {
  const { error } = await auth.signIn.email({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return authError(error);
  redirect("/");
}

export async function signUpWithEmail(_prev: string, formData: FormData) {
  const { error } = await auth.signUp.email({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return authError(error);
  redirect("/");
}

/** Просит Neon отправить письмо; есть ли такая почта, не сообщаем — иначе можно подбирать адреса. */
export async function requestReset(
  _prev: { error: string; sent: boolean },
  formData: FormData,
) {
  const origin = (await headers()).get("origin");
  const { error } = await auth.requestPasswordReset({
    email: String(formData.get("email") ?? "").trim(),
    redirectTo: `${origin}/auth/reset-password`,
  });
  return error ? { error: authError(error), sent: false } : { error: "", sent: true };
}

export async function setNewPassword(
  _prev: { error: string; done: boolean },
  formData: FormData,
) {
  const { error } = await auth.resetPassword({
    token: String(formData.get("token") ?? ""),
    newPassword: String(formData.get("password") ?? ""),
  });
  return error ? { error: authError(error), done: false } : { error: "", done: true };
}

export async function logout() {
  await auth.signOut();
  redirect("/auth/sign-in");
}

/** Сохраняет раздел; null — его успели изменить на другом устройстве. */
export async function saveSection(key: StoreKey, value: unknown, baseVersion: number) {
  const userId = await requireUserId();
  if (!STORE_KEYS.includes(key)) throw new Error("Неизвестный раздел данных");
  return writeKey(userId, key, value, baseVersion);
}

/** Заменяет все данные (восстановление из копии). */
export async function replaceAll(data: RawStore) {
  const userId = await requireUserId();
  if (!isRawStore(data)) throw new Error("Неверный формат данных");
  return replaceStore(userId, data);
}
