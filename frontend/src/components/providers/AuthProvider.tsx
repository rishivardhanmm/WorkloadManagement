"use client";

import * as React from "react";
import { api } from "@/lib/api";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_email_verified: boolean;
  must_verify_email: boolean;
};

type AuthState = {
  user: User | null;
  token: string | null;
  refresh: string | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = React.createContext<AuthState & {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}>(null as never);

const TOKEN_KEY = "workload_access";
const REFRESH_KEY = "workload_refresh";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    token: null,
    refresh: null,
    loading: true,
    error: null,
  });

  const refreshToken = React.useCallback(async (): Promise<boolean> => {
    const refresh = typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
    if (!refresh) return false;
    try {
      const { access } = await api.auth.refresh(refresh);
      if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, access);
      const me = await api.auth.me(access);
      setState((s) => ({ ...s, token: access, refresh, user: me, loading: false, error: null }));
      return true;
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      }
      setState((s) => ({ ...s, token: null, refresh: null, user: null, loading: false }));
      return false;
    }
  }, []);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    const refresh = typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setState((s) => (s.loading ? { ...s, loading: false } : s));
    }, 5000);
    api.auth.me(token).then(
      (me) => {
        if (!cancelled) setState((s) => ({ ...s, user: me, token, refresh, loading: false, error: null }));
        clearTimeout(timeout);
      },
      async () => {
        clearTimeout(timeout);
        if (cancelled) return;
        const ok = await refreshToken();
        if (!ok) setState((s) => ({ ...s, user: null, token: null, refresh: null, loading: false }));
      }
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [refreshToken]);

  const login = React.useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { access, refresh } = await api.auth.login(username, password);
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
      }
      const user = await api.auth.me(access);
      setState({ user, token: access, refresh, loading: false, error: null });
    } catch (e) {
      const message =
        e instanceof Error && e.message === "Failed to fetch"
          ? "Cannot reach the server. Start the backend (see below)."
          : e instanceof Error
            ? e.message
            : "Login failed";
      setState((s) => ({ ...s, loading: false, error: message }));
      throw e;
    }
  }, []);

  const logout = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
    setState({ user: null, token: null, refresh: null, loading: false, error: null });
  }, []);

  const value = React.useMemo(
    () => ({ ...state, login, logout, refreshToken }),
    [state, login, logout, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
