"use client";

import { useEffect, useState } from "react";
import type { ChildProfile } from "@/lib/data";
import type { GuardianIdentity } from "@/lib/auth";

type StudentForm = { id?: number; first_name: string; middle_name: string; last_name: string; nickname: string; date_of_birth: string; gender: string; address: string };
type StudentGuardian = { student_id: number; relationship: string; is_primary: boolean };
type GuardianForm = { id?: number; user_id?: number; relationship: string; is_primary: boolean; student_guardians: StudentGuardian[]; name: string; email: string; phone_number: string };

function fallbackStudent(child: ChildProfile): StudentForm {
  const lastName = child.name.replace(`${child.firstName} `, "");
  return { first_name: child.firstName, middle_name: "", last_name: lastName, nickname: child.firstName, date_of_birth: "", gender: "", address: "" };
}

export default function ProfileSettings({ child, identity }: { child: ChildProfile; identity: GuardianIdentity }) {
  const [student, setStudent] = useState<StudentForm>(() => fallbackStudent(child));
  const [guardians, setGuardians] = useState<GuardianForm[]>([{ relationship: "other", is_primary: false, student_guardians: [], name: identity.name, email: identity.email, phone_number: "" }]);
  const [newGuardian, setNewGuardian] = useState<GuardianForm | null>(null);
  const [studentMessage, setStudentMessage] = useState("");
  const [guardianMessage, setGuardianMessage] = useState("");
  const [studentError, setStudentError] = useState("");
  const [guardianError, setGuardianError] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [savingGuardian, setSavingGuardian] = useState<number | "new" | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!identity.id) return;
      try {
        const [guardiansResponse, studentsResponse] = await Promise.all([fetch("/api/proxy/guardians/"), fetch("/api/proxy/students/")]);
        const apiGuardians = guardiansResponse.ok ? await guardiansResponse.json() : [];
        const apiStudents = studentsResponse.ok ? await studentsResponse.json() : [];
        if (!active) return;
        if (Array.isArray(apiStudents)) {
          const item = apiStudents.find((candidate) => String(candidate.first_name).toLowerCase() === child.firstName.toLowerCase());
          if (item) {
            setStudent({ id: item.id, first_name: item.first_name || "", middle_name: item.middle_name || "", last_name: item.last_name || "", nickname: item.nickname || "", date_of_birth: item.date_of_birth || "", gender: item.gender || "", address: item.address || "" });
            if (Array.isArray(apiGuardians)) {
              const linked = apiGuardians.filter((candidate) => candidate.user_id === identity.id).map((candidate) => { const relations: StudentGuardian[] = Array.isArray(candidate.student_guardians) ? candidate.student_guardians : []; const relation = relations.find((link: StudentGuardian) => link.student_id === item.id); return { id: candidate.id, user_id: candidate.user_id, relationship: relation?.relationship || "other", is_primary: Boolean(relation?.is_primary), student_guardians: relations, name: candidate.name || "", email: candidate.email || "", phone_number: candidate.phone_number || "" }; });
              if (linked.length) setGuardians(linked);
            }
          }
        }
      } catch { /* Keep fallback values when the API is unavailable. */ }
    }
    void load();
    return () => { active = false; };
  }, [child.firstName, identity.id]);

  async function saveStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingStudent(true); setStudentError(""); setStudentMessage("");
    if (!student.id) { setStudentError("Profil demo belum memiliki ID backend siswa."); setSavingStudent(false); return; }
    try {
      const response = await fetch(`/api/proxy/students/${student.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_name: student.first_name, middle_name: student.middle_name || null, last_name: student.last_name, nickname: student.nickname || null, date_of_birth: student.date_of_birth, gender: student.gender, address: student.address }) });
      if (!response.ok) throw new Error("Detail siswa tidak dapat disimpan.");
      setStudentMessage("Profil siswa berhasil diperbarui.");
    } catch (error) { setStudentError(error instanceof Error ? error.message : "Detail siswa tidak dapat disimpan."); }
    finally { setSavingStudent(false); }
  }

  async function saveGuardian(guardian: GuardianForm, isNew = false) {
    setSavingGuardian(isNew ? "new" : guardian.id || null); setGuardianError(""); setGuardianMessage("");
    if (!student.id) {
      setGuardianError("Profil siswa belum terhubung ke data backend, jadi wali murid belum dapat disimpan.");
      setSavingGuardian(null);
      return;
    }
    if (!isNew && !guardian.id) {
      setGuardianError("Data wali murid belum memiliki ID backend.");
      setSavingGuardian(null);
      return;
    }
    try {
      const relations = [...guardian.student_guardians.filter((relation) => relation.student_id !== student.id), ...(student.id ? [{ student_id: student.id, relationship: guardian.relationship, is_primary: guardian.is_primary }] : [])];
      const response = await fetch(isNew ? "/api/proxy/guardians/" : `/api/proxy/guardians/${guardian.id}/`, { method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(isNew ? { user_id: identity.id } : {}), name: guardian.name, email: guardian.email, phone_number: guardian.phone_number, student_guardians: relations }) });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.detail || "Detail wali murid tidak dapat disimpan.");
      const guardianId = saved.id || guardian.id;
      if (isNew) { setGuardians((current) => [...current, { ...guardian, id: guardianId, user_id: saved.user_id }]); setNewGuardian(null); }
      else setGuardians((current) => current.map((item) => item.id === guardian.id ? { ...item, ...guardian } : item));
      setGuardianMessage(isNew ? "Wali murid baru berhasil ditambahkan." : "Profil wali murid berhasil diperbarui.");
    } catch (error) { setGuardianError(error instanceof Error ? error.message : "Detail wali murid tidak dapat disimpan."); }
    finally { setSavingGuardian(null); }
  }

  return <div className="profile-settings-form">
    <form className="settings-card panel" onSubmit={saveStudent}><header><div><p className="eyebrow">DATA ANAK</p><h2>Profil {child.firstName}</h2><p>Perbarui informasi siswa yang terhubung ke akun wali.</p></div></header>
      <div className="contact-grid"><label>Nama depan<input value={student.first_name} onChange={(event) => setStudent({ ...student, first_name: event.target.value })} required /></label><label>Nama tengah<input value={student.middle_name} onChange={(event) => setStudent({ ...student, middle_name: event.target.value })} /></label><label>Nama belakang<input value={student.last_name} onChange={(event) => setStudent({ ...student, last_name: event.target.value })} required /></label><label>Nama panggilan<input value={student.nickname} onChange={(event) => setStudent({ ...student, nickname: event.target.value })} /></label><label>Tanggal lahir<input type="date" value={student.date_of_birth} onChange={(event) => setStudent({ ...student, date_of_birth: event.target.value })} /></label><label>Jenis kelamin<select value={student.gender} onChange={(event) => setStudent({ ...student, gender: event.target.value })}><option value="">Pilih</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label></div>
      <label>Alamat<textarea value={student.address} onChange={(event) => setStudent({ ...student, address: event.target.value })} rows={3} /></label>
      {studentError && <p className="form-message error" role="alert">{studentError}</p>}{studentMessage && <p className="form-message success" role="status">{studentMessage}</p>}
      <button className="primary-button settings-save" type="submit" disabled={savingStudent}>{savingStudent ? "Menyimpan siswa…" : "Simpan profil siswa"}</button>
    </form>

    <section className="settings-card panel"><header><div><p className="eyebrow">DATA WALI</p><h2>Wali murid terhubung</h2><p>Satu siswa dapat memiliki beberapa wali murid.</p></div><button className="outline-button" type="button" onClick={() => setNewGuardian({ relationship: "other", is_primary: false, student_guardians: [], name: "", email: "", phone_number: "" })}>+ Tambah wali murid</button></header>
      <div className="guardian-form-list">{guardians.map((guardian, index) => <div className="guardian-form-card" key={guardian.id || `guardian-${index}`}><h3>Wali murid {index + 1}</h3><div className="contact-grid"><label>Nama lengkap<input value={guardian.name} onChange={(event) => setGuardians((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} required /></label><label>Email<input type="email" value={guardian.email} onChange={(event) => setGuardians((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item))} required /></label><label>Nomor WhatsApp<input value={guardian.phone_number} onChange={(event) => setGuardians((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone_number: event.target.value } : item))} /></label><label>Hubungan dengan siswa<select value={guardian.relationship} onChange={(event) => setGuardians((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: event.target.value } : item))}><option value="father">Ayah</option><option value="mother">Ibu</option><option value="grandfather">Kakek</option><option value="grandmother">Nenek</option><option value="uncle">Paman</option><option value="aunt">Bibi</option><option value="other">Lainnya</option></select></label><label className="primary-guardian-check"><input type="checkbox" checked={guardian.is_primary} onChange={(event) => setGuardians((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_primary: event.target.checked } : item))} /> Wali utama untuk siswa ini</label></div><button className="primary-button" type="button" onClick={() => void saveGuardian(guardian)} disabled={savingGuardian === guardian.id}>{savingGuardian === guardian.id ? "Menyimpan…" : "Simpan wali murid"}</button></div>)}</div>
      {newGuardian && <div className="guardian-form-card new"><h3>Wali murid baru</h3><div className="contact-grid"><label>Nama lengkap<input value={newGuardian.name} onChange={(event) => setNewGuardian({ ...newGuardian, name: event.target.value })} required /></label><label>Email<input type="email" value={newGuardian.email} onChange={(event) => setNewGuardian({ ...newGuardian, email: event.target.value })} required /></label><label>Nomor WhatsApp<input value={newGuardian.phone_number} onChange={(event) => setNewGuardian({ ...newGuardian, phone_number: event.target.value })} /></label><label>Hubungan dengan siswa<select value={newGuardian.relationship} onChange={(event) => setNewGuardian({ ...newGuardian, relationship: event.target.value })}><option value="father">Ayah</option><option value="mother">Ibu</option><option value="grandfather">Kakek</option><option value="grandmother">Nenek</option><option value="uncle">Paman</option><option value="aunt">Bibi</option><option value="other">Lainnya</option></select></label><label className="primary-guardian-check"><input type="checkbox" checked={newGuardian.is_primary} onChange={(event) => setNewGuardian({ ...newGuardian, is_primary: event.target.checked })} /> Wali utama untuk siswa ini</label></div><div className="guardian-actions"><button className="outline-button" type="button" onClick={() => setNewGuardian(null)}>Batal</button><button className="primary-button" type="button" onClick={() => void saveGuardian(newGuardian, true)} disabled={savingGuardian === "new"}>{savingGuardian === "new" ? "Menambahkan…" : "Tambah wali murid"}</button></div></div>}
      {guardianError && <p className="form-message error" role="alert">{guardianError}</p>}{guardianMessage && <p className="form-message success" role="status">{guardianMessage}</p>}
    </section>
  </div>;
}
