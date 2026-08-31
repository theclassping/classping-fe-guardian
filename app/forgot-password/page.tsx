"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import Brand from "@/components/Brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { detail?: string };
      if (!response.ok) setError(data.detail || "Permintaan tidak dapat diproses.");
      else setMessage(data.detail || "Tautan pemulihan telah dikirim jika akun terdaftar.");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
        <Brand />
        <p className="eyebrow">PEMULIHAN AKUN</p>
        <h1>Lupa kata sandi?</h1>
        <p>Masukkan email yang terdaftar. Kami akan mengirim petunjuk untuk membuat kata sandi baru.</p>
        <form onSubmit={submit}>
          <label htmlFor="recoveryEmail">Alamat email</label>
          <div className="login-input">
            <Mail aria-hidden="true" />
            <input id="recoveryEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          {error && <p className="form-message error" role="alert">{error}</p>}
          {message && <p className="form-message success" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Mengirim…" : "Kirim petunjuk"}</button>
        </form>
        <Link className="back-link" href="/login"><ArrowLeft /> Kembali ke halaman masuk</Link>
      </section>
    </main>
  );
}
