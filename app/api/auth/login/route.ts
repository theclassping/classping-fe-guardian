import { NextRequest, NextResponse } from "next/server";
import { encodeIdentity, type GuardianIdentity } from "@/lib/auth";

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

type TokenPayload = { user_id?: number | string };
type BackendUser = {
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
};

function decodeAccessToken(token: string): TokenPayload {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  if (!apiBase) {
    return NextResponse.json(
      { detail: "Server autentikasi belum dikonfigurasi." },
      { status: 503 },
    );
  }

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

    const tokenResponse = await fetch(`${apiBase}/api/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });
    const tokens = (await tokenResponse.json()) as {
      access?: string;
      refresh?: string;
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
      return NextResponse.json(
        { detail: "Profil pengguna tidak dapat dimuat." },
        { status: 502 },
      );
    }

    if (user.role !== "PARENT" && user.role !== "ADMIN") {
      return NextResponse.json(
        { detail: "Akun ini tidak memiliki akses ke portal wali murid." },
        { status: 403 },
      );
    }

    const identity: GuardianIdentity = {
      name:
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        "Pengguna ClassPing",
      email: user.email || body.email,
      role: user.role,
    };
    const response = NextResponse.json({ success: true, user: identity });
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
