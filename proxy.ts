import { auth } from "@/app/lib/auth";

// без входа открыты страницы входа, служебный /api/auth и вебхук Telegram,
// который сам проверяет секрет запроса
export default auth.middleware({
  loginUrl: "/auth/sign-in",
  publicRoutes: ["/api/telegram"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
