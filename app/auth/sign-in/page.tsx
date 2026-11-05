import AuthForm from "../AuthForm";

export const metadata = { title: "Вход — Трекер доходов и расходов" };

export default function SignInPage() {
  return <AuthForm mode="sign-in" />;
}
