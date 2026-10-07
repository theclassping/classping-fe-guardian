"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Brand from "@/components/Brand";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState(
    !uid || !token ? "Tautan ini tidak lengkap atau sudah kedaluwarsa. Minta tautan pemulihan baru." : "",
  );
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!uid || !token) {
      setError("Tautan ini tidak lengkap atau sudah kedaluwarsa. Minta tautan pemulihan baru.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi kata sandi belum sama.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      const data = (await response.json()) as { detail?: string; new_password?: string[] };
      if (!response.ok) {
        setError(data.new_password?.[0] || data.detail || "Tautan reset tidak valid atau sudah kedaluwarsa.");
      } else {
        setComplete(true);
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="simple-auth-page">
      <section className="simple-auth-card">
        <Brand />
        {complete ? (
          <>
            <p className="eyebrow">KATA SANDI DIPERBARUI</p>
            <h1>Kata sandi berhasil diubah</h1>
            <p>Silakan masuk kembali menggunakan kata sandi baru Anda.</p>
            <Link className="primary-button" href="/login">Masuk ke ClassPing</Link>
          </>
        ) : (
          <>
            <p className="eyebrow">KEAMANAN AKUN</p>
            <h1>Buat kata sandi baru</h1>
            <p>Gunakan kata sandi baru untuk melindungi akun ClassPing Anda.</p>
            <form onSubmit={submit}>
              <label htmlFor="newPassword">Kata sandi baru</label>
              <div className="login-input">
                <LockKeyhole aria-hidden="true" />
                <input id="newPassword" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </div>
              <label htmlFor="confirmPassword">Konfirmasi kata sandi</label>
              <div className="login-input">
                <LockKeyhole aria-hidden="true" />
                <input id="confirmPassword" type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
                <button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showConfirmation ? <EyeOff /> : <Eye />}</button>
              </div>
              {error && <p className="form-message error" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={loading}>{loading ? "Menyimpan…" : "Simpan kata sandi baru"}</button>
            </form>
            <Link className="back-link" href="/forgot-password"><ArrowLeft /> Minta tautan pemulihan baru</Link>
          </>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="simple-auth-page"><section className="simple-auth-card" aria-busy="true"><p role="status">Memuat formulir…</p></section></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
