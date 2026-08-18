import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CourtsPage } from "./pages/CourtsPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { useAuthStore } from "./store/auth.store";
import { useEffect, useState } from "react";
import { refreshApi } from "./api/auth.api";

export function App() {
  const { accessToken, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshApi()
      .then((result) => setAuth(result.club, result.accessToken))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  return (
    <Routes>
  <Route
    path="/auth"
    element={
      accessToken
        ? <Navigate to="/reservations" replace />
        : <LoginPage />
    }
  />

  <Route
    element={
      accessToken
        ? <DashboardLayout />
        : <Navigate to="/auth" replace />
    }
  >
    <Route path="/reservations" element={<ReservationsPage />} />
    <Route path="/customers" element={<CustomersPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/settings/courts" element={<CourtsPage />} />
  </Route>

  <Route
    path="/"
    element={<Navigate to="/reservations" replace />}
  />

  <Route
    path="*"
    element={<Navigate to="/reservations" replace />}
  />
</Routes>
  );
}
