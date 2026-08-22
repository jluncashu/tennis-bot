import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getErrorMessage, loginApi, registerApi } from "../../api/auth.api";
import { useAuthStore } from "../../store/auth.store";
import { Field } from "./components/Field";
import { ClubNameIcon, EmailIcon, PasswordIcon, SubmitArrowIcon } from "./components/icons";
import type { Mode } from "./types";

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
              icon={<ClubNameIcon />}
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
            icon={<EmailIcon />}
          />

          <Field
            label={t("auth.password")}
            type="password"
            name="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<PasswordIcon />}
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

            {!loading && <SubmitArrowIcon />}
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
