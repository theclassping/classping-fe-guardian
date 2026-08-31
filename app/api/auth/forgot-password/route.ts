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
    const response = await fetch(`${apiBase}/api/auth/forgot-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { detail: "Tidak dapat menghubungi server autentikasi." },
      { status: 502 },
    );
  }
}
