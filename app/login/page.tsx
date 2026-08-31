import type { Metadata } from "next";
import LoginForm from "@/components/login/LoginForm";
import LoginShowcase from "@/components/login/LoginShowcase";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="login-page">
      <LoginShowcase />
      <LoginForm />
    </main>
  );
}
