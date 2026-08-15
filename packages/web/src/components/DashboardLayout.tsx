import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logoutApi } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { MiniCalendar } from "./MiniCalendar";

const settingsChildren = [{ to: "/settings/courts", label: "Courts" }];

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const clearAuth = useAuthStore((s) => s.logout);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const isSettingsActive = location.pathname.startsWith("/settings");

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
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-5">
          <span className="text-lg font-semibold text-slate-900">TenisBot</span>
          <p className="text-xs text-slate-500">Admin</p>
        </div>
        <MiniCalendar />
        <nav className="flex-1 space-y-1 border-t border-slate-200 px-2 pt-2">
          <NavLink
            to="/reservations"
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "text-emerald-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            Reservations
          </NavLink>

          <div>
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              aria-expanded={settingsOpen}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isSettingsActive ? "text-emerald-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Settings
              {settingsOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
            {settingsOpen && (
              <div className="ml-3 space-y-1 border-l border-slate-200 pl-3">
                {settingsChildren.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-1.5 text-sm transition-colors ${
                        isActive ? "font-medium text-emerald-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="border-t border-slate-200 p-2">
          <button
            onClick={handleLogout}
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
