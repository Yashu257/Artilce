import { api } from "./api";
import type { User } from "./types";

/** Client-side session check: the session lives in the httpOnly mkp_session cookie. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const r = await api.me();
    return r.success && r.data ? r.data : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try { await api.logout(); } catch { /* ignore */ }
  window.location.href = "/login";
}
