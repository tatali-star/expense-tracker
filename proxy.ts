import { auth } from "@/app/lib/auth";

// без входа открыты только страницы входа, регистрации и служебный /api/auth
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
