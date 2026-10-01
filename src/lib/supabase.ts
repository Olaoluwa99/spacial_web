import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { publicClientConfig } from "./account-utils";

export const accountsUnavailable =
  "Accounts are coming soon. Explore every style and download bundles while we prepare your personal library.";

let client: SupabaseClient | null | undefined;
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  const config = publicClientConfig(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  client = config
    ? createClient(config.url, config.key, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
  return client;
}

export type AccountState = {
  user: User | null;
  loading: boolean;
  error: boolean;
};
let state: AccountState = { user: null, loading: false, error: false };
let revision = 0;
let observing = false;
const listeners = new Set<(state: AccountState) => void>();
function publish(next: AccountState) {
  state = next;
  listeners.forEach((listener) => listener(state));
}
/** Drop rendered private data before a sign-out request or auth transition. */
export function clearAccountState() {
  revision++;
  publish({ user: null, loading: false, error: false });
}
export async function refreshAccount(): Promise<User | null> {
  const current = ++revision;
  const connection = getSupabaseClient();
  if (!connection) {
    publish({ user: null, loading: false, error: false });
    return null;
  }
  publish({ user: null, loading: true, error: false });
  try {
    // getSession reads local storage; getUser checks identity with the auth server.
    const { data, error } = await connection.auth.getUser();
    if (current !== revision) return null;
    const user = error ? null : data.user;
    publish({
      user,
      loading: false,
      error: Boolean(error && error.name !== "AuthSessionMissingError"),
    });
    return user;
  } catch {
    if (current === revision)
      publish({ user: null, loading: false, error: true });
    return null;
  }
}
export function watchAccount(
  listener: (state: AccountState) => void,
): () => void {
  listeners.add(listener);
  listener(state);
  const connection = getSupabaseClient();
  if (connection && !observing) {
    observing = true;
    connection.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearAccountState();
      else {
        // Never call or await SDK methods while its auth notification lock is held.
        window.setTimeout(() => {
          void refreshAccount();
        }, 0);
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function callbackUrl(next: string, recovery = false): string {
  const target = new URL("/account/callback/", window.location.origin);
  target.searchParams.set("next", next);
  if (recovery) target.searchParams.set("flow", "recovery");
  return target.href;
}
