import { NextRequest, NextResponse } from "next/server";
import { encodeIdentity, type GuardianIdentity } from "@/lib/auth";

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

type TokenPayload = { user_id?: number | string };
type BackendUser = {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  name?: string;
  role?: string;
  guardian_students?: (BackendStudent & { student_id?: number })[];
};

type BackendGuardian = { id?: number; user_id?: number; name?: string; email?: string; student_guardians?: { student_id?: number }[] };
type BackendStudent = { id?: number; first_name?: string; middle_name?: string; last_name?: string; nickname?: string };

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
      process.env.DEMO_AUTH_ENABLED === "true" &&
      body.email.toLowerCase() === "ani.dua.anak@gmail.com" &&
      body.password === "ani2anak"
    ) {
      const identity: GuardianIdentity = { name: "Rina Ramadhani", email: "ani.dua.anak@gmail.com", role: "PARENT" };
      const response = NextResponse.json({ success: true, user: identity, demo: true });
      const secure = process.env.NODE_ENV === "production";
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
      user?: BackendUser;
      detail?: string;
    };

    if (!tokenResponse.ok || !tokens.access || !tokens.refresh) {
      return NextResponse.json(
        { detail: tokens.detail || "Email atau kata sandi tidak sesuai." },
        { status: tokenResponse.status || 401 },
      );
    }

    const userId = tokens.user?.id ?? decodeAccessToken(tokens.access).user_id;
    if (!userId) {
      return NextResponse.json(
        { detail: "Identitas pengguna tidak ditemukan pada token." },
        { status: 502 },
      );
    }

    let user = tokens.user;
    if (!user) {
      const userResponse = await fetch(`${apiBase}/api/users/${userId}/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
        cache: "no-store",
      });
      if (userResponse.ok) user = (await userResponse.json()) as BackendUser;
    }

    if (!user) {
      const guardiansResponse = await fetch(`${apiBase}/api/guardians/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
        cache: "no-store",
      });
      const guardians = guardiansResponse.ok ? ((await guardiansResponse.json()) as BackendGuardian[]) : [];
      const guardian = Array.isArray(guardians) ? guardians.find((item) => Number(item.user_id) === Number(userId)) : undefined;
      if (!guardian) {
        return NextResponse.json(
          { detail: "Profil pengguna tidak dapat dimuat." },
          { status: 502 },
        );
      }
      user = {
        id: Number(userId),
        name: guardian.name,
        email: guardian.email || body.email,
        role: "PARENT",
      };
    }

    if (user.role !== "PARENT" && user.role !== "ADMIN") {
      return NextResponse.json(
        { detail: "Akun ini tidak memiliki akses ke portal wali murid." },
        { status: 403 },
      );
    }

    let guardianId: number | undefined;
    let studentRecords: BackendStudent[];
    if (Array.isArray(user.guardian_students)) {
      // Each entry's id identifies the guardian relationship, not the student.
      studentRecords = user.guardian_students
        .filter((student) => typeof student.student_id === "number")
        .map((student) => ({ ...student, id: student.student_id }));
    } else {
      const linkedGuardiansResponse = await fetch(`${apiBase}/api/guardians/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
        cache: "no-store",
      });
      const linkedGuardians = linkedGuardiansResponse.ok ? ((await linkedGuardiansResponse.json()) as BackendGuardian[]) : [];
      const linkedGuardian = Array.isArray(linkedGuardians) ? linkedGuardians.find((item) => Number(item.user_id) === Number(userId)) : undefined;
      guardianId = linkedGuardian?.id;
      const linkedStudentIds = (linkedGuardian?.student_guardians || []).map((relation) => relation.student_id).filter((id): id is number => typeof id === "number");
      const studentsResponse = await fetch(`${apiBase}/api/students/`, { headers: { Authorization: `Bearer ${tokens.access}` }, cache: "no-store" });
      const allStudents = studentsResponse.ok ? ((await studentsResponse.json()) as BackendStudent[]) : [];
      studentRecords = Array.isArray(allStudents) ? allStudents.filter((student) => student.id && linkedStudentIds.includes(student.id)) : [];
    }
    const linkedStudents = studentRecords.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).map((student) => {
      const name = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ") || "Siswa";
      return { id: student.id as number, name, nickname: student.nickname || student.first_name, initials: name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() };
    });
    const linkedStudentId = linkedStudents[0]?.id ?? tokens.student_id;

    const identity: GuardianIdentity = {
      id: user.id ?? Number(userId),
      guardian_id: guardianId,
      student_id: linkedStudentId,
      students: linkedStudents,
      name:
        user.full_name ||
        user.name ||
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
