import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { SettingsPage } from "./pages/SettingsPage";
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
    path="/reservations"
    element={
      accessToken
        ? <ReservationsPage />
        : <Navigate to="/auth" replace />
    }
  />

  <Route
    path="/settings"
    element={
      accessToken
        ? <SettingsPage />
        : <Navigate to="/auth" replace />
    }
  />

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
