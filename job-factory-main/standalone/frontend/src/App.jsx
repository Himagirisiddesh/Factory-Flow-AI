import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes } from "react-router-dom";
import api from "./api";
import AdminDashboard from "./components/AdminDashboard";
import LoginPanel from "./components/LoginPanel";
import Toast from "./components/Toast";
import UserDashboard from "./components/UserDashboard";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#08131f_0%,_#0f1d2d_100%)] text-white">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 animate-pulse rounded-3xl border border-cyan-300/30 bg-cyan-300/10" />
        <p className="mt-4 text-sm text-slate-300">Restoring your FactoryFlow session...</p>
      </div>
    </div>
  );
}

function defaultPathForUser(user) {
  if (!user) return "/login";
  if (user.role === "admin") return "/portal/admin";
  return "/portal/customer";
}

function ProtectedRoute({ user, allowedRole, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={defaultPathForUser(user)} replace />;
  }

  return children;
}

export default function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem("factoryflow_user");
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [checkingSession, setCheckingSession] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const { data } = await api.get("/auth/me");
        if (active) {
          setUser(data.user);
          window.localStorage.setItem("factoryflow_user", JSON.stringify(data.user));
        }
      } catch {
        if (active) {
          setUser(null);
          window.localStorage.removeItem("factoryflow_user");
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const intervalId = window.setInterval(async () => {
      if (!active) return;
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        window.localStorage.setItem("factoryflow_user", JSON.stringify(data.user));
      } catch (error) {
        if (error.response?.status === 401) {
          handleSessionExpired();
        }
      }
    }, 4 * 60 * 1000);

    const handleFocus = async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        window.localStorage.setItem("factoryflow_user", JSON.stringify(data.user));
      } catch (error) {
        if (error.response?.status === 401) {
          handleSessionExpired();
        }
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user]);

  const addToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const handleAuthenticated = (nextUser) => {
    setUser(nextUser);
    window.localStorage.setItem("factoryflow_user", JSON.stringify(nextUser));
    addToast(`Signed in as ${nextUser.role}.`, "success");
  };

  const handleSessionExpired = () => {
    setUser(null);
    window.localStorage.removeItem("factoryflow_user");
    addToast("Your session expired. Please sign in again.", "error");
  };

  const requestLogout = () => {
    setLogoutModalOpen(true);
  };

  const cancelLogout = () => {
    setLogoutModalOpen(false);
  };

  const completeLogout = async () => {
    setLogoutModalOpen(false);

    try {
      await api.post("/auth/logout");
    } catch {
      // Keep the local logout behavior even if the request fails.
    } finally {
      setUser(null);
      window.localStorage.removeItem("factoryflow_user");
      addToast("You have been signed out.", "info");
    }
  };

  if (checkingSession) {
    return <LoadingScreen />;
  }

  const defaultPath = defaultPathForUser(user);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={defaultPath} replace />
            ) : (
              <LoginPanel onAuthenticated={handleAuthenticated} onToast={addToast} />
            )
          }
        />

        <Route
          path="/portal/customer"
          element={
            <ProtectedRoute user={user} allowedRole="customer">
              <UserDashboard
                user={user}
                onLogout={requestLogout}
                onSessionExpired={handleSessionExpired}
                onToast={addToast}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/portal/admin"
          element={
            <ProtectedRoute user={user} allowedRole="admin">
              <AdminDashboard
                user={user}
                onLogout={requestLogout}
                onSessionExpired={handleSessionExpired}
                onToast={addToast}
              />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>

      {logoutModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-slate-950/20 dark:border-slate-700/60 dark:bg-slate-900 dark:text-white">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Confirm sign out</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Are you sure you want to sign out? You will need to sign in again to continue.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelLogout}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Keep me signed in
              </button>
              <button
                type="button"
                onClick={completeLogout}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-violet-500 dark:hover:bg-violet-400"
              >
                Sign out now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
