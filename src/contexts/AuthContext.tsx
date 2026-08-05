import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "@/services/api";
import type { Role, User } from "@/types";

const STORAGE_KEY = "clinica-salas-session";

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, senha: string) => Promise<User>;
  signOut: () => void;
  refresh: () => Promise<void>;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      setLoading(false);
      return;
    }
    api
      .getUser(id)
      .then((u) => setUser(u ?? null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const u = await api.login(email, senha);
    window.localStorage.setItem(STORAGE_KEY, u.id);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const u = await api.getUser(user.id);
    setUser(u ?? null);
  }, [user]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.papel === "ADMINISTRADOR",
      signIn,
      signOut,
      refresh,
      hasRole: (role: Role) => user?.papel === role,
    }),
    [user, loading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
