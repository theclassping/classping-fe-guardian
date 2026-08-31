"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  Building2,
  ChevronDown,
  CircleHelp,
  Home,
  Menu,
  ReceiptText,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import Brand from "@/components/Brand";
import LogoutButton from "@/components/LogoutButton";
import type { GuardianIdentity } from "@/lib/auth";

const mainNavigation = [
  { href: "/dashboard", label: "Beranda", icon: Home, exact: true },
  { href: "/dashboard/activities", label: "Aktivitas Alya", icon: Sparkles },
  { href: "/dashboard/assessments", label: "Penilaian", icon: BookOpenCheck },
  { href: "/dashboard/payments", label: "SPP & Tagihan", icon: ReceiptText, badge: "1" },
];

const supportingNavigation = [
  { href: "/dashboard/school", label: "Profil Sekolah", icon: Building2 },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function GuardianShell({
  identity,
  children,
}: {
  identity: GuardianIdentity;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function navItems(items: typeof mainNavigation) {
    return items.map((item) => {
      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-link ${active ? "active" : ""}`}
          onClick={() => setOpen(false)}
        >
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
          {item.badge && <b>{item.badge}</b>}
        </Link>
      );
    });
  }

  return (
    <div className="portal-shell">
      <button
        className={`sidebar-backdrop ${open ? "visible" : ""}`}
        aria-label="Tutup navigasi"
        onClick={() => setOpen(false)}
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand-row">
          <Brand />
          <button className="sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="Tutup menu"><X /></button>
        </div>
        <nav aria-label="Navigasi wali murid">
          <p className="nav-label">MENU WALI MURID</p>
          {navItems(mainNavigation)}
          <p className="nav-label">LAINNYA</p>
          {navItems(supportingNavigation)}
        </nav>
        <div className="help-card">
          <CircleHelp aria-hidden="true" />
          <strong>Butuh bantuan?</strong>
          <p>Tim ClassPing dan sekolah siap membantu Anda.</p>
          <a href="mailto:support@classping.id">Hubungi kami</a>
        </div>
        <LogoutButton />
      </aside>

      <div className="portal-page">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu /></button>
          <Link className="school-identity" href="/dashboard/school">
            <span>TK</span>
            <div><strong>TK Harapan Bangsa</strong><small>Tahun Ajaran 2026/2027</small></div>
          </Link>
          <div className="topbar-actions">
            <button className="notification-button" type="button" aria-label="Notifikasi"><Bell /><i /></button>
            <div className="profile-summary">
              <span>{initials(identity.name)}</span>
              <div><strong>{identity.name}</strong><small>{identity.role === "ADMIN" ? "Administrator · Mode Wali" : "Orang Tua Alya"}</small></div>
              <ChevronDown aria-hidden="true" />
            </div>
          </div>
        </header>
        <main className="portal-main" id="main">{children}</main>
      </div>
    </div>
  );
}
