/**
 * Session storage helpers for JWT/user data on the frontend.
 */
import { z } from "zod";
import type { MovingsUser } from "@/types/auth";

const STORAGE_KEY = "movings_user";

const storedUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable().optional(),
  username: z.string().nullable().optional(),
  role: z.string().optional(),
  blocked: z.boolean().optional(),
  token: z.string().optional(),
  csrf_token: z.string().optional(),
});

let csrfToken: string | null = null;

export function readStoredUser(): MovingsUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = storedUserSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    clearStoredUser();
    return null;
  }
}

export function writeStoredUser(user: MovingsUser) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  csrfToken = user.csrf_token ?? null;
  notifyAuthChanged();
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
  csrfToken = null;
  notifyAuthChanged();
}

export function getAuthToken(): string | null {
  return readStoredUser()?.token ?? null;
}

export function getCsrfToken(): string | null {
  if (csrfToken) return csrfToken;

  csrfToken = readStoredUser()?.csrf_token ?? null;
  return csrfToken;
}

export function setStoredCsrfToken(token: string | null) {
  csrfToken = token || null;
}

function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("movings-auth-changed"));
}
