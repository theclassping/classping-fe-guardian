import { NextRequest, NextResponse } from "next/server";

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

export async function POST(request: NextRequest) {
  if (!apiBase) {
    return NextResponse.json(
      { detail: "Server autentikasi belum dikonfigurasi." },
      { status: 503 },
    );
  }

  try {
    const body = await request.text();
    const response = await fetch(`${apiBase}/api/auth/reset-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const data = await response.text();
    const result = new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      for (const cookie of ["access_token", "refresh_token", "guardian_identity", "current_student_id"]) {
        result.cookies.delete(cookie);
      }
    }
    return result;
  } catch {
    return NextResponse.json(
      { detail: "Tidak dapat menghubungi server autentikasi." },
      { status: 502 },
    );
  }
}
