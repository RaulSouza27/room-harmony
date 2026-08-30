import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import type { ReactNode } from "react";
import * as api from "@/services/api";
import type { Role, User } from "@/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "clinica-salas-session";
const INACTIVITY_MINUTES = 15;
const INACTIVITY_TIMEOUT = INACTIVITY_MINUTES * 60 * 1000;
const WARNING_TIMEOUT = (INACTIVITY_MINUTES - 1) * 60 * 1000;

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return true;
    const payload = JSON.parse(
      window.atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (typeof payload.exp !== "number") return false;
    // Expire 5 seconds early to prevent edge cases
    return payload.exp * 1000 - 5000 < Date.now();
  } catch (e) {
    return true;
  }
}

// Global fetch interceptor for 401 errors
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("auth-unauthorized"));
      }
      return response;
    } catch (error) {
      return Promise.reject(error);
    }
  };
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, senha: string) => Promise<User>;
  signOut: (reason?: string) => void;
  refresh: () => Promise<void>;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const lastActivityRef = useRef<number>(Date.now());
  const [isWarning, setIsWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const signOut = useCallback((reason?: string) => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("clinica-salas-jwt");
    setUser(null);
    setIsWarning(false);
    if (reason) {
      setTimeout(() => {
        toast.error(reason);
      }, 100);
    }
  }, []);

  const handleKeepConnected = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarning(false);
  }, []);

function getRoleFromToken(token: string): Role | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = JSON.parse(
      window.atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (payload.access_level === "admin") return "ADMINISTRADOR";
    if (payload.access_level === "psi") return "PSICOLOGO";
    return null;
  } catch (e) {
    return null;
  }
}

// Initial session check
useEffect(() => {
  const id = window.localStorage.getItem(STORAGE_KEY);
  const token = window.localStorage.getItem("clinica-salas-jwt");

  if (token && isTokenExpired(token)) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("clinica-salas-jwt");
    setLoading(false);
    return;
  }

  if (!id) {
    setLoading(false);
    return;
  }
  api
    .getUser(id)
    .then((u) => {
      if (u && token) {
        // Valida e força a role de segurança vinda diretamente do JWT
        const roleFromToken = getRoleFromToken(token);
        if (roleFromToken) {
          u.papel = roleFromToken;
        }
      }
      setUser(u ?? null);
    })
    .finally(() => setLoading(false));
}, []);

  // API 401 Unauthorized listener
  useEffect(() => {
    const handleUnauthorized = () => {
      signOut("Sua sessão expirou. Faça login novamente.");
    };
    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth-unauthorized", handleUnauthorized);
    };
  }, [signOut]);

  // Inactivity and token expiration checking loop
  useEffect(() => {
    if (!user) {
      setIsWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (isWarning) {
        setIsWarning(false);
      }
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      // Periodic check of token expiration
      const token = window.localStorage.getItem("clinica-salas-jwt");
      if (token && isTokenExpired(token)) {
        signOut("Sua sessão expirou. Faça login novamente.");
        return;
      }

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        signOut("Sua sessão expirou por inatividade. Faça login novamente.");
      } else if (timeSinceLastActivity >= WARNING_TIMEOUT) {
        setIsWarning(true);
        const secondsRemaining = Math.max(
          0,
          Math.ceil((INACTIVITY_TIMEOUT - timeSinceLastActivity) / 1000)
        );
        setCountdown(secondsRemaining);
      } else {
        setIsWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [user, isWarning, signOut]);

  const signIn = useCallback(async (email: string, senha: string) => {
    const u = await api.login(email, senha);
    window.localStorage.setItem(STORAGE_KEY, u.id);
    setUser(u);
    lastActivityRef.current = Date.now();
    return u;
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

  return (
    <AuthContext.Provider value={value}>
      {children}
      {isWarning && (
        <Dialog open={isWarning} onOpenChange={(open) => { if (!open) handleKeepConnected(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sua sessão está expirando</DialogTitle>
              <DialogDescription>
                Por motivos de segurança, você será desconectado em{" "}
                <span className="font-semibold text-primary">{countdown} segundos</span> por inatividade.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => signOut("Sua sessão foi encerrada.")}>
                Sair
              </Button>
              <Button type="button" onClick={handleKeepConnected}>
                Continuar conectado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
