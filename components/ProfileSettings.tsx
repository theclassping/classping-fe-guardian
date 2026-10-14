"use client";

import { useEffect, useState } from "react";
import type { ChildProfile } from "@/lib/data";
import type { GuardianIdentity } from "@/lib/auth";
import { backendErrorMessage, isCurrentGuardian, linkedGuardianProfiles, newGuardianLink, type GuardianProfile, type NewGuardianProfile } from "@/lib/guardians";

type StudentForm = { id?: number; first_name: string; middle_name: string; last_name: string; nickname: string; date_of_birth: string; gender: string; address: string };

function fallbackStudent(child: ChildProfile): StudentForm {
  return { first_name: child.firstName, middle_name: "", last_name: child.name.replace(`${child.firstName} `, ""), nickname: child.firstName, date_of_birth: "", gender: "", address: "" };
}

function GuardianFields({ guardian, onChange, disabled, showName = true }: { guardian: GuardianProfile; onChange: (values: Partial<GuardianProfile>) => void; disabled: boolean; showName?: boolean }) {
  return <fieldset className="guardian-fields" disabled={disabled}>
    <div className="contact-grid">
      {showName && <label>Nama lengkap<input value={guardian.name} onChange={(event) => onChange({ name: event.target.value })} required /></label>}
      <label>Email<input type="email" value={guardian.email} onChange={(event) => onChange({ email: event.target.value })} required /></label>
      <label>Nomor WhatsApp<input value={guardian.phone_number} onChange={(event) => onChange({ phone_number: event.target.value })} /></label>
      <label>Hubungan dengan siswa<select value={guardian.relationship} onChange={(event) => onChange({ relationship: event.target.value })}>
        <option value="father">Ayah</option><option value="mother">Ibu</option><option value="grandfather">Kakek</option><option value="grandmother">Nenek</option><option value="uncle">Paman</option><option value="aunt">Bibi</option><option value="other">Lainnya</option>
      </select></label>
      <label className="primary-guardian-check"><input type="checkbox" checked={guardian.is_primary} onChange={(event) => onChange({ is_primary: event.target.checked })} /> Wali utama untuk siswa ini</label>
    </div>
  </fieldset>;
}

