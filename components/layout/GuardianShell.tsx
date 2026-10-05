"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Mail,
  Menu,
  ReceiptText,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Brand from "@/components/Brand";
import LogoutButton from "@/components/LogoutButton";
import type { GuardianIdentity } from "@/lib/auth";
import type { GuardianNotification, GuardianSchool } from "@/lib/backend";
import { getChild, type ChildId, type ChildProfile } from "@/lib/data";

type NavItem = { href: string; label: string; icon: typeof Settings; badge?: string; exact?: boolean };

const supportingNavigation: NavItem[] = [
  { href: "/dashboard/school", label: "Profil Sekolah", icon: Building2 },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings },
];

export default function GuardianShell({ identity, currentStudentId, currentChild, school, notifications: initialNotifications, children }: { identity: GuardianIdentity; currentStudentId?: number; currentChild?: ChildProfile; school?: GuardianSchool | null; notifications: GuardianNotification[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const schoolName = school?.name || "sekolah";
  const schoolEmail = school?.email?.trim();
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(currentStudentId ?? identity.student_id ?? identity.students?.[0]?.id);
  const studentId = selectedStudentId ? String(selectedStudentId) : null;
  const [dynamicChild, setDynamicChild] = useState<ChildProfile | null>(null);
  const linkedStudents = identity.students || [];
  const selectedStudent = linkedStudents.find((student) => student.id === selectedStudentId);
  const fallbackChild = useMemo(() => currentChild || getChild(), [currentChild]);
  const initialChild = useMemo(() => selectedStudent
    ? { ...fallbackChild, name: selectedStudent.name, firstName: selectedStudent.name.split(" ")[0], nickname: selectedStudent.nickname, initials: selectedStudent.initials }
    : fallbackChild, [fallbackChild, selectedStudent]);
  const child = dynamicChild || initialChild;
  const contactStudents = linkedStudents.length
    ? linkedStudents.map((student) => ({ value: String(student.id), name: student.id === selectedStudentId ? child.name : student.name }))
    : studentId ? [{ value: studentId, name: child.name }] : [{ value: child.id, name: child.name }];
  const [selectingStudentId, setSelectingStudentId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [category, setCategory] = useState("profile");
  const [relatedTo, setRelatedTo] = useState<string>(studentId || child.id);
  const [subject, setSubject] = useState("");
  const menuArea = useRef<HTMLDivElement>(null);
  const notificationStorageKey = `classping:guardian:read-notifications:${studentId || "current"}`;
  const unreadNotifications = notifications.filter((item) => !readNotificationIds.includes(item.id));

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(notificationStorageKey) || "[]");
      setReadNotificationIds(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
    } catch {
      setReadNotificationIds([]);
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    let active = true;
    async function refreshNotifications() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const latest = await response.json() as GuardianNotification[];
        if (active && Array.isArray(latest)) setNotifications(latest);
      } catch { /* Keep the last notifications when the service is temporarily unavailable. */ }
    }
    void refreshNotifications();
    const interval = window.setInterval(() => void refreshNotifications(), 30_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [studentId]);

  function markNotificationRead(notificationId: string) {
    setReadNotificationIds((current) => {
      const next = [...new Set([...current, notificationId])].slice(-200);
      try { localStorage.setItem(notificationStorageKey, JSON.stringify(next)); } catch { /* The notification still disappears for this session. */ }
      return next;
    });
  }

  function markAllNotificationsRead() {
    setReadNotificationIds((current) => {
      const next = [...new Set([...current, ...notifications.map((item) => item.id)])].slice(-200);
      try { localStorage.setItem(notificationStorageKey, JSON.stringify(next)); } catch { /* The notification list still clears for this session. */ }
      return next;
    });
  }

  function formatNotificationDate(value?: string) {
    if (!value) return "Tanggal tidak tersedia";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Tanggal tidak tersedia";
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
  }

  useEffect(() => {
    if (!studentId) return;
    let active = true;
    fetch(`/api/proxy/students/${studentId}/`).then((response) => response.ok ? response.json() : null).then((student) => {
      if (!active || !student?.id) return;
      const name = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || initialChild.name;
      const currentClass = student.class_students?.find((entry: { is_current?: boolean }) => entry.is_current) || student.class_students?.[0];
      const initials = name.split(" ").filter(Boolean).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();
      setDynamicChild({ ...initialChild, name, firstName: student.first_name || initialChild.firstName, nickname: student.nickname || student.first_name || initialChild.firstName, initials, className: currentClass?.class_name || initialChild.className, classCode: currentClass?.class_name || initialChild.classCode });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [studentId, initialChild]);

  function withChild(href: string) {
    return href;
  }

  async function selectStudent(nextStudentId: number) {
    setSelectingStudentId(nextStudentId);
    try {
      const response = await fetch("/api/session/current-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: nextStudentId }),
      });
      if (!response.ok) return;
      setSelectedStudentId(nextStudentId);
      setDynamicChild(null);
      setProfileOpen(false);
      router.refresh();
    } finally {
      setSelectingStudentId(null);
    }
  }

  function suggestedSubject(nextCategory = category, nextRelated = relatedTo) {
    const relatedName = nextRelated === "family" ? `akun keluarga ${identity.name}` : contactStudents.find((student) => student.value === nextRelated)?.name || child.name;
    if (nextCategory === "bug") return `Laporan kendala website — ${relatedName}`;
    if (nextCategory === "feedback") return `Masukan untuk ClassPing — ${relatedName}`;
    return `Permintaan pembaruan profil — ${relatedName}`;
  }

  function openContact() {
    setCategory("profile");
    setRelatedTo(studentId || child.id);
    setSubject(suggestedSubject("profile", studentId || child.id));
    setContactOpen(true);
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") || "").trim();
    if (!message) return;
    const related = relatedTo === "family" ? `Akun keluarga ${identity.name}` : contactStudents.find((student) => student.value === relatedTo)?.name || child.name;
    const categoryLabel = category === "bug" ? "Kendala pada website" : category === "feedback" ? "Masukan umum" : "Pembaruan profil";
    if (!schoolEmail) return;
    const body = [`Yth. Tim ${schoolName},`, "", message, "", `Jenis bantuan: ${categoryLabel}`, `Terkait dengan: ${related}`, `Pengirim: ${identity.name} (${identity.email})`, `Halaman asal: ${window.location.href}`, "", "Hormat saya,", identity.name].join("\n");
    window.location.href = `mailto:${encodeURIComponent(schoolEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  const mainNavigation: NavItem[] = [
    { href: "/dashboard/activities", label: `Aktivitas ${child.nickname || child.firstName}`, icon: Sparkles, exact: false },
    { href: "/dashboard/payments", label: "SPP & Tagihan", icon: ReceiptText, exact: false },
  ];

  function navItems(items: NavItem[]) {
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
          <Link className="school-identity" href={withChild("/dashboard/school")}><span>{school?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SK"}</span><div><strong>{school?.name || "Sekolah belum tersedia"}</strong><small>{school?.academic_year ? `Tahun Ajaran ${school.academic_year}` : "Tahun ajaran belum tersedia"}</small></div></Link>
          <div className="topbar-actions" ref={menuArea}>
            <button className="notification-button" type="button" aria-label={`Notifikasi${unreadNotifications.length ? `, ${unreadNotifications.length} belum dibaca` : ""}`} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}><Bell />{unreadNotifications.length > 0 && <i />}</button>
            <button className="profile-summary" type="button" aria-label={`Buka menu keluarga, anak aktif ${child.name}`} aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}><span>{child.initials}</span><div><strong>{identity.name}</strong><small>{identity.role === "ADMIN" ? "Administrator · Mode Wali" : `Orang Tua ${child.firstName}`}</small></div><ChevronDown aria-hidden="true" /></button>
            {notificationsOpen && <div className="notification-menu" role="menu"><header><div><strong>Notifikasi {child.firstName}</strong><small>{unreadNotifications.length ? `${unreadNotifications.length} kabar belum dibaca` : "Semua kabar sudah dibaca"}</small></div><button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotifications.length}>Tandai semua dibaca</button></header>{unreadNotifications.length ? unreadNotifications.map((item) => <Link key={item.id} href={withChild(item.href)} className="fresh" onClick={() => markNotificationRead(item.id)}><span>{item.kind === "payment" ? "Rp" : "✦"}</span><div><strong>{item.title}</strong><small>{item.copy}</small><time>{formatNotificationDate(item.occurredAt)}</time></div><i /></Link>) : <p className="notification-empty">Belum ada pembaruan baru.</p>}</div>}
            {profileOpen && <div className={`family-menu ${linkedStudents.length ? "" : "without-students"}`} role="menu"><header><span>{identity.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><strong>{identity.name}</strong><small>Wali murid</small></div></header>{linkedStudents.length > 1 && <><p>PILIH ANAK</p>{linkedStudents.map((item) => <button key={item.id} type="button" role="menuitemradio" aria-checked={item.id === selectedStudentId} className={item.id === selectedStudentId ? "active" : ""} disabled={selectingStudentId !== null} onClick={() => void selectStudent(item.id)}><span>{item.initials}</span><div><strong>{item.name}</strong><small>{item.nickname || item.name}</small></div>{item.id === selectedStudentId && <Check />}</button>)}</>}<footer><Link href={withChild("/dashboard/profile")}><UserRound /> Profil {identity.name}</Link><LogoutButton className="family-menu-logout" onLogout={() => setProfileOpen(false)} /></footer></div>}
          </div>
        </header>
        <main className="portal-main" id="main">{children}</main>
      </div>

      {contactOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setContactOpen(false); }}>
        <section className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title">
          <header><span><Mail /></span><div><h2 id="contact-title">Hubungi sekolah</h2><p>Kirim permintaan atau masukan ke {schoolName}.</p></div><button type="button" onClick={() => setContactOpen(false)} aria-label="Tutup"><X /></button></header>
          <div className="contact-recipient"><small>KEPADA</small><div><strong>{school?.name || "Sekolah belum tersedia"}</strong><span>{schoolEmail || "Email sekolah belum tersedia"}</span></div></div>
          <form onSubmit={submitContact}>
            <div className="contact-grid">
              <label>Jenis bantuan<select value={category} onChange={(event) => { const value = event.target.value; setCategory(value); setSubject(suggestedSubject(value, relatedTo)); }}><option value="profile">Pembaruan profil</option><option value="bug">Kendala pada website</option><option value="feedback">Masukan umum</option></select></label>
              <label>Terkait dengan<select value={relatedTo} onChange={(event) => { const value = event.target.value; setRelatedTo(value); setSubject(suggestedSubject(category, value)); }}>{contactStudents.map((student) => <option key={student.value} value={student.value}>{student.name}</option>)}<option value="family">Akun {identity.name} / umum</option></select></label>
            </div>
            <label>Subjek<input name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={120} /></label>
            <label>Pesan<textarea name="message" rows={5} required maxLength={1500} placeholder="Jelaskan permintaan atau kendala Anda secara singkat." /></label>
            <p className="contact-note">Jangan cantumkan kata sandi atau data pembayaran. Draf akan dibuka di aplikasi email Anda sebelum dikirim.</p>
            <footer><button className="outline-button" type="button" onClick={() => setContactOpen(false)}>Batal</button><button className="primary-button" type="submit" disabled={!schoolEmail}><Mail /> {schoolEmail ? "Buka aplikasi email" : "Email belum tersedia"}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
