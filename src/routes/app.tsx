import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_ONLY = [
  "/app/aprovacoes",
  "/app/reservas",
  "/app/profissionais",
  "/app/salas",
  "/app/unidades",
];
const PSI_ONLY = ["/app/solicitar", "/app/minhas-reservas"];

export const Route = createFileRoute("/app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/", replace: true });
      return;
    }
    const blocked = isAdmin
      ? PSI_ONLY.includes(pathname)
      : ADMIN_ONLY.some((p) => pathname.startsWith(p));
    if (blocked) navigate({ to: "/app/dashboard", replace: true });
  }, [user, loading, isAdmin, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <Outlet />;
}
