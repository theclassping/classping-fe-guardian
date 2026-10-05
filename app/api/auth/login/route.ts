import { NextRequest, NextResponse } from "next/server";
import { encodeIdentity, type GuardianIdentity } from "@/lib/auth";

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

type TokenPayload = { user_id?: number | string; student_id?: number | string };
type BackendUser = {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
};

type BackendGuardian = { id?: number | string; user?: number | string | { id?: number | string }; user_id?: number | string; name?: string; email?: string };
type BackendStudentGuardian = { guardian?: number | string; student?: number | string };
type BackendStudent = { id?: number | string; first_name?: string; middle_name?: string; last_name?: string; nickname?: string };

function records<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
}

function guardianUserId(guardian: BackendGuardian) {
  if (guardian.user && typeof guardian.user === "object") return Number(guardian.user.id);
  return Number(guardian.user ?? guardian.user_id);
}

function decodeAccessToken(token: string): TokenPayload {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };

    if (!body.email || !body.password) {
      return NextResponse.json(
        { detail: "Email dan kata sandi wajib diisi." },
        { status: 400 },
      );
    }

    if (
      (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") &&
      process.env.DEMO_AUTH_ENABLED === "true" &&
      body.email.toLowerCase() === "ani.dua.anak@gmail.com" &&
      body.password === "ani2anak"
    ) {
      const identity: GuardianIdentity = { name: "Rina Ramadhani", email: "ani.dua.anak@gmail.com", role: "PARENT" };
      const response = NextResponse.json({ success: true, user: identity, demo: true });
      const secure = false;
      const persistent = body.remember ? { maxAge: 60 * 60 * 24 * 7 } : {};
      response.cookies.set("access_token", "classping-guardian-demo", { httpOnly: true, secure, sameSite: "lax", path: "/", ...persistent });
      response.cookies.set("guardian_identity", encodeIdentity(identity), { httpOnly: true, secure, sameSite: "lax", path: "/", ...persistent });
      return response;
    }

    if (!apiBase) {
      return NextResponse.json(
        { detail: "Server autentikasi belum dikonfigurasi." },
        { status: 503 },
      );
    }

    const tokenResponse = await fetch(`${apiBase}/api/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });
    const tokens = (await tokenResponse.json()) as {
      access?: string;
      refresh?: string;
      student_id?: number;
      detail?: string;
    };

    if (!tokenResponse.ok || !tokens.access || !tokens.refresh) {
      return NextResponse.json(
        { detail: tokens.detail || "Email atau kata sandi tidak sesuai." },
        { status: tokenResponse.status || 401 },
      );
    }

    const { user_id: userId } = decodeAccessToken(tokens.access);
    if (!userId) {
      return NextResponse.json(
        { detail: "Identitas pengguna tidak ditemukan pada token." },
        { status: 502 },
      );
    }

    const userResponse = await fetch(`${apiBase}/api/users/${userId}/`, {
      headers: { Authorization: `Bearer ${tokens.access}` },
      cache: "no-store",
    });
    const user = (await userResponse.json()) as BackendUser;

    if (!userResponse.ok) {
      const guardiansResponse = await fetch(`${apiBase}/api/guardians/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
        cache: "no-store",
      });
      const guardians = guardiansResponse.ok ? records<BackendGuardian>(await guardiansResponse.json()) : [];
      const guardian = guardians.find((item) => guardianUserId(item) === Number(userId));
      if (!guardian) {
        return NextResponse.json(
          { detail: "Profil pengguna tidak dapat dimuat." },
          { status: 502 },
        );
      }
      Object.assign(user, {
        id: Number(userId),
        name: guardian.name,
        email: guardian.email || body.email,
        role: "PARENT",
      });
    }

    if (user.role !== "PARENT" && user.role !== "ADMIN") {
      return NextResponse.json(
        { detail: "Akun ini tidak memiliki akses ke portal wali murid." },
        { status: 403 },
      );
    }

    const authHeaders = { Authorization: `Bearer ${tokens.access}` };
    const [linkedGuardiansResponse, relationsResponse, studentsResponse] = await Promise.all([
      fetch(`${apiBase}/api/guardians/`, { headers: authHeaders, cache: "no-store" }),
      fetch(`${apiBase}/api/student-guardians/`, { headers: authHeaders, cache: "no-store" }),
      fetch(`${apiBase}/api/students/`, { headers: authHeaders, cache: "no-store" }),
    ]);
    const linkedGuardians = linkedGuardiansResponse.ok ? records<BackendGuardian>(await linkedGuardiansResponse.json()) : [];
    const linkedGuardian = linkedGuardians.find((item) => guardianUserId(item) === Number(userId));
    const studentGuardianRelations = relationsResponse.ok ? records<BackendStudentGuardian>(await relationsResponse.json()) : [];
    const relationStudentIds = linkedGuardian?.id
      ? studentGuardianRelations
        .filter((relation) => Number(relation.guardian) === Number(linkedGuardian.id))
        .map((relation) => Number(relation.student))
        .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const tokenStudentId = Number(tokens.student_id);
    const linkedStudentIds = [...new Set([
      ...(Number.isInteger(tokenStudentId) && tokenStudentId > 0 ? [tokenStudentId] : []),
      ...relationStudentIds,
    ])];
    const linkedStudentId = linkedStudentIds[0];
    if (!linkedStudentId) {
      return NextResponse.json(
        { detail: "Akun wali murid ini belum terhubung dengan siswa. Silakan hubungi pihak sekolah." },
        { status: 403 },
      );
    }
    const allStudents = studentsResponse.ok ? records<BackendStudent>(await studentsResponse.json()) : [];
    const linkedStudents = allStudents.filter((student) => student.id && linkedStudentIds.includes(Number(student.id))).map((student) => {
      const name = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
      return { id: Number(student.id), name, nickname: student.nickname || student.first_name, initials: name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() };
    });

    const identity: GuardianIdentity = {
      id: user.id ?? Number(userId),
      guardian_id: linkedGuardian?.id ? Number(linkedGuardian.id) : undefined,
      student_id: linkedStudentId,
      students: linkedStudents,
      name:
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        "Pengguna ClassPing",
      email: user.email || body.email,
      role: user.role,
    };
    const response = NextResponse.json({ success: true, user: identity, student_id: identity.student_id, students: identity.students });
    const secure = process.env.NODE_ENV === "production";
    const persistent = body.remember ? { maxAge: 60 * 60 * 24 * 7 } : {};

    response.cookies.set("access_token", tokens.access, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      ...persistent,
    });
    response.cookies.set("refresh_token", tokens.refresh, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      ...persistent,
    });
    response.cookies.set("guardian_identity", encodeIdentity(identity), {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      ...persistent,
    });

    return response;
  } catch {
    return NextResponse.json(
      { detail: "Tidak dapat terhubung ke server autentikasi." },
      { status: 502 },
    );
  }
}
