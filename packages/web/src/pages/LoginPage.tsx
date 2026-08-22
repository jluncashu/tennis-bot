import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Field } from "../components/Field";
import { getErrorMessage, loginApi, registerApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

type Mode = "login" | "register";

export function LoginPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const isRegister = mode === "register";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = isRegister
        ? await registerApi({ name, email, password })
        : await loginApi({ email, password });

      setAuth(result.club, result.accessToken);
      navigate("/reservations", { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
    setMode(isRegister ? "login" : "register");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          {isRegister ? (
            <>{t("auth.createPart1")} <em className="text-emerald-600 not-italic">{t("auth.createPart2")}</em></>
          ) : (
            <>{t("auth.welcomePart1")} <em className="text-emerald-600 not-italic">{t("auth.welcomePart2")}</em></>
          )}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRegister ? t("auth.registerSubtitle") : t("auth.loginSubtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <Field
              label={t("auth.clubName")}
              type="text"
              name="name"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.clubNamePlaceholder")}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.7">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            />
          )}

          <Field
            label={t("auth.email")}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            }
          />

          <Field
            label={t("auth.password")}
            type="password"
            name="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? t("auth.pleaseWait")
              : isRegister
                ? t("auth.createAccount")
                : t("auth.signIn")}

            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          {isRegister ? t("auth.alreadyHaveAccount") : t("auth.noAccount")}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            {isRegister ? t("auth.signIn") : t("auth.register")}
          </button>
        </div>
      </div>
    </div>
  );
}
