import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const baseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) {
    return Response.json({ message: "Layanan autentikasi belum dikonfigurasi." }, { status: 503 });
  }

  const upstream = new URL(`/auth/v1/${path.map(encodeURIComponent).join("/")}`, baseUrl);
  upstream.search = request.nextUrl.search;
  const headers = new Headers({ apikey: publishableKey, accept: "application/json" });
  for (const name of ["authorization", "content-type", "x-client-info", "x-supabase-api-version"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers({ "content-type": response.headers.get("content-type") || "application/json" });
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ message: "Layanan autentikasi sedang sulit dijangkau. Coba lagi." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
