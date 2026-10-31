import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Вход по одному паролю из переменной TRACKER_PASSWORD. В cookie хранится не сам
 * пароль, а подпись от него: смена пароля в Vercel сразу выкидывает все устройства.
 */
const COOKIE_NAME = "tracker_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // год — вход нужен один раз на устройстве

function password() {
  const value = process.env.TRACKER_PASSWORD;
  if (!value) throw new Error("Не задан TRACKER_PASSWORD — пароль трекера не настроен");
  return value;
}

function sessionToken() {
  return createHmac("sha256", password()).update("expense-tracker-session-v1").digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function checkPassword(candidate: string) {
  return safeEqual(candidate, password());
}

export async function isSignedIn() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return !!token && safeEqual(token, sessionToken());
}

export async function signIn() {
  (await cookies()).set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function signOut() {
  (await cookies()).delete(COOKIE_NAME);
}
