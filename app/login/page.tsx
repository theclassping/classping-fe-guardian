import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/login/LoginForm";
import LoginShowcase from "@/components/login/LoginShowcase";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="login-page">
      <LoginShowcase />
      <Suspense fallback={<section className="login-panel" aria-hidden="true" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
