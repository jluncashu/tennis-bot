import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logoutApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { MiniCalendar } from "./MiniCalendar";
import type { AppLanguage } from "../i18n";

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.7-6 5.5-6s5.5 2.5 5.5 6" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M15.5 14.2c2.2 .3 4 2.3 4 5.3" />
    </svg>
  );
}

function CourtIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function ChevronsLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
    </svg>
  );
}

function ChevronsRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.logout);

  const navItems = [
    { to: "/reservations", label: t("nav.reservations"), icon: CalendarIcon },
    { to: "/customers", label: t("nav.customers"), icon: UsersIcon },
    { to: "/settings/courts", label: t("nav.courts"), icon: CourtIcon },
  ];

  function setLanguage(lng: AppLanguage) {
    i18n.changeLanguage(lng);
  }

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // localStorage unavailable (private browsing, etc.) — collapse state just won't persist.
    }
  }, [collapsed]);

  async function handleLogout() {
    try {
      await logoutApi();
    } finally {
      clearAuth();
      navigate("/auth", { replace: true });
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside
        className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div className={`flex items-center border-b border-slate-200 px-3 py-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div>
              <span className="text-lg font-semibold text-slate-900">TenisBot</span>
              <p className="text-xs text-slate-500">{t("nav.admin")}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {collapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
          </button>
        </div>

        {!collapsed && <MiniCalendar />}

        <nav className={`flex-1 space-y-1 pt-2 ${collapsed ? "px-2" : "border-t border-slate-200 px-2"}`}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                collapsed
                  ? `mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    }`
                  : `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
              }
            >
              <Icon />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className="border-t border-slate-200 px-3 py-2">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t("nav.language")}
            </span>
            <div className="mt-1.5 flex items-center rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setLanguage("ro")}
                className={`flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                  i18n.language === "ro" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                RO
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                  i18n.language === "en" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        )}

        <div className={`border-t border-slate-200 p-2 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={handleLogout}
            title={collapsed ? t("nav.logOut") : undefined}
            className={
              collapsed
                ? "flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                : "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
          >
            <LogoutIcon />
            {!collapsed && t("nav.logOut")}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
