import AuthForm from "../AuthForm";

export const metadata = { title: "Регистрация — Трекер доходов и расходов" };

export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
