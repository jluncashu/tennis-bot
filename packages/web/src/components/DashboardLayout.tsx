import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";

const navItems = [
  { to: "/reservations", label: "Reservations" },
  { to: "/settings", label: "Settings" },
];

export function DashboardLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-5">
          <span className="text-lg font-semibold text-slate-900">TenisBot</span>
          <p className="text-xs text-slate-500">Admin</p>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
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
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
