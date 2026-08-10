// Mock-only login gate — no real auth system yet (see
// docs/app/features/admin-dashboard.md). Checks a hardcoded admin/admin
// credential in the browser and remembers the session in sessionStorage.

const SESSION_KEY = "tenisbot_admin";

export function login(username: string, password: string): boolean {
  const ok = username === "admin" && password === "admin";
  if (ok) sessionStorage.setItem(SESSION_KEY, "1");
  return ok;
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthed(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
