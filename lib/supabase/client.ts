import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client. Created lazily so a missing environment variable
 * surfaces on first use in the browser instead of crashing the prerender.
 */
export function createClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi.",
    );
  }

  const supabaseOrigin = new URL(url).origin;
  const authFetch: typeof fetch = (input, init) => {
    const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const target = new URL(requestUrl);
    if (target.origin === supabaseOrigin && target.pathname.startsWith("/auth/v1/")) {
      const proxyUrl = `/api/auth-proxy${target.pathname.slice("/auth/v1".length)}${target.search}`;
      return fetch(input instanceof Request ? new Request(proxyUrl, input) : proxyUrl, init);
    }
    return fetch(input, init);
  };

  client = createBrowserClient(url, publishableKey, { global: { fetch: authFetch } });
  return client;
}
