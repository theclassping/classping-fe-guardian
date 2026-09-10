"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  BookOpenCheck,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Home,
  Mail,
  Menu,
  ReceiptText,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import Brand from "@/components/Brand";
import LogoutButton from "@/components/LogoutButton";
import type { GuardianIdentity } from "@/lib/auth";
import { children as childProfiles, getChild, type ChildId } from "@/lib/data";

const supportingNavigation = [
  { href: "/dashboard/school", label: "Profil Sekolah", icon: Building2 },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
];

const notifications = {
  alya: [
    { title: "Aktivitas baru Alya", copy: "Bu Ratna mengunggah Melukis dengan Jari.", href: "/dashboard/activities", fresh: true },
    { title: "Bukti pembayaran diterima", copy: "Bukti SPP Agustus berhasil diunggah.", href: "/dashboard/payments", fresh: false },
  ],
  jisindo: [
    { title: "Aktivitas baru Jisindo", copy: "Bu Nia mengunggah Eksperimen Cahaya dan Bayangan.", href: "/dashboard/activities", fresh: true },
    { title: "Bukti pembayaran diperiksa", copy: "Pembayaran Agustus tercatat sebagian.", href: "/dashboard/payments", fresh: false },
  ],
};

export default function GuardianShell({ identity, children }: { identity: GuardianIdentity; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const child = getChild(searchParams.get("child"));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [category, setCategory] = useState("profile");
  const [relatedTo, setRelatedTo] = useState<ChildId | "family">(child.id);
  const [subject, setSubject] = useState("");
  const menuArea = useRef<HTMLDivElement>(null);

  function withChild(href: string, childId: ChildId = child.id) {
    return `${href}?child=${childId}`;
  }

  function suggestedSubject(nextCategory = category, nextRelated = relatedTo) {
    const relatedName = nextRelated === "family" ? "akun keluarga Rina Ramadhani" : childProfiles[nextRelated].name;
    if (nextCategory === "bug") return `Laporan kendala website — ${relatedName}`;
    if (nextCategory === "feedback") return `Masukan untuk ClassPing — ${relatedName}`;
    return `Permintaan pembaruan profil — ${relatedName}`;
  }

  function openContact() {
    setCategory("profile");
    setRelatedTo(child.id);
    setSubject(suggestedSubject("profile", child.id));
    setContactOpen(true);
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") || "").trim();
    if (!message) return;
    const related = relatedTo === "family" ? "Akun keluarga Rina Ramadhani" : `${childProfiles[relatedTo].name} · Kelas ${childProfiles[relatedTo].classCode}`;
    const categoryLabel = category === "bug" ? "Kendala pada website" : category === "feedback" ? "Masukan umum" : "Pembaruan profil";
    const body = ["Yth. Tim TK Harapan Bangsa,", "", message, "", `Jenis bantuan: ${categoryLabel}`, `Terkait dengan: ${related}`, `Pengirim: ${identity.name} (${identity.email})`, `Halaman asal: ${window.location.href}`, "", "Hormat saya,", identity.name].join("\n");
    window.location.href = `mailto:admin@tkharapanbangsa.sch.id?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (!menuArea.current?.contains(event.target as Node)) {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setContactOpen(false);
      }
    }
    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const mainNavigation = [
    { href: "/dashboard", label: "Beranda", icon: Home, exact: true },
    { href: "/dashboard/activities", label: `Aktivitas ${child.firstName}`, icon: Sparkles },
    { href: "/dashboard/assessments", label: "Penilaian", icon: BookOpenCheck },
    { href: "/dashboard/payments", label: "SPP & Tagihan", icon: ReceiptText, badge: child.badge },
  ];

  function navItems(items: typeof mainNavigation) {
    return items.map((item) => {
      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      const Icon = item.icon;
      return (
        <Link key={item.href} href={withChild(item.href)} className={`nav-link ${active ? "active" : ""}`} onClick={() => setSidebarOpen(false)}>
          <Icon aria-hidden="true" /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}
        </Link>
      );
    });
  }

  return (
    <div className="portal-shell">
      <button className={`sidebar-backdrop ${sidebarOpen ? "visible" : ""}`} aria-label="Tutup navigasi" onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand-row"><Brand /><button className="sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu"><X /></button></div>
        <nav aria-label="Navigasi wali murid">
          <p className="nav-label">MENU WALI MURID</p>{navItems(mainNavigation)}
          <p className="nav-label">LAINNYA</p>{navItems(supportingNavigation)}
        </nav>
        <div className="help-card guardian-help-card">
          <CircleHelp aria-hidden="true" /><strong>Butuh bantuan?</strong><p>Hubungi sekolah untuk akun, kendala, atau masukan.</p>
          <button type="button" onClick={openContact}><Mail /> Hubungi sekolah</button>
        </div>
        <LogoutButton />
      </aside>

      <div className="portal-page">
        <header className="topbar">
          <button className="mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Buka menu"><Menu /></button>
          <Link className="school-identity" href={withChild("/dashboard/school")}><span>TK</span><div><strong>TK Harapan Bangsa</strong><small>Tahun Ajaran 2026/2027</small></div></Link>
          <div className="topbar-actions" ref={menuArea}>
            <button className="notification-button" type="button" aria-label="Notifikasi" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}><Bell /><i /></button>
            <button className="profile-summary" type="button" aria-label={`Buka menu keluarga, anak aktif ${child.name}`} aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}><span>{child.initials}</span><div><strong>{identity.name}</strong><small>{identity.role === "ADMIN" ? "Administrator · Mode Wali" : `Orang Tua ${child.firstName}`}</small></div><ChevronDown aria-hidden="true" /></button>
            {notificationsOpen && <div className="notification-menu" role="menu"><header><div><strong>Notifikasi {child.firstName}</strong><small>1 kabar belum dibaca</small></div><button type="button">Tandai semua dibaca</button></header>{notifications[child.id].map((item) => <Link key={item.title} href={withChild(item.href)} className={item.fresh ? "fresh" : ""}><span>{item.href.includes("payments") ? "Rp" : "✦"}</span><div><strong>{item.title}</strong><small>{item.copy}</small><time>Baru saja</time></div>{item.fresh && <i />}</Link>)}</div>}
            {profileOpen && <div className="family-menu" role="menu"><header><span>RR</span><div><strong>Rina Ramadhani</strong><small>Orang tua · 2 anak</small></div></header><p>PILIH ANAK</p>{Object.values(childProfiles).map((item) => <Link key={item.id} href={withChild(pathname, item.id)} className={item.id === child.id ? "active" : ""} onClick={() => setProfileOpen(false)}><span className={item.id}>{item.initials}</span><div><strong>{item.name}</strong><small>Kelas {item.className}</small></div>{item.id === child.id && <Check />}</Link>)}<footer><Link href={withChild("/dashboard/profile")}><UserRound /> Profil Rina</Link></footer></div>}
          </div>
        </header>
        <main className="portal-main" id="main">{children}</main>
      </div>

      {contactOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setContactOpen(false); }}>
        <section className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title">
          <header><span><Mail /></span><div><h2 id="contact-title">Hubungi sekolah</h2><p>Kirim permintaan atau masukan ke TK Harapan Bangsa.</p></div><button type="button" onClick={() => setContactOpen(false)} aria-label="Tutup"><X /></button></header>
          <div className="contact-recipient"><small>KEPADA</small><div><strong>TK Harapan Bangsa</strong><span>admin@tkharapanbangsa.sch.id</span></div></div>
          <form onSubmit={submitContact}>
            <div className="contact-grid">
              <label>Jenis bantuan<select value={category} onChange={(event) => { const value = event.target.value; setCategory(value); setSubject(suggestedSubject(value, relatedTo)); }}><option value="profile">Pembaruan profil</option><option value="bug">Kendala pada website</option><option value="feedback">Masukan umum</option></select></label>
              <label>Terkait dengan<select value={relatedTo} onChange={(event) => { const value = event.target.value as ChildId | "family"; setRelatedTo(value); setSubject(suggestedSubject(category, value)); }}><option value="alya">Alya Putri Ramadhani · Kelas A1</option><option value="jisindo">Jisindo Beaugeste · Kelas B2</option><option value="family">Akun Rina / umum</option></select></label>
            </div>
            <label>Subjek<input name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={120} /></label>
            <label>Pesan<textarea name="message" rows={5} required maxLength={1500} placeholder="Jelaskan permintaan atau kendala Anda secara singkat." /></label>
            <p className="contact-note">Jangan cantumkan kata sandi atau data pembayaran. Draf akan dibuka di aplikasi email Anda sebelum dikirim.</p>
            <footer><button className="outline-button" type="button" onClick={() => setContactOpen(false)}>Batal</button><button className="primary-button" type="submit"><Mail /> Buka aplikasi email</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
