"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ className = "logout-button", onLogout }: { className?: string; onLogout?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    onLogout?.();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button className={className} type="button" onClick={logout} disabled={loading}>
      <LogOut aria-hidden="true" />
      {loading ? "Keluar…" : "Keluar"}
    </button>
  );
}
