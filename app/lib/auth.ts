import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";

/** Вход через Neon Auth: аккаунты и сессии хранит Neon, в трекере только номер пользователя. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // со strict при переходе на сайт по ссылке браузер не прислал бы сессию
    sameSite: "lax",
  },
});

/** Номер вошедшего пользователя или null. Только из сессии — от браузера его не принимаем. */
export async function currentUserId() {
  const { data } = await auth.getSession();
  return data?.user?.id ?? null;
}
