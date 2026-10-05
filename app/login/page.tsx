import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/login/LoginForm";
import LoginShowcase from "@/components/login/LoginShowcase";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="login-page">
      <LoginShowcase />
      <Suspense
        fallback={
          <section className="login-panel" aria-busy="true">
            <p role="status">Memuat formulir masuk…</p>
          </section>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