export default function ProfileSettings({ child, identity, studentId }: { child: ChildProfile; identity: GuardianIdentity; studentId?: number }) {
  const [student, setStudent] = useState<StudentForm>(() => fallbackStudent(child));
  const [guardians, setGuardians] = useState<GuardianProfile[]>([]);
  const [newGuardian, setNewGuardian] = useState<NewGuardianProfile | null>(null);
  const [studentMessage, setStudentMessage] = useState("");
  const [guardianMessage, setGuardianMessage] = useState("");
  const [studentError, setStudentError] = useState("");
  const [guardianError, setGuardianError] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [savingGuardian, setSavingGuardian] = useState<number | "new" | null>(null);
  const [loadingGuardians, setLoadingGuardians] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!studentId) {
        setLoadingGuardians(false);
        setGuardianError("Akun Anda belum terhubung ke data siswa.");
        return;
      }
      setLoadingGuardians(true);
      try {
        // The student detail contains every linked Guardian, including its account ID.
        const response = await fetch(`/api/proxy/students/${studentId}/`, { cache: "no-store" });
        const item = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(backendErrorMessage(item, "Data wali murid tidak dapat dimuat."));
        const links: { guardian?: unknown; guardian_id?: number | string }[] = Array.isArray(item.student_guardians) ? item.student_guardians : [];
        const guardianDetails = await Promise.all(links.filter((link) => !link.guardian && link.guardian_id).map(async (link): Promise<[string, Record<string, unknown>] | null> => {
          const detailResponse = await fetch(`/api/proxy/guardians/${link.guardian_id}/`, { cache: "no-store" });
          const detail = await detailResponse.json().catch(() => ({}));
          return detailResponse.ok ? [String(link.guardian_id), detail] : null;
        }));
        const details = Object.fromEntries(guardianDetails.filter((detail) => detail !== null));
        if (!active) return;
        setStudent({ id: Number(item.id), first_name: String(item.first_name || ""), middle_name: String(item.middle_name || ""), last_name: String(item.last_name || ""), nickname: String(item.nickname || ""), date_of_birth: typeof item.date_of_birth === "string" ? item.date_of_birth.slice(0, 10) : "", gender: typeof item.gender === "string" ? item.gender.toLowerCase() : "", address: String(item.address || "") });
        setGuardians(linkedGuardianProfiles(item, details));
      } catch (error) {
        if (active) setGuardianError(error instanceof Error ? error.message : "Data wali murid tidak dapat dimuat.");
      } finally {
        if (active) setLoadingGuardians(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [studentId, reloadKey]);

  async function saveStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingStudent(true); setStudentError(""); setStudentMessage("");
    if (!student.id) { setStudentError("Data siswa belum tersedia dari server."); setSavingStudent(false); return; }
    try {
      const response = await fetch(`/api/proxy/students/${student.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name: student.first_name, middle_name: student.middle_name || null, last_name: student.last_name, nickname: student.nickname || null, date_of_birth: student.date_of_birth, gender: student.gender, address: student.address }) });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(backendErrorMessage(saved, "Detail siswa tidak dapat disimpan."));
      setStudentMessage("Profil siswa berhasil diperbarui.");
    } catch (error) { setStudentError(error instanceof Error ? error.message : "Detail siswa tidak dapat disimpan."); }
    finally { setSavingStudent(false); }
  }

  async function saveGuardian(guardian: GuardianProfile) {
    setGuardianError(""); setGuardianMessage("");
    if (!student.id || !guardian.id) return setGuardianError("Data wali murid belum tersedia dari server.");
    if (!isCurrentGuardian(guardian, identity)) return setGuardianError("Anda hanya dapat mengubah profil wali murid Anda sendiri.");
    setSavingGuardian(guardian.id);
    try {
      const response = await fetch(`/api/proxy/guardians/${guardian.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: guardian.name.trim(), email: guardian.email.trim(), phone_number: guardian.phone_number.trim(), student_guardians: [{ student_id: student.id, relationship: guardian.relationship, is_primary: guardian.is_primary }] }) });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(backendErrorMessage(saved, "Detail wali murid tidak dapat disimpan. Silakan coba lagi."));
      setGuardianMessage("Profil wali murid Anda berhasil diperbarui.");
    } catch (error) { setGuardianError(error instanceof Error ? error.message : "Detail wali murid tidak dapat disimpan."); }
    finally { setSavingGuardian(null); }
  }

  async function addGuardian(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setGuardianError(""); setGuardianMessage("");
    if (!student.id || !newGuardian) return setGuardianError("Data siswa belum tersedia dari server.");
    setSavingGuardian("new");
    try {
      // The backend creates a separate PARENT user and Guardian, sends its welcome
      // email, and appends the student link in one transaction. Existing accounts
      // are reused without changing their profile or password.
      const response = await fetch(`/api/proxy/students/${student.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_guardians: [newGuardianLink(newGuardian)] }) });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(backendErrorMessage(saved, "Wali murid tidak dapat ditambahkan. Silakan coba lagi."));
      setGuardianMessage(`Wali murid berhasil ditambahkan. Silakan periksa email ${newGuardian.email.trim()} untuk informasi login ke portal. Jika email tersebut sudah terdaftar, wali dapat masuk menggunakan akun yang sudah ada.`);
      setNewGuardian(null);
      setReloadKey((current) => current + 1);
    } catch (error) { setGuardianError(error instanceof Error ? error.message : "Wali murid tidak dapat ditambahkan."); }
    finally { setSavingGuardian(null); }
  }

  return <div className="profile-settings-form">
    <form className="settings-card panel" onSubmit={saveStudent}>
      <header><div><p className="eyebrow">DATA ANAK</p><h2>Profil {child.firstName}</h2><p>Perbarui informasi siswa yang terhubung ke akun wali.</p></div></header>
      <div className="contact-grid">
        <label>Nama depan<input value={student.first_name} onChange={(event) => setStudent({ ...student, first_name: event.target.value })} required /></label>
        <label>Nama tengah<input value={student.middle_name} onChange={(event) => setStudent({ ...student, middle_name: event.target.value })} /></label>
        <label>Nama belakang<input value={student.last_name} onChange={(event) => setStudent({ ...student, last_name: event.target.value })} required /></label>
        <label>Nama panggilan<input value={student.nickname} onChange={(event) => setStudent({ ...student, nickname: event.target.value })} /></label>
        <label>Tanggal lahir<input type="date" value={student.date_of_birth} onChange={(event) => setStudent({ ...student, date_of_birth: event.target.value })} /></label>
        <label>Jenis kelamin<select value={student.gender} onChange={(event) => setStudent({ ...student, gender: event.target.value })}><option value="">Pilih</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label>
      </div>
      {studentError && <p className="form-message error" role="alert">{studentError}</p>}{studentMessage && <p className="form-message success" role="status">{studentMessage}</p>}
      <button className="primary-button settings-save" type="submit" disabled={savingStudent || !student.id}>{savingStudent ? "Menyimpan siswa…" : "Simpan profil siswa"}</button>
    </form>

    <section className="settings-card panel">
      <header><div><p className="eyebrow">DATA WALI</p><h2>Wali murid terhubung</h2><p>Semua wali yang terhubung ditampilkan. Anda hanya dapat mengubah profil Anda sendiri.</p></div><button className="outline-button" type="button" disabled={!student.id || loadingGuardians || savingGuardian !== null} onClick={() => { setGuardianError(""); setGuardianMessage(""); setNewGuardian({ first_name: "", last_name: "", name: "", email: "", phone_number: "", relationship: "other", is_primary: false }); }}>+ Tambah wali murid</button></header>
      {loadingGuardians && <p role="status">Memuat wali murid…</p>}
      {!loadingGuardians && !guardians.length && <p>Belum ada wali murid yang terhubung.</p>}
      <div className="guardian-form-list">{guardians.map((guardian, index) => {
        const editable = isCurrentGuardian(guardian, identity);
        return <form className={`guardian-form-card${editable ? "" : " read-only"}`} key={guardian.id || `guardian-${index}`} onSubmit={(event) => { event.preventDefault(); if (editable) void saveGuardian(guardian); }}>
          <h3>{guardian.name || `Wali murid ${index + 1}`}</h3>
          <p className="guardian-edit-note">{editable ? "Profil Anda" : "Profil ini hanya dapat diubah oleh pemilik akun."}</p>
          <GuardianFields guardian={guardian} disabled={!editable || savingGuardian !== null} onChange={(values) => setGuardians((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item))} />
          {editable && <button className="primary-button" type="submit" disabled={savingGuardian !== null}>{savingGuardian === guardian.id ? "Menyimpan…" : "Simpan wali murid"}</button>}
        </form>;
      })}</div>
      {newGuardian && <form className="guardian-form-card new" onSubmit={addGuardian}>
        <h3>Wali murid baru</h3>
        <p className="guardian-edit-note">Informasi login akan dikirim ke email wali yang didaftarkan.</p>
        <fieldset className="guardian-fields" disabled={savingGuardian === "new"}>
          <div className="contact-grid"><label>Nama depan<input value={newGuardian.first_name} onChange={(event) => setNewGuardian({ ...newGuardian, first_name: event.target.value })} required /></label><label>Nama belakang<input value={newGuardian.last_name} onChange={(event) => setNewGuardian({ ...newGuardian, last_name: event.target.value })} required /></label></div>
        </fieldset>
        <GuardianFields guardian={newGuardian} showName={false} disabled={savingGuardian === "new"} onChange={(values) => setNewGuardian({ ...newGuardian, ...values })} />
        <div className="guardian-actions"><button className="outline-button" type="button" disabled={savingGuardian === "new"} onClick={() => setNewGuardian(null)}>Batal</button><button className="primary-button" type="submit" disabled={savingGuardian === "new"}>{savingGuardian === "new" ? "Menambahkan…" : "Tambah wali murid"}</button></div>
      </form>}
      {guardianError && <p className="form-message error" role="alert">{guardianError}</p>}{guardianMessage && <p className="form-message success" role="status">{guardianMessage}</p>}
    </section>
  </div>;
}
