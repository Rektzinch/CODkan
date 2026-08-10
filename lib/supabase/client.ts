import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const authFetch: typeof fetch = (input, init) => {
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const target = new URL(requestUrl);
    if (target.origin === supabaseOrigin && target.pathname.startsWith("/auth/v1/")) {
      const proxyUrl = `/api/auth-proxy${target.pathname.slice("/auth/v1".length)}${target.search}`;
      return fetch(input instanceof Request ? new Request(proxyUrl, input) : proxyUrl, init);
    }
    return fetch(input, init);
  };
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: authFetch } },
  );
}
