import { NextRequest, NextResponse } from "next/server";

const apiBase = process.env.DJANGO_API_URL?.replace(/\/$/, "");

async function forward(request: NextRequest, path: string[]) {
  if (!apiBase) {
    return NextResponse.json(
      { detail: "Server API belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Authentication credentials were not provided." },
      { status: 401 },
    );
  }

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  try {
    const response = await fetch(
      `${apiBase}/api/${path.join("/")}/${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await request.arrayBuffer(),
        cache: "no-store",
      },
    );
    const responseHeaders = new Headers();
    const responseContentType = response.headers.get("content-type");
    if (responseContentType) responseHeaders.set("Content-Type", responseContentType);

    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { detail: "Tidak dapat menghubungi server API." },
      { status: 502 },
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}
