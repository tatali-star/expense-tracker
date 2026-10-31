"use server";

import { redirect } from "next/navigation";
import { checkPassword, isSignedIn, signIn, signOut } from "./lib/auth";
import { replaceStore, writeKey } from "./lib/db";
import { type RawStore, type StoreKey, STORE_KEYS, isRawStore } from "./lib/expenses";

// каждое действие само проверяет вход: Server Actions доступны прямым POST-запросом
async function requireSignIn() {
  if (!(await isSignedIn())) throw new Error("Нужно войти заново");
}

export async function login(_prev: string, formData: FormData) {
  const candidate = String(formData.get("password") ?? "");
  if (!checkPassword(candidate)) {
    // пауза мешает подбирать пароль перебором
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return "Неверный пароль";
  }
  await signIn();
  redirect("/");
}

export async function logout() {
  await signOut();
  redirect("/login");
}

/** Сохраняет раздел; null — его успели изменить на другом устройстве. */
export async function saveSection(key: StoreKey, value: unknown, baseVersion: number) {
  await requireSignIn();
  if (!STORE_KEYS.includes(key)) throw new Error("Неизвестный раздел данных");
  return writeKey(key, value, baseVersion);
}

/** Заменяет все данные (восстановление из копии или перенос из браузера). */
export async function replaceAll(data: RawStore) {
  await requireSignIn();
  if (!isRawStore(data)) throw new Error("Неверный формат данных");
  return replaceStore(data);
}
