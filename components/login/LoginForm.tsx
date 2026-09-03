"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = (await response.json()) as { detail?: string };

      if (!response.ok) {
        setError(data.detail || "Email atau kata sandi tidak sesuai.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  function useParentDemo() {
    setEmail("parent@classping.id");
    setPassword("parent123");
    setError("");
  }

  return (
    <section className="login-panel">
      <div className="login-card">
        <div className="login-mobile-brand"><Brand /></div>
        <p className="eyebrow">SELAMAT DATANG KEMBALI</p>
        <h2>Masuk sebagai wali murid</h2>
        <p className="login-intro">
          Gunakan akun orang tua atau administrator yang terhubung dengan
          sekolah anak Anda.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="loginEmail">Alamat email</label>
          <div className="login-input">
            <Mail aria-hidden="true" />
            <input
              id="loginEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="nama@email.com"
              required
            />
          </div>

          <label htmlFor="loginPassword">Kata sandi</label>
          <div className="login-input">
            <LockKeyhole aria-hidden="true" />
            <input
              id="loginPassword"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Ingat saya
            </label>
            <a href="/forgot-password">Lupa kata sandi?</a>
          </div>

          <p className="login-error" role="alert" aria-live="polite">{error}</p>
          <button className="primary-button login-submit" type="submit" disabled={loading}>
            <span>{loading ? "Memeriksa akun…" : "Masuk"}</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </form>

        <div className="demo-divider"><span>Akun demo</span></div>
        <button className="demo-account" type="button" onClick={useParentDemo}>
          <span className="demo-avatar">RR</span>
          <span><strong>Rina Ramadhani</strong><small>Orang tua Alya &amp; Jisindo · parent@classping.id</small></span>
          <ArrowRight aria-hidden="true" />
        </button>
        <p className="login-help">
          Staf sekolah?{" "}
          <a href={process.env.NEXT_PUBLIC_SCHOOL_APP_URL || "http://localhost:3000"}>
            Buka ClassPing School
          </a>
        </p>
      </div>
    </section>
  );
}
