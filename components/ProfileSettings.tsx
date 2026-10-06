"use client";

import { useEffect, useState } from "react";
import type { ChildProfile } from "@/lib/data";
import type { GuardianIdentity } from "@/lib/auth";

type StudentForm = { id?: number; first_name: string; middle_name: string; last_name: string; nickname: string; date_of_birth: string; gender: string; address: string };
type StudentGuardian = { id?: number | string; guardian_id?: number | string; guardian?: number | string | { id?: number | string }; student_id?: number | string; student?: number | string | { id?: number | string }; relationship: string; is_primary: boolean };
type GuardianForm = { id?: number; user_id?: number; relationship: string; is_primary: boolean; student_guardians: StudentGuardian[]; name: string; email: string; phone_number: string };
type ApiRecord = Record<string, unknown>;

function records(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) return payload as ApiRecord[];
  if (payload && typeof payload === "object" && "results" in payload && Array.isArray(payload.results)) return payload.results as ApiRecord[];
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)) return payload.data as ApiRecord[];
  return [];
}

function relationStudentId(relation: StudentGuardian) {
  const student = relation.student;
  if (student && typeof student === "object") return Number(student.id);
  return Number(relation.student_id ?? student);
}

function relationGuardianId(relation: StudentGuardian) {
  const guardian = relation.guardian;
  if (guardian && typeof guardian === "object") return Number(guardian.id);
  return Number(relation.guardian_id ?? guardian);
}

function guardianUserId(guardian: ApiRecord) {
  const user = guardian.user;
  if (user && typeof user === "object") return Number((user as ApiRecord).id);
  return Number(user ?? guardian.user_id);
}

function fallbackStudent(child: ChildProfile): StudentForm {
  const lastName = child.name.replace(`${child.firstName} `, "");
  return { first_name: child.firstName, middle_name: "", last_name: lastName, nickname: child.firstName, date_of_birth: "", gender: "", address: "" };
}

export default function ProfileSettings({ child, identity, studentId }: { child: ChildProfile; identity: GuardianIdentity; studentId?: number }) {
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
        const [guardiansResponse, relationsResponse, studentsResponse, guardianDetailResponse, studentDetailResponse] = await Promise.all([
          fetch("/api/proxy/guardians/"),
          fetch("/api/proxy/student-guardians/"),
          fetch("/api/proxy/students/"),
          identity.guardian_id ? fetch(`/api/proxy/guardians/${identity.guardian_id}/`) : Promise.resolve(null),
          studentId ? fetch(`/api/proxy/students/${studentId}/`) : Promise.resolve(null),
        ]);
        const apiGuardians = guardiansResponse.ok ? records(await guardiansResponse.json()) : [];
        const apiRelations = relationsResponse.ok ? records(await relationsResponse.json()) as StudentGuardian[] : [];
        const apiStudents = studentsResponse.ok ? records(await studentsResponse.json()) : [];
        if (guardianDetailResponse?.ok) {
          const detail = await guardianDetailResponse.json();
          if (detail && typeof detail === "object" && !apiGuardians.some((candidate) => Number(candidate.id) === identity.guardian_id)) apiGuardians.push(detail as ApiRecord);
        }
        let studentDetail: ApiRecord | null = null;
        if (studentDetailResponse?.ok) {
          const detail = await studentDetailResponse.json();
          if (detail && typeof detail === "object" && !Array.isArray(detail)) studentDetail = detail as ApiRecord;
        }
        if (!active) return;
        const childName = child.name.trim().toLowerCase();
        const item = apiStudents.find((candidate) => Number(candidate.id) === studentId)
          || studentDetail
          || apiStudents.find((candidate) => [candidate.first_name, candidate.middle_name, candidate.last_name].filter(Boolean).join(" ").trim().toLowerCase() === childName);
        if (item) {
          const itemId = Number(item.id);
          setStudent({ id: itemId, first_name: String(item.first_name || ""), middle_name: String(item.middle_name || ""), last_name: String(item.last_name || ""), nickname: String(item.nickname || ""), date_of_birth: typeof item.date_of_birth === "string" ? item.date_of_birth.slice(0, 10) : "", gender: typeof item.gender === "string" ? item.gender.toLowerCase() : "", address: String(item.address || "") });
          const matchingGuardians = apiGuardians.filter((candidate) => {
            const isCurrentGuardian = (identity.guardian_id && Number(candidate.id) === identity.guardian_id)
              || (identity.id && guardianUserId(candidate) === identity.id)
              || (identity.email && String(candidate.email || "").toLowerCase() === identity.email.toLowerCase());
            const linkedToStudent = apiRelations.some((relation) => relationStudentId(relation) === itemId && relationGuardianId(relation) === Number(candidate.id));
            return isCurrentGuardian && linkedToStudent;
          });
          const linked = matchingGuardians.map((candidate) => {
            const relations = apiRelations.filter((relation) => relationGuardianId(relation) === Number(candidate.id));
            const relation = relations.find((link) => relationStudentId(link) === itemId);
            return { id: Number(candidate.id) || undefined, user_id: guardianUserId(candidate) || undefined, relationship: relation?.relationship || "other", is_primary: Boolean(relation?.is_primary), student_guardians: relations, name: String(candidate.name || ""), email: String(candidate.email || ""), phone_number: String(candidate.phone_number || candidate.phone || "") };
          });
          if (linked.length) setGuardians(linked);
        }
      } catch { /* Keep fallback values when the API is unavailable. */ }
    }
    void load();
    return () => { active = false; };
  }, [child.firstName, child.name, identity.email, identity.guardian_id, identity.id, studentId]);

  async function saveStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingStudent(true); setStudentError(""); setStudentMessage("");
    if (!student.id) { setStudentError("Data siswa belum tersedia dari server."); setSavingStudent(false); return; }
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
