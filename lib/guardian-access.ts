import { NextRequest, NextResponse } from "next/server";

type ApiRecord = Record<string, unknown>;
const denied = (detail = "Anda hanya dapat mengubah profil wali murid Anda sendiri.") => NextResponse.json({ detail }, { status: 403 });
const invalid = () => NextResponse.json({ detail: "Data wali murid tidak valid." }, { status: 400 });

function userId(record: ApiRecord) {
  const user = record.user;
  return Number(user && typeof user === "object" ? (user as ApiRecord).id : user ?? record.user_id);
}

export async function authorizeGuardianMutation(request: NextRequest, path: string[], apiBase: string, accessToken: string): Promise<NextResponse | null> {
  if (path.some((segment) => segment === "." || segment === ".." || /[/\\]/.test(segment))) return invalid();
  if (["GET", "HEAD"].includes(request.method) || !["guardians", "students", "student-guardians", "users"].includes(path[0])) return null;
  if (["users", "student-guardians"].includes(path[0])) return denied();
  if (!["PATCH", "PUT"].includes(request.method) || path.length !== 2 || !/^\d+$/.test(path[1])) return denied();

  // Upstream reads authenticate the bearer token before its subject is used for ownership checks.
  let actorId: number;
  try {
    actorId = Number(JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8")).user_id);
  } catch { return denied(); }
  if (!actorId) return denied();

  const upstream = await fetch(`${apiBase}/api/${path.join("/")}/`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!upstream.ok) return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" } });
  const record = await upstream.json() as ApiRecord;
  let body: ApiRecord;
  try {
    const value = await request.clone().json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
    body = value;
  } catch { return invalid(); }

  if (path[0] === "guardians") {
    if (userId(record) !== actorId) return denied();
    if (Object.keys(body).some((key) => !["name", "email", "phone_number", "student_guardians"].includes(key))) return denied();
    if (body.student_guardians !== undefined) {
      const existing = Array.isArray(record.student_guardians) ? record.student_guardians : [];
      if (!Array.isArray(body.student_guardians) || body.student_guardians.some((link) => !link || typeof link !== "object" || Object.keys(link).some((key) => !["student_id", "relationship", "is_primary"].includes(key)) || !existing.some((relation) => Number(relation.student_id) === Number(link.student_id)))) return denied();
    }
    return null;
  }

  const relations = Array.isArray(record.student_guardians) ? record.student_guardians : [];
  const linkedGuardians = await Promise.all(relations.map(async (link) => {
    if (link.guardian && typeof link.guardian === "object") return link.guardian;
    if (!Number(link.guardian_id)) return null;
    const response = await fetch(`${apiBase}/api/guardians/${Number(link.guardian_id)}/`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    return response.ok ? response.json() as Promise<ApiRecord> : null;
  }));
  if (!linkedGuardians.some((guardian) => guardian && userId(guardian) === actorId)) return denied("Siswa ini tidak terhubung ke akun wali murid Anda.");
  if (Object.keys(body).some((key) => !["first_name", "middle_name", "last_name", "nickname", "date_of_birth", "gender", "address", "student_guardians"].includes(key))) return denied();
  if (body.student_guardians !== undefined) {
    // Only append a guardian through the backend's account creation/linking flow.
    // Existing links and other guardians cannot be edited through this endpoint.
    if (!Array.isArray(body.student_guardians) || body.student_guardians.length !== 1) return invalid();
    const link = body.student_guardians[0];
    if (!link || typeof link !== "object" || Object.keys(link).some((key) => !["user", "relationship", "is_primary"].includes(key))) return denied();
    const user = link.user;
    if (!user || typeof user !== "object" || Array.isArray(user) || Object.keys(user).some((key) => !["email", "first_name", "last_name", "phone_number"].includes(key))) return invalid();
    if (["email", "first_name", "last_name"].some((key) => typeof user[key] !== "string" || !user[key].trim())) return invalid();
    const email = user.email.trim().toLowerCase();
    if (linkedGuardians.some((guardian) => String(guardian?.email || "").toLowerCase() === email)) return NextResponse.json({ detail: "Wali dengan email ini sudah terhubung ke siswa." }, { status: 400 });
  }
  return null;
}
